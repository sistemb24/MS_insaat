import { describe, expect, test, vi } from "vitest";

import {
  asProductionScopeBootstrapPrismaClient,
  createProductionScopeBootstrapPrismaRepository,
  type ProductionScopeBootstrapPrismaClientLike,
} from "./production-scope-bootstrap-prisma-repository";
import {
  ProductionScopeBootstrapError,
  readProductionScopeBootstrapConfig,
} from "./production-scope-bootstrap";

const sha = "665135fa518fe17b7dbea38a2cb122ed947e0564";

function command() {
  return readProductionScopeBootstrapConfig({
    DATABASE_URL: "postgresql://bootstrap:secret@db.example.com/noa",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: sha,
    NOA_EXPECTED_RELEASE_SHA: sha,
    NOA_PRODUCTION_SCOPE_ADMIN_NAME: "Production Bootstrap Admin",
    NOA_PRODUCTION_SCOPE_ADMIN_USER_ID: "user-production-bootstrap",
    NOA_PRODUCTION_SCOPE_BOOTSTRAP_CONFIRMATION: "production-scope-bootstrap",
    NOA_PRODUCTION_SCOPE_COMPANY_ID: "company-ms-insaat",
    NOA_PRODUCTION_SCOPE_COMPANY_NAME: "MS İnşaat",
    NOA_PRODUCTION_SCOPE_PERIOD_ENDS_ON: "2026-12-31",
    NOA_PRODUCTION_SCOPE_PERIOD_ID: "period-ms-insaat-2026",
    NOA_PRODUCTION_SCOPE_PERIOD_LABEL: "2026",
    NOA_PRODUCTION_SCOPE_PERIOD_STARTS_ON: "2026-01-01",
    NOA_PRODUCTION_SCOPE_TENANT_ID: "tenant-ms-insaat",
    NOA_RELEASE_ID: sha,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
  });
}

function transaction(overrides: Record<string, unknown> = {}) {
  const manifest = command().manifest;
  const tx = {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([{ read_only: "off" }])
      .mockResolvedValueOnce([{}]),
    appUser: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    appUserScopeAccess: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    company: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    period: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ lifecycleStatus: "ACTIVE" }),
    },
    ...overrides,
  };
  return { manifest, tx };
}

function client(tx: ReturnType<typeof transaction>["tx"]) {
  return {
    $transaction: vi.fn(async (callback) => callback(tx)),
  } as unknown as ProductionScopeBootstrapPrismaClientLike;
}

