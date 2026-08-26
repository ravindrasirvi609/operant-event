import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

export const EXPORT_QUEUE = 'exports';

/** apps/worker has no processor for this queue yet — same deferral as the email queue. */
@Injectable()
export class ExportQueueService {
  constructor(@InjectQueue(EXPORT_QUEUE) private readonly queue: Queue) {}

  enqueue(exportJobId: string) {
    return this.queue.add('run-export', { exportJobId });
  }
}
