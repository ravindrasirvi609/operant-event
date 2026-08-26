import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

export const EMAIL_QUEUE = 'email';

export interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

/**
 * The actual apps/worker consumer for this queue is unwired — no BullMQ
 * Worker/Processor exists there yet (same deferral as the invoice/certificate
 * PDF jobs). This producer side is real: jobs really get added to a real
 * BullMQ queue backed by REDIS_URL: nothing here is a stub.
 */
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue) {}

  enqueue(job: EmailJob) {
    return this.queue.add('send-email', job);
  }
}
