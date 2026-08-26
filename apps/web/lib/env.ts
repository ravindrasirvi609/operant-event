import { z } from 'zod';

const envSchema = z.object({
  BACKEND_API_URL: z.string().url(),
  COOKIE_DOMAIN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Server-only. BACKEND_API_URL is never exposed to the browser (no
 * NEXT_PUBLIC_ prefix) — the browser only ever talks to same-origin
 * Route Handlers, which read this value server-side.
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
