import { z } from 'zod';

// The exact placeholder values shipped in .env.example.  A production deploy
// that accidentally copies .env.example verbatim would use these known-public
// strings to sign JWTs — a silent critical vulnerability.  We reject them
// explicitly when NODE_ENV is 'production'.
const EXAMPLE_JWT_ACCESS_SECRET = 'dev-access-secret-change-me-0123456789abcdef';
const EXAMPLE_JWT_REFRESH_SECRET = 'dev-refresh-secret-change-me-0123456789abcdef';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    PORT: z.coerce.number().int().positive().default(3000),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    // Optional: only needed by conferences configured for GATEWAY payment
    // mode. MANUAL-only deployments (or ones only using one provider) need
    // none or only half of these set.
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    // Shared by apps/api and apps/worker — both must resolve the same
    // absolute (or identically-relative-from-a-shared-cwd) directory,
    // since a generated file written by one process is read back by the
    // other (e.g. an import's source file, an export's result file).
    UPLOADS_DIR: z.string().default('./uploads'),
    // Optional: shared by apps/api (auth verification/reset emails, via
    // ResendAuthMailer) and apps/worker (queued notification emails). Absent
    // in either process, that process's mailer falls back to a console-log
    // stopgap instead of sending.
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM_ADDRESS: z.string().optional(),
    // apps/api only: base URL used to build links in auth emails
    // (verify-email, password-reset/confirm) that point at apps/web.
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;

    // In production, JWT secrets must not be the example placeholder values,
    // must not look like dev/test values, and must be distinct from each other.
    const badSecretPatterns = [
      EXAMPLE_JWT_ACCESS_SECRET,
      EXAMPLE_JWT_REFRESH_SECRET,
      // catch anything that still has the dev-placeholder fingerprint
      /change-me/i,
      /^dev-/i,
    ];

    function isWeakSecret(value: string): boolean {
      return badSecretPatterns.some((p) =>
        typeof p === 'string' ? value === p : p.test(value),
      );
    }

    if (isWeakSecret(data.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message:
          'JWT_ACCESS_SECRET must not be a placeholder or example value in production. ' +
          'Generate one with: openssl rand -base64 48',
      });
    }

    if (isWeakSecret(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_REFRESH_SECRET must not be a placeholder or example value in production. ' +
          'Generate one with: openssl rand -base64 48',
      });
    }

    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message:
          'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different secrets.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates process.env against the shared schema. Throws with a
 * readable, per-field message on the first call that sees bad/missing
 * config, instead of letting apps fail later with an opaque undefined.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
