import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TokenService } from '../common/tokens/token.service';
import { AUTH_MAILER, type AuthMailer } from '../auth/auth-mailer.interface';
import { slugify } from '../common/utils/slugify';
import type { CreateOrganizationDto } from './dto/create-organization.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { InviteMemberDto } from './dto/invite-member.dto';
import type { UpdateMembershipDto } from './dto/update-membership.dto';

const OWNER_ROLE_NAME = 'Organization Owner';
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    @Inject(AUTH_MAILER) private readonly mailer: AuthMailer,
  ) {}

  async create(ownerUserId: string, dto: CreateOrganizationDto) {
    const slug = slugify(dto.slug ?? dto.name);
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(
        `An organization with slug "${slug}" already exists.`,
      );
    }

    // Not findUnique on the compound (organizationId, name) index: Postgres
    // never treats two NULLs as equal, even under a unique constraint, so
    // Prisma's generated unique-input type for this index doesn't accept
    // null for organizationId at all — findFirst is the correct lookup here.
    const ownerRole = await this.prisma.role.findFirst({
      where: { organizationId: null, name: OWNER_ROLE_NAME },
    });
    if (!ownerRole) {
      throw new NotFoundException(
        `System role "${OWNER_ROLE_NAME}" is not seeded. Run the permissions/roles seed first.`,
      );
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        website: dto.website,
      },
    });

    await this.prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: ownerUserId,
        status: 'ACTIVE',
        joinedAt: new Date(),
        roles: { create: { roleId: ownerRole.id } },
      },
    });

    return organization;
  }

  async findMine(userId: string) {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId, status: 'ACTIVE' } } },
    });
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail,
        }),
        ...(dto.contactPhone !== undefined && {
          contactPhone: dto.contactPhone,
        }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.logoFileId !== undefined && { logoFileId: dto.logoFileId }),
      },
    });
  }

  /**
   * A brand-new invitee has no password yet, so we reuse the password-reset
   * primitive to let them set one: from the recipient's side, "set your
   * password to accept this invite" and "reset your password" are the same
   * action, and it avoids inventing a second token type + email template
   * for what is functionally identical flow.
   */
  async inviteMember(organizationId: string, dto: InviteMemberDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash: this.unusablePasswordHash(),
          status: 'INVITED',
        },
      });

      const { token, tokenHash } = this.tokenService.issueRefreshToken();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });
      await this.mailer.sendPasswordReset(
        { email: user.email, firstName: user.firstName },
        token,
      );
    }

    return this.prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        status: 'INVITED',
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      },
    });
  }

  async updateMembershipStatus(
    organizationId: string,
    membershipId: string,
    status: 'ACTIVE' | 'DEACTIVATED',
  ) {
    return this.prisma.organizationMembership.update({
      where: { id: membershipId, organizationId },
      data: { status },
    });
  }

  /** Dispatches to whichever of status/roleIds the caller actually sent. */
  async updateMembership(
    organizationId: string,
    membershipId: string,
    dto: UpdateMembershipDto,
  ) {
    if (dto.status !== undefined) {
      await this.updateMembershipStatus(
        organizationId,
        membershipId,
        dto.status,
      );
    }
    if (dto.roleIds !== undefined) {
      await this.assignMembershipRoles(membershipId, dto.roleIds);
    }
  }

  async assignMembershipRoles(
    membershipId: string,
    roleIds: string[],
  ): Promise<void> {
    await this.prisma.membershipRole.deleteMany({ where: { membershipId } });
    await this.prisma.membershipRole.createMany({
      data: roleIds.map((roleId) => ({ membershipId, roleId })),
    });
  }

  async listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
    });
  }

  /** A password nobody could ever type: PasswordService.compare() will always return false against it. */
  private unusablePasswordHash(): string {
    return `unusable:${randomBytes(32).toString('hex')}`;
  }
}