describe("production scope bootstrap Prisma repository", () => {
  test("creates only company, open period, user, admin access and audit atomically", async () => {
    const { tx } = transaction();
    const prisma = client(tx);
    const repository = createProductionScopeBootstrapPrismaRepository(
      prisma,
      () => new Date("2026-08-14T08:00:00.000Z"),
    );

    await expect(repository.execute(command())).resolves.toMatchObject({
      manifestChecksum: command().manifest.manifestChecksum,
      status: "CREATED",
      version: "production-scope-bootstrap-v1",
    });
    expect(tx.company.create).toHaveBeenCalledWith({
      data: {
        id: "company-ms-insaat",
        name: "MS İnşaat",
        tenantId: "tenant-ms-insaat",
      },
    });
    expect(tx.period.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-ms-insaat",
        id: "period-ms-insaat-2026",
        isClosed: false,
        tenantId: "tenant-ms-insaat",
      }),
    });
    expect(tx.appUser.create).toHaveBeenCalledWith({
      data: {
        email: null,
        id: "user-production-bootstrap",
        name: "Production Bootstrap Admin",
        tenantId: "tenant-ms-insaat",
      },
    });
    expect(tx.appUserScopeAccess.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isActive: true,
        isDefault: true,
        licenseLabel: "Production",
        role: "admin",
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "production-scope.bootstrap",
        actorUserId: "user-production-bootstrap",
        entityType: "production-scope",
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 120_000,
    });
  });

  test("returns unchanged only when all rows and audit match the exact manifest", async () => {
    const desired = command().manifest;
    const { tx } = transaction();
    tx.company.findUnique.mockResolvedValue({
      id: desired.company.companyId,
      name: desired.company.name,
      tenantId: desired.tenantId,
    });
    tx.period.findUnique.mockResolvedValue({
      companyId: desired.company.companyId,
      endsAt: new Date(desired.period.endsAt),
      id: desired.period.periodId,
      isClosed: false,
      label: desired.period.label,
      startsAt: new Date(desired.period.startsAt),
      tenantId: desired.tenantId,
    });
    tx.appUser.findUnique.mockResolvedValue({
      email: "later-onboarding@example.com",
      id: desired.admin.userId,
      name: desired.admin.name,
      tenantId: desired.tenantId,
    });
    tx.appUserScopeAccess.findFirst.mockResolvedValue({
      companyId: desired.company.companyId,
      id: "existing-access",
      isActive: true,
      isDefault: true,
      licenseLabel: desired.licenseLabel,
      periodId: desired.period.periodId,
      role: "admin",
      tenantId: desired.tenantId,
      userId: desired.admin.userId,
    });
    tx.auditLog.findFirst.mockResolvedValue({
      id: "audit-1",
      metadata: {
        manifestChecksum: desired.manifestChecksum,
        version: desired.version,
      },
    });

    const repository = createProductionScopeBootstrapPrismaRepository(client(tx));
    await expect(repository.execute(command())).resolves.toMatchObject({
      status: "UNCHANGED",
    });
    expect(tx.company.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  test("fails closed on partial state without creating missing rows", async () => {
    const { tx } = transaction();
    tx.company.findUnique.mockResolvedValue({
      id: "company-ms-insaat",
      name: "MS İnşaat",
      tenantId: "tenant-ms-insaat",
    });
    const repository = createProductionScopeBootstrapPrismaRepository(client(tx));

    await expect(repository.execute(command())).rejects.toMatchObject({
      reasonCode: "PARTIAL_SCOPE_STATE",
    });
    expect(tx.period.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  test("fails closed when exact rows drift from the manifest", async () => {
    const desired = command().manifest;
    const { tx } = transaction();
    tx.company.findUnique.mockResolvedValue({
      id: desired.company.companyId,
      name: "Başka Şirket",
      tenantId: desired.tenantId,
    });
    tx.period.findUnique.mockResolvedValue({
      companyId: desired.company.companyId,
      endsAt: new Date(desired.period.endsAt),
      id: desired.period.periodId,
      isClosed: false,
      label: desired.period.label,
      startsAt: new Date(desired.period.startsAt),
      tenantId: desired.tenantId,
    });
    tx.appUser.findUnique.mockResolvedValue({
      email: null,
      id: desired.admin.userId,
      name: desired.admin.name,
      tenantId: desired.tenantId,
    });
    tx.appUserScopeAccess.findFirst.mockResolvedValue({
      companyId: desired.company.companyId,
      id: "access",
      isActive: true,
      isDefault: true,
      licenseLabel: desired.licenseLabel,
      periodId: desired.period.periodId,
      role: "admin",
      tenantId: desired.tenantId,
      userId: desired.admin.userId,
    });
    tx.auditLog.findFirst.mockResolvedValue({
      id: "audit",
      metadata: { manifestChecksum: desired.manifestChecksum, version: desired.version },
    });

    await expect(
      createProductionScopeBootstrapPrismaRepository(client(tx)).execute(command()),
    ).rejects.toMatchObject({ reasonCode: "SCOPE_CONFLICT" });
  });

  test.each([
    [null, "ACTIVE_TENANT_REQUIRED"],
    [{ lifecycleStatus: "FROZEN" }, "ACTIVE_TENANT_REQUIRED"],
  ])("requires an active existing tenant", async (tenant, reasonCode) => {
    const { tx } = transaction();
    tx.tenant.findUnique.mockResolvedValue(tenant);
    await expect(
      createProductionScopeBootstrapPrismaRepository(client(tx)).execute(command()),
    ).rejects.toMatchObject({ reasonCode });
    expect(tx.company.create).not.toHaveBeenCalled();
  });

  test("requires a writable transaction before scope reads", async () => {
    const { tx } = transaction();
    tx.$queryRaw.mockReset().mockResolvedValue([{ read_only: "on" }]);
    await expect(
      createProductionScopeBootstrapPrismaRepository(client(tx)).execute(command()),
    ).rejects.toMatchObject({ reasonCode: "DATABASE_NOT_WRITABLE" });
    expect(tx.tenant.findUnique).not.toHaveBeenCalled();
  });

  test("turns audit failure into a typed error so the transaction rolls back", async () => {
    const { tx } = transaction();
    tx.auditLog.create.mockRejectedValue(new Error("forced audit failure"));
    await expect(
      createProductionScopeBootstrapPrismaRepository(client(tx)).execute(command()),
    ).rejects.toEqual(expect.objectContaining({
      message: expect.stringContaining("forced audit failure"),
      reasonCode: "AUDIT_WRITE_FAILED",
    } satisfies Partial<ProductionScopeBootstrapError>));
  });
});

test("Prisma adapter preserves the client identity", () => {
  const prisma = {} as Parameters<typeof asProductionScopeBootstrapPrismaClient>[0];
  expect(asProductionScopeBootstrapPrismaClient(prisma)).toBe(prisma);
});
