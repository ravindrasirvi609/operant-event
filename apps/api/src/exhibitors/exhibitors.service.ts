import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateExhibitorDto } from './dto/create-exhibitor.dto';
import type { UpdateExhibitorDto } from './dto/update-exhibitor.dto';
import type { AddExhibitorStaffDto } from './dto/add-exhibitor-staff.dto';

@Injectable()
export class ExhibitorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    conferenceId: string,
    dto: CreateExhibitorDto,
  ) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.exhibitor.create({
      data: {
        conferenceId,
        companyName: dto.companyName,
        boothNumber: dto.boothNumber,
        contactPerson: dto.contactPerson,
      },
    });
  }

  async findAll(organizationId: string, conferenceId: string) {
    await this.assertConferenceInOrganization(organizationId, conferenceId);
    return this.prisma.exhibitor.findMany({
      where: { conferenceId },
      include: { staff: true },
    });
  }

  async update(
    organizationId: string,
    exhibitorId: string,
    dto: UpdateExhibitorDto,
  ) {
    await this.assertExhibitorInOrganization(organizationId, exhibitorId);
    return this.prisma.exhibitor.update({
      where: { id: exhibitorId },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.boothNumber !== undefined && { boothNumber: dto.boothNumber }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson,
        }),
        ...(dto.paymentStatus !== undefined && {
          paymentStatus: dto.paymentStatus,
        }),
      },
    });
  }

  async addStaff(
    organizationId: string,
    exhibitorId: string,
    dto: AddExhibitorStaffDto,
  ) {
    await this.assertExhibitorInOrganization(organizationId, exhibitorId);
    return this.prisma.exhibitorStaff.create({
      data: { exhibitorId, name: dto.name, email: dto.email },
    });
  }

  async removeStaff(organizationId: string, staffId: string): Promise<void> {
    const staff = await this.prisma.exhibitorStaff.findFirst({
      where: { id: staffId, exhibitor: { conference: { organizationId } } },
    });
    if (!staff) {
      throw new NotFoundException('Exhibitor staff member not found.');
    }
    await this.prisma.exhibitorStaff.delete({ where: { id: staffId } });
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

  private async assertExhibitorInOrganization(
    organizationId: string,
    exhibitorId: string,
  ) {
    const exhibitor = await this.prisma.exhibitor.findFirst({
      where: { id: exhibitorId, conference: { organizationId } },
    });
    if (!exhibitor) {
      throw new NotFoundException('Exhibitor not found.');
    }
    return exhibitor;
  }
}
