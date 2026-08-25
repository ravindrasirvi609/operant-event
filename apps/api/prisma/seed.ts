import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadEnv } from '@operant-event/config';
import { PERMISSION_CATALOGUE, SYSTEM_ROLES } from '../src/common/permissions/permissions.catalogue';

/**
 * System roles have organizationId: null, and Postgres does not treat two
 * NULLs as equal even under a unique index — @@unique([organizationId, name])
 * on Role cannot dedupe these via prisma.role.upsert(). Look them up by
 * (organizationId: null, name) manually instead of relying on the DB
 * constraint for idempotency here.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

  try {
    const permissionIdByKey = new Map<string, string>();
    for (const permission of PERMISSION_CATALOGUE) {
      const record = await prisma.permission.upsert({
        where: { module_action: { module: permission.module, action: permission.action } },
        update: {},
        create: permission,
      });
      permissionIdByKey.set(`${permission.module}.${permission.action}`, record.id);
    }
    console.log(`Seeded ${permissionIdByKey.size} permissions.`);

    for (const roleDefinition of SYSTEM_ROLES) {
      const existing = await prisma.role.findFirst({
        where: { organizationId: null, name: roleDefinition.name },
      });

      const role =
        existing ??
        (await prisma.role.create({
          data: {
            organizationId: null,
            name: roleDefinition.name,
            description: roleDefinition.description,
            isSystem: true,
          },
        }));

      const permissionIds = roleDefinition.permissions.map((key) => {
        const id = permissionIdByKey.get(key);
        if (!id) {
          throw new Error(`Permission "${key}" referenced by role "${roleDefinition.name}" is not in the catalogue.`);
        }
        return id;
      });

      // Resync grants: remove any no longer in the definition, add any missing.
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: permissionIds } },
      });
      for (const permissionId of permissionIds) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
      }
      console.log(`Seeded system role "${roleDefinition.name}" with ${permissionIds.length} permissions.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});
