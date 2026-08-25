import { readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { LocalDiskStorageProvider } from './local-disk-storage.provider';

describe('LocalDiskStorageProvider', () => {
  const provider = new LocalDiskStorageProvider();
  const key = `test/${randomUUID()}.txt`;

  afterEach(async () => {
    await rm('uploads', { recursive: true, force: true });
  });

  it('writes the buffer to disk and reports the storage key back', async () => {
    const result = await provider.upload({
      key,
      buffer: Buffer.from('hello operant event'),
      mimeType: 'text/plain',
    });

    expect(result).toEqual({ bucket: 'local', storageKey: key });
  });

  it('the uploaded content is readable back from the location getDownloadUrl points at', async () => {
    await provider.upload({
      key,
      buffer: Buffer.from('round trip content'),
      mimeType: 'text/plain',
    });

    const url = await provider.getDownloadUrl(key);
    const filePath = url.replace('file://', '');
    const content = await readFile(filePath, 'utf-8');

    expect(content).toBe('round trip content');
  });
});
