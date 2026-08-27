import { createPrismaClient } from '@operant-event/database';
import { loadEnv } from '@operant-event/config';

const env = loadEnv();

export const prisma = createPrismaClient({ connectionString: env.DATABASE_URL });
