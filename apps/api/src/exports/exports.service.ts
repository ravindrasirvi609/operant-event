import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExportQueueService } from './export-queue.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportQueue: ExportQueueService,
  ) {}

  /** §22/§38/§31: never blocks the request — returns immediately with a job id to poll. */
  async create(
    organizationId: string,
    conferenceId: string,
    requestedBy: string,
    type: string,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const job = await this.prisma.exportJob.create({
      data: {
        organizationId,
        conferenceId,
        requestedBy,
        type,
        status: 'QUEUED',
      },
    });
    await this.exportQueue.enqueue(job.id);
    return job;
  }

  async findById(organizationId: string, exportJobId: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: exportJobId, organizationId },
    });
    if (!job) {
      throw new NotFoundException('Export job not found.');
    }
    return job;
  }

  private async assertConferenceInOrganization(
    organizationId: string,
    conferenceId: string,
  ): Promise<void> {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
  }
}
