import { loadEnv } from './env';

const validBase = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

// A realistic production environment — distinct, non-placeholder secrets.
const prodBase = {
  ...validBase,
  NODE_ENV: 'production' as const,
  JWT_ACCESS_SECRET: 'prod-access-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-yyyyyyyyyyyyyyyyyyyyyyyyyyyy',
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

  it('defaults UPLOADS_DIR to ./uploads', () => {
    const env = loadEnv(validBase);
    expect(env.UPLOADS_DIR).toBe('./uploads');
  });

  it('accepts an explicit absolute UPLOADS_DIR', () => {
    const env = loadEnv({ ...validBase, UPLOADS_DIR: '/var/data/operant-uploads' });
    expect(env.UPLOADS_DIR).toBe('/var/data/operant-uploads');
  });

  it('leaves RESEND_API_KEY and EMAIL_FROM_ADDRESS undefined when not set', () => {
    const env = loadEnv(validBase);
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.EMAIL_FROM_ADDRESS).toBeUndefined();
  });

  it('accepts RESEND_API_KEY and EMAIL_FROM_ADDRESS when provided', () => {
    const env = loadEnv({
      ...validBase,
      RESEND_API_KEY: 're_test_123',
      EMAIL_FROM_ADDRESS: 'noreply@example.com',
    });
    expect(env.RESEND_API_KEY).toBe('re_test_123');
    expect(env.EMAIL_FROM_ADDRESS).toBe('noreply@example.com');
  });

  it('defaults FRONTEND_URL to http://localhost:3000', () => {
    const env = loadEnv(validBase);
    expect(env.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('accepts an explicit FRONTEND_URL', () => {
    const env = loadEnv({
      ...validBase,
      FRONTEND_URL: 'https://app.example.com',
    });
    expect(env.FRONTEND_URL).toBe('https://app.example.com');
  });
});

describe('NODE_ENV', () => {
  it('defaults to "development" when not set', () => {
    const env = loadEnv(validBase);
    expect(env.NODE_ENV).toBe('development');
  });

  it('accepts "production"', () => {
    const env = loadEnv(prodBase);
    expect(env.NODE_ENV).toBe('production');
  });

  it('accepts "test"', () => {
    const env = loadEnv({ ...validBase, NODE_ENV: 'test' });
    expect(env.NODE_ENV).toBe('test');
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => loadEnv({ ...validBase, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });
});

describe('production JWT secret validation', () => {
  it('accepts distinct non-placeholder secrets in production', () => {
    expect(() => loadEnv(prodBase)).not.toThrow();
  });

  it('rejects the .env.example JWT_ACCESS_SECRET placeholder in production', () => {
    expect(() =>
      loadEnv({
        ...prodBase,
        JWT_ACCESS_SECRET: 'dev-access-secret-change-me-0123456789abcdef',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects the .env.example JWT_REFRESH_SECRET placeholder in production', () => {
    expect(() =>
      loadEnv({
        ...prodBase,
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me-0123456789abcdef',
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('rejects any secret containing "change-me" in production', () => {
    expect(() =>
      loadEnv({ ...prodBase, JWT_ACCESS_SECRET: 'some-change-me-value-x'.repeat(2) }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects any secret starting with "dev-" in production', () => {
    expect(() =>
      loadEnv({ ...prodBase, JWT_ACCESS_SECRET: 'dev-something-long-enough-here-xx' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects identical ACCESS and REFRESH secrets in production', () => {
    const sameSecret = 'prod-identical-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxx';
    expect(() =>
      loadEnv({
        ...prodBase,
        JWT_ACCESS_SECRET: sameSecret,
        JWT_REFRESH_SECRET: sameSecret,
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('does NOT enforce placeholder rules in development', () => {
    // dev placeholder values are fine in dev/test — they should not trip the guard
    expect(() =>
      loadEnv({
        ...validBase,
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET: 'dev-access-secret-change-me-0123456789abcdef',
        JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me-0123456789abcdef',
      }),
    ).not.toThrow();
  });
});
