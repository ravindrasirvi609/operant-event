import { processEmailJob, type SendEmailFn } from './email.processor';
import type { EmailJob } from './email-job.types';

const job: EmailJob = { to: 'jane@example.com', subject: 'Hello', body: 'Welcome!' };

describe('processEmailJob', () => {
  it('sends via the injected client with the exact job fields and an idempotency key derived from the job id', async () => {
    const send: SendEmailFn = jest.fn().mockResolvedValue({ data: { id: 'resend-1' }, error: null });

    await processEmailJob(job, 'job-42', send, { fromAddress: 'noreply@example.com' });

    expect(send).toHaveBeenCalledWith(
      {
        from: 'noreply@example.com',
        to: ['jane@example.com'],
        subject: 'Hello',
        html: 'Welcome!',
      },
      { idempotencyKey: 'send-email/job-42' },
    );
  });

  it('throws when the send call returns an error, so BullMQ marks the job failed and retries per its own policy', async () => {
    const send: SendEmailFn = jest.fn().mockResolvedValue({ data: null, error: { message: 'Invalid recipient' } });

    await expect(
      processEmailJob(job, 'job-42', send, { fromAddress: 'noreply@example.com' }),
    ).rejects.toThrow('Invalid recipient');
  });

  it('skips sending (and does not throw) when no Resend client is configured', async () => {
    await expect(processEmailJob(job, 'job-42', null, { fromAddress: 'noreply@example.com' })).resolves.toBeUndefined();
  });
});
