/** Mirrors apps/api/src/notifications/email-queue.service.ts's EmailJob exactly — the job name is 'send-email' on the 'email' queue. */
export interface EmailJob {
  to: string;
  subject: string;
  body: string;
}
