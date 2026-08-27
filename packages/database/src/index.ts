import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export * from '@prisma/client';

/** One shared construction path for the Postgres driver adapter — apps/api and apps/worker both use this instead of hand-rolling it. */
export function createPrismaClient(options: { connectionString: string }): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: options.connectionString }) });
}
