import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from '../common/password/password.service';
import { TokenService } from '../common/tokens/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AUTH_MAILER } from './auth-mailer.interface';
import { ConsoleAuthMailer } from './console-auth-mailer';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    { provide: AUTH_MAILER, useClass: ConsoleAuthMailer },
  ],
  exports: [AuthService, PasswordService, TokenService, AUTH_MAILER],
})
export class AuthModule {}
