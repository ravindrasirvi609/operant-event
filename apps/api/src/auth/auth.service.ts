import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PasswordService } from '../common/password/password.service';
import { TokenService } from '../common/tokens/token.service';
import { AUTH_MAILER, type AuthMailer } from './auth-mailer.interface';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';
import type { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import type { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30; // 30 min

export interface AuthenticatedSummary {
  id: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedSummary;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Inject(AUTH_MAILER) private readonly mailer: AuthMailer,
  ) {}

  async register(dto: RegisterDto): Promise<AuthenticatedSummary> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: 'ACTIVE',
      },
    });

    await this.issueEmailVerification(user);

    return { id: user.id, email: user.email };
  }

  async login(
    dto: LoginDto,
    context: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new ForbiddenException('This account is not active.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueSession(user, context);
    return { ...tokens, user: { id: user.id, email: user.email } };
  }

  async refresh(
    dto: RefreshDto,
    context: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    const tokenHash = this.tokenService.hashRefreshToken(dto.refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has expired.',
      );
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueSession(user, context);
    return { ...tokens, user: { id: user.id, email: user.email } };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new UnauthorizedException(
        'Verification token is invalid or has expired.',
      );
    }

    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** Always resolves successfully regardless of whether the email exists — prevents account enumeration. */
  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      return;
    }

    const { token, tokenHash } = this.tokenService.issueRefreshToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await this.mailer.sendPasswordReset(
      { email: user.email, firstName: user.firstName },
      token,
    );
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(dto.token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new UnauthorizedException('Reset token is invalid or has expired.');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    // Completing the password setup accepts organization invitations for
    // this user. Without this transition, organizations/me intentionally
    // hides the INVITED membership and the dashboard incorrectly offers to
    // create a new organization.
    await this.prisma.organizationMembership.updateMany({
      where: { userId: record.userId, status: 'INVITED' },
      data: { status: 'ACTIVE', joinedAt: new Date() },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    // A changed password invalidates every existing session, not just this device.
    await this.prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string): Promise<SessionSummary[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new ForbiddenException('This session does not belong to you.');
    }
  }

  private async issueEmailVerification(user: {
    id: string;
    email: string;
    firstName: string;
  }): Promise<void> {
    const { token, tokenHash } = this.tokenService.issueRefreshToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });
    await this.mailer.sendEmailVerification(
      { email: user.email, firstName: user.firstName },
      token,
    );
  }

  private async issueSession(
    user: { id: string; email: string },
    context: { userAgent?: string; ipAddress?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const issued = this.tokenService.issueRefreshToken();

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: issued.tokenHash,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
        expiresAt: issued.expiresAt,
      },
    });

    return { accessToken, refreshToken: issued.token };
  }
}
