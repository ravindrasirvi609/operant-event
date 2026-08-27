import type { PrismaClient, RegistrationStatus } from '@operant-event/database';
import type { StorageProvider } from '@operant-event/storage';
import { fromCsv, toCsv } from '../csv';
import { formatSequenceNumber } from '../utils/sequence-number.util';
import { isUniqueConstraintViolation } from '../utils/prisma-errors.util';
import { validateAuthorRow, validateRegistrationRow, validateReviewerRow } from './import-rows';

export interface ImportProcessorDeps {
  prisma: PrismaClient;
  storage: StorageProvider;
}

const NON_ACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = ['CANCELLED', 'REFUNDED'];
const MAX_REGISTRATION_NUMBER_ATTEMPTS = 5;

async function processAuthorRow(prisma: PrismaClient, row: Record<string, string>): Promise<void> {
  const validated = validateAuthorRow(row);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const { email, ...rest } = validated.value;
  if (email) {
    const existing = await prisma.author.findFirst({ where: { email } });
    if (existing) {
      await prisma.author.update({ where: { id: existing.id }, data: { ...rest, email } });
      return;
    }
  }
  await prisma.author.create({ data: { ...rest, email } });
}

async function processReviewerRow(prisma: PrismaClient, organizationId: string, row: Record<string, string>): Promise<void> {
  const validated = validateReviewerRow(row);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const user = await prisma.user.findUnique({ where: { email: validated.value.email } });
  if (!user) {
    throw new Error(`No user found with email "${validated.value.email}".`);
  }
  const existing = await prisma.reviewer.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
  });
  if (existing) {
    // Idempotent: re-importing the same roster is a no-op success, not a failure.
    return;
  }
  await prisma.reviewer.create({ data: { organizationId, userId: user.id, status: 'ACTIVE' } });
}

/**
 * Requires an exact category+type name pair (see validateRegistrationRow's
 * doc comment) rather than resolving an "effective" pricing window —
 * still enforces capacity and generates a real unique registrationNumber
 * with the same retry-on-collision pattern RegistrationsService.register
 * uses, just duplicated here since a separate process can't call into
 * that NestJS service directly.
 */
async function processRegistrationRow(prisma: PrismaClient, conferenceId: string, row: Record<string, string>): Promise<void> {
  const validated = validateRegistrationRow(row);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const { email, categoryName, typeName } = validated.value;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user found with email "${email}".`);
  }

  const category = await prisma.registrationCategory.findFirst({
    where: { conferenceId, name: categoryName },
    include: { types: true },
  });
  if (!category) {
    throw new Error(`No registration category named "${categoryName}".`);
  }
  const type = category.types.find((t) => t.name === typeName);
  if (!type) {
    throw new Error(`No pricing window named "${typeName}" in category "${categoryName}".`);
  }

  if (type.capacity !== null) {
    const activeCount = await prisma.registration.count({
      where: { registrationTypeId: type.id, status: { notIn: NON_ACTIVE_REGISTRATION_STATUSES } },
    });
    if (activeCount >= type.capacity) {
      throw new Error(`Registration type "${typeName}" is at capacity.`);
    }
  }

  let sequence = (await prisma.registration.count({ where: { conferenceId } })) + 1;
  for (let attempt = 0; attempt < MAX_REGISTRATION_NUMBER_ATTEMPTS; attempt++) {
    const registrationNumber = formatSequenceNumber('REG', sequence);
    try {
      await prisma.registration.create({
        data: {
          conferenceId,
          registrationNumber,
          userId: user.id,
          registrationTypeId: type.id,
          status: 'PENDING',
          totalAmount: type.price,
          currency: type.currency,
        },
      });
      return;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        sequence += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Could not assign a unique registration number; please retry.');
}

async function processRow(
  prisma: PrismaClient,
  type: string,
  organizationId: string,
  conferenceId: string | null,
  row: Record<string, string>,
): Promise<void> {
  switch (type) {
    case 'AUTHORS':
      return processAuthorRow(prisma, row);
    case 'REVIEWERS':
      return processReviewerRow(prisma, organizationId, row);
    case 'REGISTRATIONS':
      if (!conferenceId) {
        throw new Error('This import has no conferenceId.');
      }
      return processRegistrationRow(prisma, conferenceId, row);
    default:
      throw new Error(`Unknown import type "${type}".`);
  }
}

async function uploadErrorReport(
  deps: ImportProcessorDeps,
  organizationId: string,
  importJobId: string,
  requestedBy: string,
  failedRows: Record<string, unknown>[],
): Promise<string> {
  const csv = toCsv(failedRows);
  const buffer = Buffer.from(csv, 'utf8');
  const key = `${organizationId}/imports/${importJobId}-errors.csv`;
  const uploaded = await deps.storage.upload({ key, buffer, mimeType: 'text/csv' });
  const file = await deps.prisma.file.create({
    data: {
      organizationId,
      fileName: 'import-errors.csv',
      storageKey: uploaded.storageKey,
      mimeType: 'text/csv',
      size: buffer.length,
      bucket: uploaded.bucket,
      uploadedBy: requestedBy,
    },
  });
  return file.id;
}

export async function processImportJob(importJobId: string, deps: ImportProcessorDeps): Promise<void> {
  const job = await deps.prisma.importJob.findUnique({ where: { id: importJobId } });
  if (!job) {
    console.warn(`[import.processor] ImportJob ${importJobId} not found — skipping.`);
    return;
  }

  await deps.prisma.importJob.update({ where: { id: importJobId }, data: { status: 'RUNNING' } });

  try {
    const sourceFile = await deps.prisma.file.findUnique({ where: { id: job.sourceFileId } });
    if (!sourceFile) {
      throw new Error('Source file not found.');
    }
    const buffer = await deps.storage.download(sourceFile.storageKey);
    const rows = fromCsv(buffer.toString('utf8'));

    let rowsProcessed = 0;
    const failedRows: Record<string, unknown>[] = [];

    for (const row of rows) {
      try {
        await processRow(deps.prisma, job.type, job.organizationId, job.conferenceId, row);
        rowsProcessed += 1;
      } catch (error) {
        failedRows.push({ ...row, error: error instanceof Error ? error.message : 'Unknown error.' });
      }
    }

    const errorReportFileId =
      failedRows.length > 0
        ? await uploadErrorReport(deps, job.organizationId, importJobId, job.requestedBy, failedRows)
        : null;

    await deps.prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'DONE',
        rowsProcessed,
        rowsFailed: failedRows.length,
        errorReportFileId,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    // A fatal, whole-job failure (e.g. the source file itself is unreadable) —
    // ImportJob has no dedicated error-message column, so this is
    // surfaced the same way a row failure is: a one-row error report.
    const message = error instanceof Error ? error.message : 'Unknown error.';
    const errorReportFileId = await uploadErrorReport(deps, job.organizationId, importJobId, job.requestedBy, [
      { error: message },
    ]);
    await deps.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'FAILED', errorReportFileId, completedAt: new Date() },
    });
    throw error;
  }
}
