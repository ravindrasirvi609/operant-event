import { NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { StorageProvider } from '@operant-event/storage';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = { file: { create: jest.fn(), findFirst: jest.fn() } };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as PrismaService;
}

function fakeStorage(
  overrides: Partial<Record<keyof StorageProvider, jest.Mock>> = {},
) {
  return {
    upload: jest.fn().mockResolvedValue({
      bucket: 'local',
      storageKey: 'org-1/abc-photo.png',
    }),
    getDownloadUrl: jest
      .fn()
      .mockResolvedValue('file:///tmp/uploads/org-1/abc-photo.png'),
    download: jest.fn().mockResolvedValue(Buffer.from('')),
    ...overrides,
  };
}

describe('FilesService.upload', () => {
  it('uploads via the storage provider under an organization-scoped key and records the File row', async () => {
    const fileCreate = jest.fn().mockResolvedValue({ id: 'file-1' });
    const storage = fakeStorage();
    const prisma = fakePrisma({ file: { create: fileCreate } });

    await new FilesService(prisma, storage).upload('org-1', 'user-1', {
      fileName: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake-bytes'),
    });

    const uploadCall = storage.upload.mock.calls[0][0];
    expect(uploadCall.key.startsWith('org-1/')).toBe(true);
    expect(uploadCall.key.endsWith('photo.png')).toBe(true);
    expect(fileCreate).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        fileName: 'photo.png',
        storageKey: 'org-1/abc-photo.png',
        mimeType: 'image/png',
        size: 1024,
        bucket: 'local',
        uploadedBy: 'user-1',
      },
    });
  });
});

describe('FilesService.uploadSelf', () => {
  it('uploads via the storage provider under a user-scoped key and records organizationId: null', async () => {
    const fileCreate = jest.fn().mockResolvedValue({ id: 'file-1' });
    const storage = fakeStorage({
      upload: jest.fn().mockResolvedValue({
        bucket: 'local',
        storageKey: 'users/user-1/abc-proof.png',
      }),
    });
    const prisma = fakePrisma({ file: { create: fileCreate } });

    await new FilesService(prisma, storage).uploadSelf('user-1', {
      fileName: 'proof.png',
      mimeType: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake-bytes'),
    });

    const uploadCall = storage.upload.mock.calls[0][0];
    expect(uploadCall.key.startsWith('users/user-1/')).toBe(true);
    expect(uploadCall.key.endsWith('proof.png')).toBe(true);
    expect(fileCreate).toHaveBeenCalledWith({
      data: {
        organizationId: null,
        fileName: 'proof.png',
        storageKey: 'users/user-1/abc-proof.png',
        mimeType: 'image/png',
        size: 1024,
        bucket: 'local',
        uploadedBy: 'user-1',
      },
    });
  });
});

describe('FilesService.getDownloadUrlSelf', () => {
  it('resolves the download URL for a self-serve file the caller uploaded', async () => {
    const storage = fakeStorage();
    const prisma = fakePrisma({
      file: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'file-1',
          storageKey: 'users/user-1/abc-proof.png',
        }),
      },
    });

    const url = await new FilesService(prisma, storage).getDownloadUrlSelf(
      'user-1',
      'file-1',
    );

    expect(url).toBe('file:///tmp/uploads/org-1/abc-photo.png');
  });

  it('throws NotFoundException for a file the caller did not upload themselves', async () => {
    const prisma = fakePrisma({
      file: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new FilesService(prisma, fakeStorage()).getDownloadUrlSelf(
        'user-1',
        'someone-elses-file',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('FilesService.getDownloadUrl', () => {
  it('resolves the download URL for a file that belongs to the organization', async () => {
    const storage = fakeStorage();
    const prisma = fakePrisma({
      file: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'file-1',
          storageKey: 'org-1/abc-photo.png',
        }),
      },
    });

    const url = await new FilesService(prisma, storage).getDownloadUrl(
      'org-1',
      'file-1',
    );

    expect(url).toBe('file:///tmp/uploads/org-1/abc-photo.png');
  });

  it('throws NotFoundException for a file outside the caller organization', async () => {
    const prisma = fakePrisma({
      file: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      new FilesService(prisma, fakeStorage()).getDownloadUrl(
        'org-1',
        'file-in-another-org',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
