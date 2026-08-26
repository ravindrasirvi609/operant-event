import { CertificateEligibilityService } from './certificate-eligibility.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { AttendanceService } from '../attendance/attendance.service';

function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
  const base = {
    registration: { findUnique: jest.fn() },
    conferenceSetting: { findUnique: jest.fn().mockResolvedValue(null) },
    abstract: { findFirst: jest.fn() },
    speaker: { findFirst: jest.fn() },
    sessionSpeaker: { findFirst: jest.fn() },
    reviewer: { findFirst: jest.fn() },
    review: { count: jest.fn() },
    checkin: { findFirst: jest.fn() },
  };
  const baseRecord = base as unknown as Record<
    string,
    Record<string, jest.Mock>
  >;
  for (const [model, methods] of Object.entries(overrides)) {
    Object.assign(baseRecord[model], methods);
  }
  return base as unknown as PrismaService;
}

function fakeAttendance(count = 0): AttendanceService {
  return {
    countForRegistration: jest.fn().mockResolvedValue(count),
  } as unknown as AttendanceService;
}

const registration = {
  id: 'reg-1',
  conferenceId: 'conf-1',
  userId: 'user-1',
  status: 'CONFIRMED',
};

describe('CertificateEligibilityService.isEligible — PARTICIPATION', () => {
  it('is eligible when confirmed and attendance meets the configured threshold', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateAttendanceThreshold: 2 }),
      },
    });
    const service = new CertificateEligibilityService(
      prisma,
      fakeAttendance(2),
    );

    await expect(service.isEligible('PARTICIPATION', 'reg-1')).resolves.toBe(
      true,
    );
  });

  it('is not eligible when attendance is below the configured threshold', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateAttendanceThreshold: 3 }),
      },
    });
    const service = new CertificateEligibilityService(
      prisma,
      fakeAttendance(1),
    );

    await expect(service.isEligible('PARTICIPATION', 'reg-1')).resolves.toBe(
      false,
    );
  });

  it('is not eligible when the registration was never confirmed', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...registration, status: 'PENDING' }),
      },
    });
    const service = new CertificateEligibilityService(
      prisma,
      fakeAttendance(5),
    );

    await expect(service.isEligible('PARTICIPATION', 'reg-1')).resolves.toBe(
      false,
    );
  });
});

describe('CertificateEligibilityService.isEligible — PRESENTATION', () => {
  it('is eligible when the user has a PRESENTED abstract in the conference', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      abstract: {
        findFirst: jest.fn().mockResolvedValue({ id: 'abstract-1' }),
      },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('PRESENTATION', 'reg-1')).resolves.toBe(
      true,
    );
  });

  it('is not eligible when the user has no PRESENTED abstract', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      abstract: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('PRESENTATION', 'reg-1')).resolves.toBe(
      false,
    );
  });
});

describe('CertificateEligibilityService.isEligible — SPEAKER', () => {
  it('is eligible when linked to a PUBLISHED session via SessionSpeaker', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      speaker: { findFirst: jest.fn().mockResolvedValue({ id: 'speaker-1' }) },
      sessionSpeaker: {
        findFirst: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
      },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('SPEAKER', 'reg-1')).resolves.toBe(true);
  });

  it('is not eligible when the user has no Speaker profile in the conference', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      speaker: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('SPEAKER', 'reg-1')).resolves.toBe(false);
  });
});

describe('CertificateEligibilityService.isEligible — REVIEWER', () => {
  it('is eligible when completed review count meets the configured threshold', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest.fn().mockResolvedValue({
          ...registration,
          conference: { organizationId: 'org-1' },
        }),
      },
      reviewer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'reviewer-1' }),
      },
      conferenceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ certificateReviewThreshold: 2 }),
      },
      review: { count: jest.fn().mockResolvedValue(2) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('REVIEWER', 'reg-1')).resolves.toBe(true);
  });

  it('is not eligible when the user is not a reviewer for the organization', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest.fn().mockResolvedValue({
          ...registration,
          conference: { organizationId: 'org-1' },
        }),
      },
      reviewer: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('REVIEWER', 'reg-1')).resolves.toBe(false);
  });
});

describe('CertificateEligibilityService.isEligible — CHAIR', () => {
  it('is eligible for a CHAIR role on a PUBLISHED session', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      speaker: { findFirst: jest.fn().mockResolvedValue({ id: 'speaker-1' }) },
      sessionSpeaker: {
        findFirst: jest.fn().mockResolvedValue({ role: 'CHAIR' }),
      },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('CHAIR', 'reg-1')).resolves.toBe(true);
  });

  it('is not eligible when the speaker only ever held a plain SPEAKER role', async () => {
    const sessionSpeakerFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
      speaker: { findFirst: jest.fn().mockResolvedValue({ id: 'speaker-1' }) },
      sessionSpeaker: { findFirst: sessionSpeakerFindFirst },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('CHAIR', 'reg-1')).resolves.toBe(false);
    expect(sessionSpeakerFindFirst).toHaveBeenCalledWith({
      where: {
        speakerId: 'speaker-1',
        role: { in: ['CHAIR', 'CO_CHAIR'] },
        session: { status: 'PUBLISHED' },
      },
    });
  });
});

describe('CertificateEligibilityService.isEligible — WORKSHOP', () => {
  it('is eligible for a workshop-category registration with a WORKSHOP check-in', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest.fn().mockResolvedValue({
          ...registration,
          registrationType: { category: { name: 'Workshop Pass' } },
        }),
      },
      checkin: { findFirst: jest.fn().mockResolvedValue({ id: 'checkin-1' }) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('WORKSHOP', 'reg-1')).resolves.toBe(true);
  });

  it('is not eligible for a non-workshop category even with a WORKSHOP check-in', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest.fn().mockResolvedValue({
          ...registration,
          registrationType: { category: { name: 'Standard Delegate' } },
        }),
      },
      checkin: { findFirst: jest.fn().mockResolvedValue({ id: 'checkin-1' }) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('WORKSHOP', 'reg-1')).resolves.toBe(false);
  });

  it('is not eligible for a workshop-category registration with no WORKSHOP check-in', async () => {
    const prisma = fakePrisma({
      registration: {
        findUnique: jest.fn().mockResolvedValue({
          ...registration,
          registrationType: { category: { name: 'Workshop Pass' } },
        }),
      },
      checkin: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('WORKSHOP', 'reg-1')).resolves.toBe(false);
  });
});

describe('CertificateEligibilityService.isEligible — unknown type', () => {
  it('returns false for an unrecognized certificate type', async () => {
    const prisma = fakePrisma({
      registration: { findUnique: jest.fn().mockResolvedValue(registration) },
    });
    const service = new CertificateEligibilityService(prisma, fakeAttendance());

    await expect(service.isEligible('UNKNOWN', 'reg-1')).resolves.toBe(false);
  });
});
