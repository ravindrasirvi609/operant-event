import { Global, Module } from '@nestjs/common';
import { loadEnv, type Env } from '@operant-event/config';

export const ENV = Symbol('ENV');

/**
 * Wraps @operant-event/config's loadEnv() as a Nest provider so every
 * service reads config via constructor injection instead of calling
 * loadEnv()/process.env directly — the difference between a unit test
 * supplying a fake Env object and every test needing real env vars set.
 */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => loadEnv() }],
  exports: [ENV],
})
export class EnvModule {}
