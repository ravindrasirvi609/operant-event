import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '@operant-event/config';
import { ENV } from '../../common/env/env.module';
import type { AccessTokenPayload } from '../../common/tokens/token.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ENV) env: Env) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  /**
   * No DB lookup here by design: access tokens are short-lived (default 15
   * min), so trusting the verified payload keeps every authenticated
   * request off the database. Account state changes (deactivation, role
   * changes) take effect within one access-token TTL, which is the
   * accepted tradeoff — immediate revocation goes through refresh-token
   * (Session) invalidation instead (AUTH-005).
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload.');
    }
    return { id: payload.sub, email: payload.email };
  }
}
