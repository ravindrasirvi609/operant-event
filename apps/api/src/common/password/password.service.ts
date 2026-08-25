import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Env } from '@operant-event/config';
import { ENV } from '../env/env.module';

@Injectable()
export class PasswordService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.env.BCRYPT_SALT_ROUNDS);
  }

  compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
