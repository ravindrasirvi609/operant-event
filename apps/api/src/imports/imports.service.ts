import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ImportQueueService } from './import-queue.service';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importQueue: ImportQueueService,
  ) {}

  /** §38: row-level validation happens asynchronously in the (deferred) worker processor — this call only queues it. */
  async create(
    organizationId: string,
    conferenceId: string,
    requestedBy: string,
    type: string,
    sourceFileId: string,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);

    const file = await this.prisma.file.findFirst({
      where: { id: sourceFileId, organizationId },
    });
    if (!file) {
      throw new BadRequestException(
        'Source file not found in this organization.',
      );
    }

    const job = await this.prisma.importJob.create({
      data: {
        organizationId,
        conferenceId,
        requestedBy,
        type,
        sourceFileId,
        status: 'QUEUED',
      },
    });
    await this.importQueue.enqueue(job.id);
    return job;
  }

  async findById(organizationId: string, importJobId: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id: importJobId, organizationId },
    });
    if (!job) {
      throw new NotFoundException('Import job not found.');
    }
    return job;
  }

  async findAllForConference(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.importJob.findMany({
      where: { organizationId, conferenceId },
      orderBy: { createdAt: 'desc' },
    });
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
