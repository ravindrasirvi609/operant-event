import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

describe('LocalDiskStorageProvider', () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'operant-storage-test-'));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('writes to the explicitly-given baseDir, not process.cwd()', async () => {
    const provider = new LocalDiskStorageProvider(baseDir);

    const result = await provider.upload({
      key: 'org-1/abc-photo.png',
      buffer: Buffer.from('fake-bytes'),
      mimeType: 'image/png',
    });

    expect(result).toEqual({ bucket: 'local', storageKey: 'org-1/abc-photo.png' });
    const written = await readFile(join(baseDir, 'org-1/abc-photo.png'));
    expect(written.toString()).toBe('fake-bytes');
  });

  it('resolves a download URL rooted at the same explicit baseDir', async () => {
    const provider = new LocalDiskStorageProvider(baseDir);

    const url = await provider.getDownloadUrl('org-1/abc-photo.png');

    expect(url).toBe(`file://${join(baseDir, 'org-1/abc-photo.png')}`);
  });

  it('reads back exactly what was uploaded via download()', async () => {
    const provider = new LocalDiskStorageProvider(baseDir);
    await provider.upload({ key: 'org-1/data.csv', buffer: Buffer.from('a,b\n1,2'), mimeType: 'text/csv' });

    const content = await provider.download('org-1/data.csv');

    expect(content.toString()).toBe('a,b\n1,2');
  });
});
