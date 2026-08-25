import 'dotenv/config';
import { Redis } from 'ioredis';
import { loadEnv } from '@operant-event/config';

async function main() {
  const env = loadEnv();
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redis.on('error', (error) => {
    console.error('[worker] Redis connection error:', error);
  });

  await redis.connect();
  console.log('[worker] Redis connected. Worker ready — no queues registered yet.');

  const shutdown = async () => {
    console.log('[worker] Shutting down...');
    await redis.quit();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[worker] Fatal startup error:', error);
  process.exit(1);
});
