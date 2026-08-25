"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const config_1 = require("@operant-event/config");
const permissions_catalogue_1 = require("../src/common/permissions/permissions.catalogue");
async function main() {
    const env = (0, config_1.loadEnv)();
    const prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg({ connectionString: env.DATABASE_URL }) });
    try {
        const permissionIdByKey = new Map();
        for (const permission of permissions_catalogue_1.PERMISSION_CATALOGUE) {
            const record = await prisma.permission.upsert({
                where: { module_action: { module: permission.module, action: permission.action } },
                update: {},
                create: permission,
            });
            permissionIdByKey.set(`${permission.module}.${permission.action}`, record.id);
        }
        console.log(`Seeded ${permissionIdByKey.size} permissions.`);
        for (const roleDefinition of permissions_catalogue_1.SYSTEM_ROLES) {
            const existing = await prisma.role.findFirst({
                where: { organizationId: null, name: roleDefinition.name },
            });
            const role = existing ??
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
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=seed.js.map