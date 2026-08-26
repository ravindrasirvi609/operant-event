import { loadEnv } from './env';

const validBase = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('loadEnv', () => {
  it('parses a complete, valid environment', () => {
    const env = loadEnv(validBase);
    expect(env.DATABASE_URL).toBe(validBase.DATABASE_URL);
    expect(env.REDIS_URL).toBe(validBase.REDIS_URL);
  });

  it('defaults PORT to 3000 when not set', () => {
    const env = loadEnv(validBase);
    expect(env.PORT).toBe(3000);
  });

  it('coerces PORT from a numeric string', () => {
    const env = loadEnv({ ...validBase, PORT: '4000' });
    expect(env.PORT).toBe(4000);
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...rest } = validBase;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_ACCESS_SECRET is missing', () => {
    const { JWT_ACCESS_SECRET, ...rest } = validBase;
    expect(() => loadEnv(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => loadEnv({ ...validBase, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('defaults JWT_ACCESS_TTL_SECONDS to 900 (15 minutes)', () => {
    const env = loadEnv(validBase);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('defaults JWT_REFRESH_TTL_DAYS to 30', () => {
    const env = loadEnv(validBase);
    expect(env.JWT_REFRESH_TTL_DAYS).toBe(30);
  });

  it('defaults BCRYPT_SALT_ROUNDS to 12', () => {
    const env = loadEnv(validBase);
    expect(env.BCRYPT_SALT_ROUNDS).toBe(12);
  });

  it('leaves payment gateway credentials undefined when not set — MANUAL-only deployments need none of them', () => {
    const env = loadEnv(validBase);
    expect(env.RAZORPAY_KEY_ID).toBeUndefined();
    expect(env.RAZORPAY_KEY_SECRET).toBeUndefined();
    expect(env.RAZORPAY_WEBHOOK_SECRET).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it('accepts payment gateway credentials when provided', () => {
    const env = loadEnv({ ...validBase, RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_KEY_SECRET: 'secret' });
    expect(env.RAZORPAY_KEY_ID).toBe('rzp_test_123');
    expect(env.RAZORPAY_KEY_SECRET).toBe('secret');
  });
});
