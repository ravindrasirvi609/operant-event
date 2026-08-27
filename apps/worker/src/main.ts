import 'dotenv/config';
import { Redis } from 'ioredis';
import { Worker } from 'bullmq';
import { Resend } from 'resend';
import { loadEnv } from '@operant-event/config';
import { prisma } from './prisma';
import { storage } from './storage';
import { processEmailJob, type SendEmailFn } from './processors/email.processor';
import type { EmailJob } from './processors/email-job.types';
import { processExportJob } from './processors/export.processor';
import { processImportJob } from './processors/import.processor';

async function main() {
  const env = loadEnv();
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  connection.on('error', (error) => console.error('[worker] Redis connection error:', error));
  await connection.connect();
  console.log('[worker] Redis connected.');

  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  const sendEmail: SendEmailFn | null = resend
    ? (payload, options) => resend.emails.send(payload, options)
    : null;
  if (!resend) {
    console.warn('[worker] RESEND_API_KEY not configured — the email processor will log and skip every send.');
  }

  const emailWorker = new Worker<EmailJob>(
    'email',
    async (job) => {
      await processEmailJob(job.data, job.id ?? 'unknown', sendEmail, {
        fromAddress: env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com',
      });
    },
    { connection },
  );

  const exportWorker = new Worker<{ exportJobId: string }>(
    'exports',
    async (job) => {
      await processExportJob(job.data.exportJobId, { prisma, storage });
    },
    { connection },
  );

  const importWorker = new Worker<{ importJobId: string }>(
    'imports',
    async (job) => {
      await processImportJob(job.data.importJobId, { prisma, storage });
    },
    { connection },
  );

  for (const worker of [emailWorker, exportWorker, importWorker]) {
    worker.on('failed', (job, error) => {
      console.error(`[worker] ${worker.name} job ${job?.id} failed:`, error);
    });
  }

  console.log('[worker] Ready — consuming email, exports, and imports queues.');

  const shutdown = async () => {
    console.log('[worker] Shutting down...');
    await Promise.all([emailWorker.close(), exportWorker.close(), importWorker.close()]);
    await prisma.$disconnect();
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[worker] Fatal startup error:', error);
  process.exit(1);
});
