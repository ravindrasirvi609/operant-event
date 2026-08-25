import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Thin Passport wrapper — all it does is trigger the 'jwt' strategy above. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
