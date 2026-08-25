import type { Env } from '@operant-event/config';
import { PasswordService } from './password.service';

const fakeEnv = { BCRYPT_SALT_ROUNDS: 4 } as Env;

describe('PasswordService', () => {
  const service = new PasswordService(fakeEnv);

  it('produces a hash different from the plaintext', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifies the correct password against its hash', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    await expect(
      service.compare('correct-horse-battery-staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password against a hash', async () => {
    const hash = await service.hash('correct-horse-battery-staple');
    await expect(service.compare('wrong-password', hash)).resolves.toBe(false);
  });

  it('salts hashes so the same password hashes differently each time', async () => {
    const hashA = await service.hash('same-password');
    const hashB = await service.hash('same-password');
    expect(hashA).not.toBe(hashB);
  });
});
