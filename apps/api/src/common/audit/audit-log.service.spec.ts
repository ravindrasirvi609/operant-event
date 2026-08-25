import { AuditLogService } from './audit-log.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('AuditLogService', () => {
  it('writes the entry through prisma.auditLog.create', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const prisma = { auditLog: { create } } as unknown as PrismaService;
    const service = new AuditLogService(prisma);

    await service.record({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      action: 'CREATE',
      entityType: 'Conference',
      entityId: 'conf-1',
      newValues: { name: 'APTICON 2027' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        conferenceId: undefined,
        actorUserId: 'user-1',
        action: 'CREATE',
        entityType: 'Conference',
        entityId: 'conf-1',
        oldValues: undefined,
        newValues: { name: 'APTICON 2027' },
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  });
});
