import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Resend } from 'resend';
import type { Env } from '@operant-event/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from '../common/password/password.service';
import { TokenService } from '../common/tokens/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AUTH_MAILER, type AuthMailer } from './auth-mailer.interface';
import { ConsoleAuthMailer } from './console-auth-mailer';
import { ResendAuthMailer } from './resend-auth-mailer';
import { ENV } from '../common/env/env.module';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    {
      provide: AUTH_MAILER,
      useFactory: (env: Env): AuthMailer => {
        if (!env.RESEND_API_KEY) {
          return new ConsoleAuthMailer();
        }
        const resend = new Resend(env.RESEND_API_KEY);
        return new ResendAuthMailer(
          (payload, options) => resend.emails.send(payload, options),
          env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com',
          env.FRONTEND_URL,
        );
      },
      inject: [ENV],
    },
  ],
  exports: [AuthService, PasswordService, TokenService, AUTH_MAILER],
})
export class AuthModule {}
