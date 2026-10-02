/**
 * Guard-chain integration test for POST /organizations.
 *
 * This is intentionally NOT a service unit test — the goal is to verify that
 * the actual NestJS request pipeline (controller routing → JwtAuthGuard →
 * SuperAdminGuard → ValidationPipe → handler) enforces "only Super Admin can
 * create an organization" end-to-end, without needing a real database or a
 * real JWT secret.
 *
 * Approach:
 *  - Boot a minimal TestingModule with the real OrganizationsController and
 *    the real SuperAdminGuard (the thing under test).
 *  - Replace JwtAuthGuard with a stub that sets request.user from a test
 *    header, so we control auth state without a Passport strategy.
 *  - Provide a jest-mock PrismaService so we can control isSuperAdmin per test.
 *  - Provide a jest-mock OrganizationsService so service logic is not executed.
 *  - Send real HTTP requests via supertest and assert the HTTP status code.
 */

import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

// ── Stub JwtAuthGuard ──────────────────────────────────────────────────────
// Reads `x-test-user-id` from the request header.  Throws UnauthorizedException
// (→ 401) when absent, mimicking what the real Passport guard does with a
// missing/invalid token.  When present, populates request.user so that the
// real SuperAdminGuard can proceed to its DB check.
class StubJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const userId = req.headers['x-test-user-id'];
    if (!userId) {
      throw new UnauthorizedException('No authentication token provided.');
    }
    req.user = { id: userId, email: 'test@example.com' };
    return true;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Valid DTO that passes the CreateOrganizationDto validation rules. */
const VALID_DTO = {
  name: 'Test Conference Society',
  ownerEmail: 'owner@example.com',
  ownerFirstName: 'Alice',
  ownerLastName: 'Owner',
};

/** Stub org returned by the mocked OrganizationsService.create(). */
const STUB_ORG = { id: 'org-1', name: 'Test Conference Society', slug: 'test-conference-society' };

// ── Test suite ─────────────────────────────────────────────────────────────

describe('POST /api/v1/organizations — guard chain', () => {
  let app: INestApplication<App>;
  let prismaUserFindUnique: jest.Mock;
  let orgsServiceCreate: jest.Mock;

  beforeEach(async () => {
    prismaUserFindUnique = jest.fn();
    orgsServiceCreate = jest.fn().mockResolvedValue(STUB_ORG);

    // Minimal mock PrismaService — SuperAdminGuard only calls user.findUnique.
    // Use PrismaService as the class token (not a string) so NestJS can resolve
    // it when instantiating SuperAdminGuard via its constructor injection.
    const mockPrisma = {
      user: { findUnique: prismaUserFindUnique },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: { create: orgsServiceCreate } },
        { provide: PrismaService, useValue: mockPrisma },
        SuperAdminGuard,  // ← real guard under test; injected with the mock above
      ],
    })
      // Replace JwtAuthGuard everywhere in this module with our stub.
      .overrideGuard(JwtAuthGuard)
      .useClass(StubJwtGuard)
      .compile();

    app = module.createNestApplication();
    // Mirror the global prefix and ValidationPipe applied in main.ts.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  // ── Unauthenticated ──────────────────────────────────────────────────────

  it('returns 401 when no authentication header is present', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send(VALID_DTO);
    expect(res.status).toBe(401);
    // SuperAdminGuard DB check must NOT have run — no DB call should be made.
    expect(prismaUserFindUnique).not.toHaveBeenCalled();
  });

  // ── Authenticated but not Super Admin ────────────────────────────────────

  it('returns 403 when the authenticated user has isSuperAdmin = false', async () => {
    prismaUserFindUnique.mockResolvedValue({ isSuperAdmin: false });
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'regular-user-id')
      .send(VALID_DTO);
    expect(res.status).toBe(403);
    expect(orgsServiceCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the user record is not found in the database (null)', async () => {
    prismaUserFindUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'ghost-user-id')
      .send(VALID_DTO);
    expect(res.status).toBe(403);
    expect(orgsServiceCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the user record has isSuperAdmin = null', async () => {
    prismaUserFindUnique.mockResolvedValue({ isSuperAdmin: null });
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'user-with-null-flag')
      .send(VALID_DTO);
    expect(res.status).toBe(403);
    expect(orgsServiceCreate).not.toHaveBeenCalled();
  });

  // ── Super Admin — validation boundary ────────────────────────────────────

  it('returns 400 when Super Admin sends a body that is missing required owner fields', async () => {
    prismaUserFindUnique.mockResolvedValue({ isSuperAdmin: true });
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'super-admin-id')
      .send({ name: 'No Owner Fields Here' });  // ownerEmail/First/Last omitted
    expect(res.status).toBe(400);
    expect(orgsServiceCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when Super Admin sends an invalid ownerEmail', async () => {
    prismaUserFindUnique.mockResolvedValue({ isSuperAdmin: true });
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'super-admin-id')
      .send({ ...VALID_DTO, ownerEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(orgsServiceCreate).not.toHaveBeenCalled();
  });

  // ── Super Admin — happy path ──────────────────────────────────────────────

  it('returns 201 and calls OrganizationsService.create when Super Admin sends a valid body', async () => {
    prismaUserFindUnique.mockResolvedValue({ isSuperAdmin: true });
    const res = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('x-test-user-id', 'super-admin-id')
      .send(VALID_DTO);
    expect(res.status).toBe(201);
    expect(orgsServiceCreate).toHaveBeenCalledTimes(1);
    expect(orgsServiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Conference Society',
        ownerEmail: 'owner@example.com',
        ownerFirstName: 'Alice',
        ownerLastName: 'Owner',
      }),
    );
  });
});
