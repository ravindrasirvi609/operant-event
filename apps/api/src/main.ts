import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@operant-event/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(env.PORT);
}
bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
