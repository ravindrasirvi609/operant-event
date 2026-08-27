import { processExportJob } from './export.processor';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    exportJob: { findUnique: jest.fn(), update: jest.fn() },
    abstract: { findMany: jest.fn().mockResolvedValue([]) },
    registration: { findMany: jest.fn().mockResolvedValue([]) },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    file: { create: jest.fn() },
  };
  const baseRecord = base as unknown as Record<string, Record<string, jest.Mock>>;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as import('@operant-event/database').PrismaClient;
}

function fakeStorage(upload = jest.fn().mockResolvedValue({ bucket: 'local', storageKey: 'org-1/exports/job-1.csv' })) {
  return { upload, getDownloadUrl: jest.fn() };
}

const queuedJob = {
  id: 'job-1',
  organizationId: 'org-1',
  conferenceId: 'conf-1',
  requestedBy: 'user-1',
  type: 'ABSTRACTS',
  status: 'QUEUED',
};

describe('processExportJob', () => {
  it('does nothing when the job no longer exists', async () => {
    const prisma = fakePrisma({ exportJob: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });

    await processExportJob('job-1', { prisma, storage: fakeStorage() as never });

    expect(prisma.exportJob.update).not.toHaveBeenCalled();
  });

  it('flips to RUNNING, queries the right table for the type, uploads the CSV, and flips to DONE with resultFileId', async () => {
    const update = jest.fn();
    const fileCreate = jest.fn().mockResolvedValue({ id: 'file-1' });
    const abstractFindMany = jest.fn().mockResolvedValue([
      { id: 'abs-1', submissionNumber: 'ABS-000001', title: 'A Study', submissionType: 'ORAL', status: 'ACCEPTED', trackId: null, submittedBy: 'user-2' },
    ]);
    const upload = jest.fn().mockResolvedValue({ bucket: 'local', storageKey: 'org-1/exports/job-1.csv' });
    const prisma = fakePrisma({
      exportJob: { findUnique: jest.fn().mockResolvedValue(queuedJob), update },
      abstract: { findMany: abstractFindMany },
      file: { create: fileCreate },
    });

    await processExportJob('job-1', { prisma, storage: fakeStorage(upload) as never });

    expect(update).toHaveBeenCalledWith({ where: { id: 'job-1' }, data: { status: 'RUNNING' } });
    expect(abstractFindMany).toHaveBeenCalledWith({ where: { conferenceId: 'conf-1' } });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'org-1/exports/job-1.csv', mimeType: 'text/csv' }),
    );
    expect(fileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        storageKey: 'org-1/exports/job-1.csv',
        uploadedBy: 'user-1',
      }),
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'DONE', resultFileId: 'file-1', completedAt: expect.any(Date) },
    });
  });

  it('flips to FAILED with the error message when anything throws, and re-throws for BullMQ to see', async () => {
    const update = jest.fn();
    const prisma = fakePrisma({
      exportJob: { findUnique: jest.fn().mockResolvedValue(queuedJob), update },
      abstract: { findMany: jest.fn().mockRejectedValue(new Error('DB unavailable')) },
    });

    await expect(processExportJob('job-1', { prisma, storage: fakeStorage() as never })).rejects.toThrow(
      'DB unavailable',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'FAILED', error: 'DB unavailable' },
    });
  });
});
