import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '@operant-event/config';
import { AuthService } from './auth.service';
import { PasswordService } from '../common/password/password.service';
import { TokenService } from '../common/tokens/token.service';
import type { AuthMailer } from './auth-mailer.interface';
import type { PrismaService } from '../common/prisma/prisma.service';

const fakeEnv = {
  JWT_ACCESS_SECRET: 'access-secret-for-tests-only-0123456789',
  JWT_REFRESH_SECRET: 'refresh-secret-for-tests-only-0123456789',
  JWT_ACCESS_TTL_SECONDS: 900,
  JWT_REFRESH_TTL_DAYS: 30,
  BCRYPT_SALT_ROUNDS: 4,
} as Env;

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    emailVerificationToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as PrismaService;
}

function fakeMailer(): AuthMailer {
  return {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
}

function buildService(
  prisma: PrismaService,
  mailer: AuthMailer = fakeMailer(),
) {
  const passwordService = new PasswordService(fakeEnv);
  const tokenService = new TokenService(fakeEnv, new JwtService());
  return new AuthService(prisma, passwordService, tokenService, mailer);
}

describe('AuthService.register', () => {
  it('creates the user with a hashed password and issues a verification email', async () => {
    const create = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'user-1', ...data }),
      );
    const mailer = fakeMailer();
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(null), create },
    });
    const service = buildService(prisma, mailer);

    const result = await service.register({
      email: 'author@example.com',
      password: 'correct-horse-battery-staple',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(result).toEqual({ id: 'user-1', email: 'author@example.com' });
    const createdData = create.mock.calls[0][0].data;
    expect(createdData.passwordHash).not.toBe('correct-horse-battery-staple');
    expect(mailer.sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException when the email is already registered', async () => {
    const prisma = fakePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
      },
    });
    const service = buildService(prisma);

    await expect(
      service.register({
        email: 'author@example.com',
        password: 'correct-horse-battery-staple',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService.login', () => {
  async function seededUser(
    passwordService: PasswordService,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: 'user-1',
      email: 'author@example.com',
      passwordHash: await passwordService.hash('correct-horse-battery-staple'),
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: 'ACTIVE',
      ...overrides,
    };
  }

  it('issues an access token, a refresh token, and creates a session on success', async () => {
    const passwordService = new PasswordService(fakeEnv);
    const user = await seededUser(passwordService);
    const sessionCreate = jest.fn().mockResolvedValue({ id: 'session-1' });
    const userUpdate = jest.fn().mockResolvedValue(user);
    const prisma = fakePrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: userUpdate,
      },
      session: { create: sessionCreate },
    });
    const service = buildService(prisma);

    const result = await service.login({
      email: 'author@example.com',
      password: 'correct-horse-battery-staple',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toEqual({ id: 'user-1', email: 'author@example.com' });
    expect(sessionCreate).toHaveBeenCalledTimes(1);
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      }),
    );
  });

  it('throws the same UnauthorizedException for an unknown email as for a wrong password', async () => {
    const passwordService = new PasswordService(fakeEnv);
    const user = await seededUser(passwordService);

    const unknownEmailPrisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const wrongPasswordPrisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    });

    let unknownEmailError: unknown;
    try {
      await buildService(unknownEmailPrisma).login({
        email: 'nobody@example.com',
        password: 'whatever-1234',
      });
    } catch (error) {
      unknownEmailError = error;
    }

    let wrongPasswordError: unknown;
    try {
      await buildService(wrongPasswordPrisma).login({
        email: 'author@example.com',
        password: 'totally-wrong-1234',
      });
    } catch (error) {
      wrongPasswordError = error;
    }

    expect(unknownEmailError).toBeInstanceOf(UnauthorizedException);
    expect(wrongPasswordError).toBeInstanceOf(UnauthorizedException);
    expect((unknownEmailError as UnauthorizedException).message).toBe(
      (wrongPasswordError as UnauthorizedException).message,
    );
  });

  it('rejects a suspended user even with the correct password', async () => {
    const passwordService = new PasswordService(fakeEnv);
    const user = await seededUser(passwordService, { status: 'SUSPENDED' });
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    });

    await expect(
      buildService(prisma).login({
        email: 'author@example.com',
        password: 'correct-horse-battery-staple',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AuthService.refresh', () => {
  it('rotates the session: revokes the old one and issues a new token pair', async () => {
    const tokenService = new TokenService(fakeEnv, new JwtService());
    const issued = tokenService.issueRefreshToken();
    const activeSession = {
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: issued.tokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    const user = { id: 'user-1', email: 'author@example.com' };
    const sessionUpdate = jest.fn().mockResolvedValue(undefined);
    const sessionCreate = jest.fn().mockResolvedValue({ id: 'session-2' });
    const prisma = fakePrisma({
      session: {
        findFirst: jest.fn().mockResolvedValue(activeSession),
        update: sessionUpdate,
        create: sessionCreate,
      },
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    });
    const service = buildService(prisma);

    const result = await service.refresh({ refreshToken: issued.token });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(issued.token);
    expect(sessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(sessionCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a refresh token with no matching active session', async () => {
    const prisma = fakePrisma({
      session: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      buildService(prisma).refresh({ refreshToken: 'not-a-real-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.verifyEmail', () => {
  it('marks the token used and sets the user emailVerifiedAt', async () => {
    const record = {
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'irrelevant-because-findFirst-is-mocked',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    const tokenUpdate = jest.fn().mockResolvedValue(undefined);
    const userUpdate = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      emailVerificationToken: {
        findFirst: jest.fn().mockResolvedValue(record),
        update: tokenUpdate,
      },
      user: { update: userUpdate },
    });

    await buildService(prisma).verifyEmail({ token: 'raw-token' });

    expect(tokenUpdate).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('rejects a token that has already been used or does not exist', async () => {
    const prisma = fakePrisma({
      emailVerificationToken: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      buildService(prisma).verifyEmail({ token: 'raw-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.requestPasswordReset', () => {
  it('does nothing observable to the caller when the email is unknown (no enumeration)', async () => {
    const mailer = fakeMailer();
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      buildService(prisma, mailer).requestPasswordReset({
        email: 'nobody@example.com',
      }),
    ).resolves.toBeUndefined();
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('issues a reset token and emails it when the user exists', async () => {
    const mailer = fakeMailer();
    const user = {
      id: 'user-1',
      email: 'author@example.com',
      firstName: 'Ada',
    };
    const tokenCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = fakePrisma({
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      passwordResetToken: { create: tokenCreate },
    });

    await buildService(prisma, mailer).requestPasswordReset({
      email: 'author@example.com',
    });

    expect(tokenCreate).toHaveBeenCalledTimes(1);
    expect(mailer.sendPasswordReset).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.confirmPasswordReset', () => {
  it('updates the password hash, consumes the token, and revokes existing sessions', async () => {
    const record = {
      id: 'reset-1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };
    const tokenUpdate = jest.fn().mockResolvedValue(undefined);
    const userUpdate = jest.fn().mockResolvedValue(undefined);
    const sessionUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = fakePrisma({
      passwordResetToken: {
        findFirst: jest.fn().mockResolvedValue(record),
        update: tokenUpdate,
      },
      user: { update: userUpdate },
      session: { updateMany: sessionUpdateMany },
    });

    await buildService(prisma).confirmPasswordReset({
      token: 'raw-token',
      newPassword: 'brand-new-password-1234',
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    });
    expect(tokenUpdate).toHaveBeenCalledWith({
      where: { id: 'reset-1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rejects an unknown or already-used reset token', async () => {
    const prisma = fakePrisma({
      passwordResetToken: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      buildService(prisma).confirmPasswordReset({
        token: 'raw-token',
        newPassword: 'brand-new-password-1234',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.listSessions / revokeSession', () => {
  it('lists only that user sessions without exposing the token hash', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'session-1',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    ]);
    const prisma = fakePrisma({ session: { findMany } });

    const sessions = await buildService(prisma).listSessions('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    expect(sessions[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('revokes a session belonging to the caller', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = fakePrisma({ session: { updateMany } });

    await buildService(prisma).revokeSession('user-1', 'session-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('throws ForbiddenException when trying to revoke a session that is not the caller’s', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = fakePrisma({ session: { updateMany } });

    await expect(
      buildService(prisma).revokeSession('user-1', 'someone-elses-session'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
