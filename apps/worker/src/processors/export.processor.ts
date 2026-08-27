import type { PrismaClient } from '@operant-event/database';
import type { StorageProvider } from '@operant-event/storage';
import { toCsv } from '../csv';
import { mapAbstractRow, mapAuditLogRow, mapPaymentRow, mapRegistrationRow } from './export-rows';

export interface ExportProcessorDeps {
  prisma: PrismaClient;
  storage: StorageProvider;
}

/**
 * `ExportJob.conferenceId` is nullable — AUDIT_LOG can reasonably run
 * org-wide (no conference filter) or scoped to one, depending on how the
 * job was requested; the other three types always have a conferenceId
 * since they're inherently conference-scoped data.
 */
async function fetchRowsForExport(
  prisma: PrismaClient,
  type: string,
  organizationId: string,
  conferenceId: string | null,
): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'ABSTRACTS': {
      const rows = await prisma.abstract.findMany({ where: { conferenceId: conferenceId ?? undefined } });
      return rows.map(mapAbstractRow);
    }
    case 'REGISTRATIONS': {
      const rows = await prisma.registration.findMany({ where: { conferenceId: conferenceId ?? undefined } });
      return rows.map(mapRegistrationRow);
    }
    case 'PAYMENTS': {
      const rows = await prisma.payment.findMany({
        where: { order: { conferenceId: conferenceId ?? undefined } },
      });
      return rows.map(mapPaymentRow);
    }
    case 'AUDIT_LOG': {
      const rows = await prisma.auditLog.findMany({
        where: { organizationId, ...(conferenceId ? { conferenceId } : {}) },
      });
      return rows.map(mapAuditLogRow);
    }
    default:
      throw new Error(`Unknown export type "${type}".`);
  }
}

export async function processExportJob(exportJobId: string, deps: ExportProcessorDeps): Promise<void> {
  const job = await deps.prisma.exportJob.findUnique({ where: { id: exportJobId } });
  if (!job) {
    console.warn(`[export.processor] ExportJob ${exportJobId} not found — skipping.`);
    return;
  }

  await deps.prisma.exportJob.update({ where: { id: exportJobId }, data: { status: 'RUNNING' } });

  try {
    const rows = await fetchRowsForExport(deps.prisma, job.type, job.organizationId, job.conferenceId);
    const csv = toCsv(rows);
    const buffer = Buffer.from(csv, 'utf8');
    const key = `${job.organizationId}/exports/${job.id}.csv`;
    const uploaded = await deps.storage.upload({ key, buffer, mimeType: 'text/csv' });

    const file = await deps.prisma.file.create({
      data: {
        organizationId: job.organizationId,
        fileName: `${job.type.toLowerCase()}-export.csv`,
        storageKey: uploaded.storageKey,
        mimeType: 'text/csv',
        size: buffer.length,
        bucket: uploaded.bucket,
        uploadedBy: job.requestedBy,
      },
    });

    await deps.prisma.exportJob.update({
      where: { id: exportJobId },
      data: { status: 'DONE', resultFileId: file.id, completedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.';
    await deps.prisma.exportJob.update({
      where: { id: exportJobId },
      data: { status: 'FAILED', error: message },
    });
    throw error;
  }
}
