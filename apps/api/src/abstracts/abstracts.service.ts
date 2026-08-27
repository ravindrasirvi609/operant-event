import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@operant-event/database';
import { PrismaService } from '../common/prisma/prisma.service';
import { validateAbstractFormData } from '../conference-form-fields/abstract-form-validator';
import { validateAuthorFlags } from './abstract-authors.util';
import { formatSubmissionNumber } from './submission-number.util';
import { isUniqueConstraintViolation } from '../common/utils/prisma-errors.util';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';
import type { CreateAbstractDto } from './dto/create-abstract.dto';
import type { SaveVersionDto } from './dto/save-version.dto';
import type { AuthorInputDto } from './dto/set-authors.dto';

const EDITABLE_STATUSES = new Set(['DRAFT', 'REVISION_REQUIRED']);
const WITHDRAWABLE_STATUSES = new Set([
  'DRAFT',
  'SUBMITTED',
  'SCREENING',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
]);
const MAX_SUBMISSION_NUMBER_ATTEMPTS = 5;

@Injectable()
export class AbstractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDraft(
    conferenceId: string,
    submittedBy: string,
    dto: CreateAbstractDto,
  ) {
    const conference = await this.prisma.conference.findUnique({
      where: { id: conferenceId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }

    return this.prisma.abstract.create({
      data: {
        conferenceId,
        trackId: dto.trackId,
        title: dto.title,
        submissionType: dto.submissionType,
        presentationPreference: dto.presentationPreference,
        status: 'DRAFT',
        submittedBy,
      },
    });
  }

  async findMine(submittedBy: string) {
    return this.prisma.abstract.findMany({ where: { submittedBy } });
  }

  async findAllForOrganizer(organizationId: string, conferenceId: string) {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
    return this.prisma.abstract.findMany({ where: { conferenceId } });
  }

  async saveVersion(
    submittedBy: string,
    abstractId: string,
    dto: SaveVersionDto,
  ) {
    const abstract = await this.findOwned(submittedBy, abstractId);
    if (!EDITABLE_STATUSES.has(abstract.status)) {
      throw new BadRequestException(
        `An abstract with status ${abstract.status} can no longer be edited.`,
      );
    }

    const activeFields = await this.activeFormFields(abstract.conferenceId);
    const errors = validateAbstractFormData(activeFields, dto.formData, {
      requireRequiredFields: false,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const lastVersion = await this.prisma.abstractVersion.findFirst({
      where: { abstractId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await this.prisma.abstractVersion.create({
      data: {
        abstractId,
        versionNumber,
        formData: dto.formData as Prisma.InputJsonValue,
        submittedBy,
      },
    });

    return this.prisma.abstract.update({
      where: { id: abstractId },
      data: {
        currentVersionId: version.id,
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.submissionType !== undefined && {
          submissionType: dto.submissionType,
        }),
        ...(dto.presentationPreference !== undefined && {
          presentationPreference: dto.presentationPreference,
        }),
        ...(dto.trackId !== undefined && { trackId: dto.trackId }),
      },
    });
  }

  async submit(
    submittedBy: string,
    abstractId: string,
    hasDeadlineOverride: boolean,
  ) {
    const abstract = await this.findOwned(submittedBy, abstractId);
    return this.runSubmit(abstract, hasDeadlineOverride);
  }

  /**
   * Organizer-initiated submit past the deadline (ABS-006's admin override).
   * Deliberately a separate, PermissionsGuard-gated entry point rather than
   * a hidden parameter on the author's own submit call: the author never
   * has organization context to derive an override permission from, so the
   * override is something staff does on the author's behalf.
   */
  async forceSubmit(
    organizationId: string,
    conferenceId: string,
    abstractId: string,
  ) {
    const conference = await this.prisma.conference.findFirst({
      where: { id: conferenceId, organizationId },
    });
    if (!conference) {
      throw new NotFoundException('Conference not found.');
    }
    const abstract = await this.prisma.abstract.findFirst({
      where: { id: abstractId, conferenceId },
    });
    if (!abstract) {
      throw new NotFoundException('Abstract not found.');
    }
    return this.runSubmit(abstract, true);
  }

  private async runSubmit(
    abstract: {
      id: string;
      conferenceId: string;
      submittedBy: string;
      title: string;
      status: string;
      currentVersionId: string | null;
    },
    hasDeadlineOverride: boolean,
  ) {
    if (!EDITABLE_STATUSES.has(abstract.status)) {
      throw new BadRequestException(
        `An abstract with status ${abstract.status} can no longer be submitted.`,
      );
    }
    if (!abstract.currentVersionId) {
      throw new BadRequestException(
        'Save at least one version before submitting.',
      );
    }

    if (!hasDeadlineOverride) {
      const settings = await this.prisma.conferenceSetting.findUnique({
        where: { conferenceId: abstract.conferenceId },
      });
      if (
        settings?.abstractEndDate &&
        settings.abstractEndDate.getTime() < Date.now()
      ) {
        throw new BadRequestException(
          'The abstract submission deadline for this conference has passed.',
        );
      }
    }

    const currentVersion = await this.prisma.abstractVersion.findFirst({
      where: { id: abstract.currentVersionId },
    });
    const activeFields = await this.activeFormFields(abstract.conferenceId);
    const errors = validateAbstractFormData(
      activeFields,
      (currentVersion?.formData as Record<string, unknown>) ?? {},
      { requireRequiredFields: true },
    );
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    // A resubmission keeps its existing submission number — it's the same
    // slot, just revised content — and only a first-time submit needs one
    // assigned.
    const updated =
      abstract.status === 'REVISION_REQUIRED'
        ? await this.prisma.abstract.update({
            where: { id: abstract.id },
            data: { status: 'RESUBMITTED', submittedAt: new Date() },
          })
        : await this.assignSubmissionNumberAndSubmit(
            abstract.conferenceId,
            abstract.id,
          );

    await this.emitAbstractSubmitted(abstract);
    return updated;
  }

  /** §20 trigger: "Abstract submitted". No-ops silently if the conference has since been deleted. */
  private async emitAbstractSubmitted(abstract: {
    id: string;
    conferenceId: string;
    submittedBy: string;
    title: string;
  }): Promise<void> {
    const conference = await this.prisma.conference.findUnique({
      where: { id: abstract.conferenceId },
      select: { organizationId: true },
    });
    if (!conference) {
      return;
    }
    this.eventEmitter.emit(NOTIFICATION_EVENTS.ABSTRACT_SUBMITTED, {
      organizationId: conference.organizationId,
      conferenceId: abstract.conferenceId,
      userId: abstract.submittedBy,
      templateData: { abstractTitle: abstract.title },
      entityType: 'abstract',
      entityId: abstract.id,
    });
  }

  async withdraw(submittedBy: string, abstractId: string) {
    const abstract = await this.findOwned(submittedBy, abstractId);
    if (!WITHDRAWABLE_STATUSES.has(abstract.status)) {
      throw new BadRequestException(
        `An abstract with status ${abstract.status} can no longer be withdrawn.`,
      );
    }
    return this.prisma.abstract.update({
      where: { id: abstractId },
      data: { status: 'WITHDRAWN' },
    });
  }

  async setAuthors(
    submittedBy: string,
    abstractId: string,
    authors: AuthorInputDto[],
  ) {
    await this.findOwned(submittedBy, abstractId);

    const flagErrors = validateAuthorFlags(authors);
    if (flagErrors.length > 0) {
      throw new BadRequestException(flagErrors);
    }

    const authorIds = await Promise.all(
      authors.map((author) => this.findOrCreateAuthor(author)),
    );

    await this.prisma.abstractAuthor.deleteMany({ where: { abstractId } });
    await this.prisma.abstractAuthor.createMany({
      data: authorIds.map((authorId, index) => ({
        abstractId,
        authorId,
        authorOrder: index,
        isCorresponding: authors[index].isCorresponding ?? false,
        isPresenting: authors[index].isPresenting ?? false,
      })),
    });
  }

  /**
   * Author-facing read-back: the abstract plus its latest saved
   * `AbstractVersion.formData` and ordered author list — the only place
   * an author can see what they last saved, mirroring what `saveVersion`/
   * `setAuthors` write.
   */
  async findOwnedWithDetail(submittedBy: string, abstractId: string) {
    const abstract = await this.findOwned(submittedBy, abstractId);
    const [latestVersion, authors] = await Promise.all([
      this.prisma.abstractVersion.findFirst({
        where: { abstractId },
        orderBy: { versionNumber: 'desc' },
      }),
      this.prisma.abstractAuthor.findMany({
        where: { abstractId },
        orderBy: { authorOrder: 'asc' },
        include: { author: true },
      }),
    ]);
    return {
      ...abstract,
      formData: latestVersion?.formData ?? null,
      authors,
    };
  }

  /** Not tenant-scoped by organization — the caller here is the author, not an org member. */
  private async findOwned(submittedBy: string, abstractId: string) {
    const abstract = await this.prisma.abstract.findFirst({
      where: { id: abstractId, submittedBy },
    });
    if (!abstract) {
      throw new NotFoundException('Abstract not found.');
    }
    return abstract;
  }

  private async activeFormFields(conferenceId: string) {
    return this.prisma.conferenceFormField.findMany({
      where: { conferenceId, status: 'ACTIVE' },
    });
  }

  private async findOrCreateAuthor(input: AuthorInputDto): Promise<string> {
    if (input.email) {
      const existing = await this.prisma.author.findFirst({
        where: { email: input.email },
      });
      if (existing) {
        return existing.id;
      }
    }
    const created = await this.prisma.author.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        mobile: input.mobile,
        designation: input.designation,
        institution: input.institution,
        department: input.department,
        city: input.city,
        country: input.country,
      },
    });
    return created.id;
  }

  /** Retries on a real unique-constraint collision — the database, not an app-level count, is the arbiter. */
  private async assignSubmissionNumberAndSubmit(
    conferenceId: string,
    abstractId: string,
  ) {
    let sequence =
      (await this.prisma.abstract.count({
        where: { conferenceId, submissionNumber: { not: null } },
      })) + 1;

    for (let attempt = 0; attempt < MAX_SUBMISSION_NUMBER_ATTEMPTS; attempt++) {
      const candidate = formatSubmissionNumber(sequence);
      try {
        return await this.prisma.abstract.update({
          where: { id: abstractId },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            submissionNumber: candidate,
          },
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          sequence += 1;
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException(
      'Could not assign a unique submission number; please retry.',
    );
  }
}
