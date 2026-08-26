import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

export const IMPORT_QUEUE = 'imports';

/** apps/worker has no processor for this queue yet — same deferral as the email/export queues. */
@Injectable()
export class ImportQueueService {
  constructor(@InjectQueue(IMPORT_QUEUE) private readonly queue: Queue) {}

  enqueue(importJobId: string) {
    return this.queue.add('run-import', { importJobId });
  }
}
