import { EmailQueueService } from './email-queue.service';
import type { Queue } from 'bullmq';

function fakeQueue(): Queue {
  return { add: jest.fn().mockResolvedValue(undefined) } as unknown as Queue;
}

describe('EmailQueueService.enqueue', () => {
  it("adds a 'send-email' job to the queue with the given payload", async () => {
    const queue = fakeQueue();
    const service = new EmailQueueService(queue);

    await service.enqueue({
      to: 'jane@example.com',
      subject: 'Hello',
      body: 'World',
    });

    expect(queue.add).toHaveBeenCalledWith('send-email', {
      to: 'jane@example.com',
      subject: 'Hello',
      body: 'World',
    });
  });
});
