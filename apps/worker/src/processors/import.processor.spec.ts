import { processImportJob } from './import.processor';
import { toCsv } from '../csv';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    importJob: { findUnique: jest.fn(), update: jest.fn() },
    file: { findUnique: jest.fn(), create: jest.fn() },
    author: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    reviewer: { findUnique: jest.fn(), create: jest.fn() },
    registrationCategory: { findFirst: jest.fn() },
    registration: { count: jest.fn(), create: jest.fn() },
  };
  const baseRecord = base as unknown as Record<string, Record<string, jest.Mock>>;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as import('@operant-event/database').PrismaClient;
}

function fakeStorage(overrides: Partial<Record<'upload' | 'download' | 'getDownloadUrl', jest.Mock>> = {}) {
  return {
    upload: jest.fn().mockResolvedValue({ bucket: 'local', storageKey: 'org-1/imports/job-1-errors.csv' }),
    download: jest.fn(),
    getDownloadUrl: jest.fn(),
    ...overrides,
  };
}

const queuedJob = {
  id: 'job-1',
  organizationId: 'org-1',
  conferenceId: null,
  requestedBy: 'user-1',
  type: 'AUTHORS',
  status: 'QUEUED',
  sourceFileId: 'file-1',
};

describe('processImportJob', () => {
  it('does nothing when the job no longer exists', async () => {
    const prisma = fakePrisma({ importJob: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() } });

    await processImportJob('job-1', { prisma, storage: fakeStorage() as never });

    expect(prisma.importJob.update).not.toHaveBeenCalled();
  });

  it('processes every valid AUTHORS row, counts a failed row, and uploads an error report', async () => {
    const csv = toCsv([
      { firstName: 'Jane', lastName: 'Doe' },
      { firstName: '', lastName: 'NoFirstName' },
    ]);
    const update = jest.fn();
    const authorCreate = jest.fn().mockResolvedValue({ id: 'author-1' });
    const fileCreate = jest.fn().mockResolvedValue({ id: 'error-file-1' });
    const prisma = fakePrisma({
      importJob: { findUnique: jest.fn().mockResolvedValue(queuedJob), update },
      file: {
        findUnique: jest.fn().mockResolvedValue({ id: 'file-1', storageKey: 'org-1/imports/source.csv' }),
        create: fileCreate,
      },
      author: { findFirst: jest.fn().mockResolvedValue(null), create: authorCreate, update: jest.fn() },
    });
    const download = jest.fn().mockResolvedValue(Buffer.from(csv, 'utf8'));

    await processImportJob('job-1', { prisma, storage: fakeStorage({ download }) as never });

    expect(update).toHaveBeenCalledWith({ where: { id: 'job-1' }, data: { status: 'RUNNING' } });
    expect(authorCreate).toHaveBeenCalledTimes(1);
    expect(fileCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'org-1', fileName: 'import-errors.csv' }),
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'DONE', rowsProcessed: 1, rowsFailed: 1, errorReportFileId: 'error-file-1', completedAt: expect.any(Date) },
    });
  });

  it('flips to FAILED with an error report when the source file itself cannot be read, and re-throws', async () => {
    const update = jest.fn();
    const fileCreate = jest.fn().mockResolvedValue({ id: 'error-file-2' });
    const prisma = fakePrisma({
      importJob: { findUnique: jest.fn().mockResolvedValue(queuedJob), update },
      file: { findUnique: jest.fn().mockResolvedValue(null), create: fileCreate },
    });

    await expect(processImportJob('job-1', { prisma, storage: fakeStorage() as never })).rejects.toThrow(
      'Source file not found.',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'FAILED', errorReportFileId: 'error-file-2', completedAt: expect.any(Date) },
    });
  });
});
