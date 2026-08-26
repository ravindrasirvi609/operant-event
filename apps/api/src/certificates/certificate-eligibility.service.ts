import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';

const PARTICIPATION_ELIGIBLE_STATUSES = ['CONFIRMED', 'CHECKED_IN'];
const CHAIR_ROLES = ['CHAIR', 'CO_CHAIR'];

/** SRS §18 eligibility table — one rule per certificate type. */
@Injectable()
export class CertificateEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async isEligible(
    certificateType: string,
    registrationId: string,
  ): Promise<boolean> {
    switch (certificateType) {
      case 'PARTICIPATION':
        return this.isParticipationEligible(registrationId);
      case 'PRESENTATION':
        return this.isPresentationEligible(registrationId);
      case 'SPEAKER':
        return this.isSpeakerEligible(registrationId);
      case 'REVIEWER':
        return this.isReviewerEligible(registrationId);
      case 'CHAIR':
        return this.isChairEligible(registrationId);
      case 'WORKSHOP':
        return this.isWorkshopEligible(registrationId);
      default:
        return false;
    }
  }

  private async isParticipationEligible(
    registrationId: string,
  ): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (
      !registration ||
      !PARTICIPATION_ELIGIBLE_STATUSES.includes(registration.status)
    ) {
      return false;
    }
    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: registration.conferenceId },
    });
    const threshold = settings?.certificateAttendanceThreshold ?? 1;
    const attendanceCount =
      await this.attendanceService.countForRegistration(registrationId);
    return attendanceCount >= threshold;
  }

  private async isPresentationEligible(
    registrationId: string,
  ): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      return false;
    }
    const presented = await this.prisma.abstract.findFirst({
      where: {
        conferenceId: registration.conferenceId,
        submittedBy: registration.userId,
        status: 'PRESENTED',
      },
    });
    return presented !== null;
  }

  private async isSpeakerEligible(registrationId: string): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      return false;
    }
    const speaker = await this.prisma.speaker.findFirst({
      where: {
        conferenceId: registration.conferenceId,
        userId: registration.userId,
      },
    });
    if (!speaker) {
      return false;
    }
    const publishedAssignment = await this.prisma.sessionSpeaker.findFirst({
      where: { speakerId: speaker.id, session: { status: 'PUBLISHED' } },
    });
    return publishedAssignment !== null;
  }

  private async isReviewerEligible(registrationId: string): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { conference: true },
    });
    if (!registration) {
      return false;
    }
    const reviewer = await this.prisma.reviewer.findFirst({
      where: {
        organizationId: registration.conference.organizationId,
        userId: registration.userId,
      },
    });
    if (!reviewer) {
      return false;
    }
    const settings = await this.prisma.conferenceSetting.findUnique({
      where: { conferenceId: registration.conferenceId },
    });
    const threshold = settings?.certificateReviewThreshold ?? 1;
    const reviewCount = await this.prisma.review.count({
      where: {
        assignment: {
          reviewerId: reviewer.id,
          abstract: { conferenceId: registration.conferenceId },
        },
      },
    });
    return reviewCount >= threshold;
  }

  private async isChairEligible(registrationId: string): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
    });
    if (!registration) {
      return false;
    }
    const speaker = await this.prisma.speaker.findFirst({
      where: {
        conferenceId: registration.conferenceId,
        userId: registration.userId,
      },
    });
    if (!speaker) {
      return false;
    }
    const chairAssignment = await this.prisma.sessionSpeaker.findFirst({
      where: {
        speakerId: speaker.id,
        role: { in: CHAIR_ROLES },
        session: { status: 'PUBLISHED' },
      },
    });
    return chairAssignment !== null;
  }

  /**
   * "Workshop-category registration" is inferred from the registration's
   * category name (no dedicated isWorkshop flag exists on
   * RegistrationCategory) — a category named e.g. "Workshop Pass".
   */
  private async isWorkshopEligible(registrationId: string): Promise<boolean> {
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { registrationType: { include: { category: true } } },
    });
    if (!registration) {
      return false;
    }
    const isWorkshopCategory = registration.registrationType.category.name
      .toLowerCase()
      .includes('workshop');
    if (!isWorkshopCategory) {
      return false;
    }
    const workshopCheckin = await this.prisma.checkin.findFirst({
      where: { registrationId, checkinType: 'WORKSHOP' },
    });
    return workshopCheckin !== null;
  }
}
