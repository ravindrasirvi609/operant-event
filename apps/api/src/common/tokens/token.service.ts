import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { Env } from '@operant-event/config';
import { ENV } from '../env/env.module';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwtService: JwtService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.JWT_ACCESS_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
    });
  }

  /**
   * Refresh tokens are opaque random values, not JWTs: they're stored
   * server-side (hashed) on Session so a single session can be revoked by
   * deleting/expiring that row, which a self-contained JWT refresh token
   * would not allow without a separate denylist.
   */
  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    return { token, tokenHash: this.hashRefreshToken(token), expiresAt };
  }

  /**
   * SHA-256, not bcrypt: refresh tokens are already 384 bits of random
   * entropy, not a human-chosen password, so there's nothing for bcrypt's
   * deliberate slowness to defend against here — only cost to pay on every
   * authenticated request.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
