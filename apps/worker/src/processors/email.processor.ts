import type { EmailJob } from './email-job.types';

export interface SendEmailResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

/** Matches the Resend SDK's `resend.emails.send` signature exactly — injected so this stays testable without a real network call. */
export type SendEmailFn = (
  payload: { from: string; to: string[]; subject: string; html: string },
  options: { idempotencyKey: string },
) => Promise<SendEmailResult>;

export interface EmailProcessorConfig {
  fromAddress: string;
}

/**
 * `send` is `null` when no `RESEND_API_KEY` is configured — this is a
 * deliberate skip (logged, not thrown), not a failure: a deployment
 * without email configured still shouldn't crash the worker or fail
 * every job in the queue.
 */
export async function processEmailJob(
  job: EmailJob,
  jobId: string,
  send: SendEmailFn | null,
  config: EmailProcessorConfig,
): Promise<void> {
  if (!send) {
    console.warn(`[email.processor] No RESEND_API_KEY configured — skipping send for job ${jobId}.`);
    return;
  }

  const { error } = await send(
    {
      from: config.fromAddress,
      to: [job.to],
      subject: job.subject,
      html: job.body,
    },
    // Format matches the resend skill's guidance: <event-type>/<entity-id>,
    // reusing BullMQ's own job id so a retried job never double-sends.
    { idempotencyKey: `send-email/${jobId}` },
  );

  if (error) {
    throw new Error(error.message);
  }
}
