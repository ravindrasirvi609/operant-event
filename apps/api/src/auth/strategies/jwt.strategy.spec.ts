import { UnauthorizedException } from '@nestjs/common';
import type { Env } from '@operant-event/config';
import { JwtStrategy } from './jwt.strategy';

const fakeEnv = { JWT_ACCESS_SECRET: 'a'.repeat(32) } as Env;

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(fakeEnv);

  it('returns an AuthenticatedUser from a well-formed payload', () => {
    const user = strategy.validate({ sub: 'user-1', email: 'a@example.com' });
    expect(user).toEqual({ id: 'user-1', email: 'a@example.com' });
  });

  it('rejects a payload missing sub', () => {
    expect(() =>
      strategy.validate({ sub: '', email: 'a@example.com' }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a payload missing email', () => {
    expect(() => strategy.validate({ sub: 'user-1', email: '' })).toThrow(
      UnauthorizedException,
    );
  });
});
