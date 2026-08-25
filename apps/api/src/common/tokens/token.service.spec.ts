import { JwtService } from '@nestjs/jwt';
import type { Env } from '@operant-event/config';
import { TokenService } from './token.service';

const fakeEnv = {
  JWT_ACCESS_SECRET: 'access-secret-for-tests-only-0123456789',
  JWT_REFRESH_SECRET: 'refresh-secret-for-tests-only-0123456789',
  JWT_ACCESS_TTL_SECONDS: 900,
  JWT_REFRESH_TTL_DAYS: 30,
} as Env;

describe('TokenService', () => {
  const service = new TokenService(fakeEnv, new JwtService());

  describe('access tokens', () => {
    it('round-trips a payload through sign and verify', () => {
      const token = service.signAccessToken({
        sub: 'user-1',
        email: 'a@example.com',
      });
      const payload = service.verifyAccessToken(token);
      expect(payload.sub).toBe('user-1');
      expect(payload.email).toBe('a@example.com');
    });

    it('rejects a token signed with a different secret', () => {
      const otherService = new TokenService(
        {
          ...fakeEnv,
          JWT_ACCESS_SECRET: 'a-completely-different-secret-value',
        },
        new JwtService(),
      );
      const token = otherService.signAccessToken({
        sub: 'user-1',
        email: 'a@example.com',
      });
      expect(() => service.verifyAccessToken(token)).toThrow();
    });

    it('rejects an expired token', async () => {
      const shortLivedService = new TokenService(
        { ...fakeEnv, JWT_ACCESS_TTL_SECONDS: 1 },
        new JwtService(),
      );
      const token = shortLivedService.signAccessToken({
        sub: 'user-1',
        email: 'a@example.com',
      });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(() => shortLivedService.verifyAccessToken(token)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('issues a token whose hash matches hashRefreshToken(token)', () => {
      const issued = service.issueRefreshToken();
      expect(service.hashRefreshToken(issued.token)).toBe(issued.tokenHash);
    });

    it('issues a different token on every call', () => {
      const a = service.issueRefreshToken();
      const b = service.issueRefreshToken();
      expect(a.token).not.toBe(b.token);
    });

    it('sets expiresAt roughly JWT_REFRESH_TTL_DAYS in the future', () => {
      const before = Date.now();
      const issued = service.issueRefreshToken();
      const expectedMs =
        before + fakeEnv.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
      expect(issued.expiresAt.getTime()).toBeGreaterThan(expectedMs - 5000);
      expect(issued.expiresAt.getTime()).toBeLessThan(expectedMs + 5000);
    });
  });
});
