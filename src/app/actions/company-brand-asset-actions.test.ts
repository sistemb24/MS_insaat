import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditRecord: vi.fn(),
  ensureScope: vi.fn(),
  getScope: vi.fn(),
  prisma: {},
  repository: {
    create: vi.fn(async (row) => row),
    find: vi.fn(),
    update: vi.fn(async ({ row }) => row),
  },
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: mocks.ensureScope,
}));
vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: mocks.getScope,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: mocks.auditRecord }),
}));
vi.mock("@/lib/company-brand-asset-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/company-brand-asset-prisma-repository")
  >("@/lib/company-brand-asset-prisma-repository");
  return {
    ...actual,
    createCompanyBrandAssetPrismaRepository: () => mocks.repository,
  };
});

import {
  getCompanyBrandAssetAction,
  removeCompanyBrandAssetAction,
  uploadCompanyBrandAssetAction,
} from "./company-brand-asset-actions";

const scope = {
  companyId: "company-brand",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-brand",
  periodLabel: "2026",
  tenantId: "tenant-brand",
  tenantName: "Tenant",
  userId: "admin-brand",
  userName: "Yönetici",
  userRole: "admin" as const,
};

function createPngHeader() {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  bytes.set([0, 0, 0, 128], 16);
  bytes.set([0, 0, 0, 64], 20);
  return bytes;
}

describe("company brand asset actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.repository.find.mockResolvedValue(null);
    mocks.auditRecord.mockResolvedValue(undefined);
  });

  it("returns an empty company-scoped asset", async () => {
    await expect(getCompanyBrandAssetAction()).resolves.toMatchObject({
      data: { asset: { canManage: true, revisionNo: 0, source: "none" } },
      ok: true,
    });
  });

  it("uploads in a closed period, audits metadata only and revalidates consumers", async () => {
    const formData = new FormData();
    formData.set(
      "logo",
      new File([createPngHeader()], "firma-logo.png", { type: "image/png" }),
    );
    formData.set("expectedRevisionNo", "0");
    formData.set("requestKey", "brand-action-1");

    const result = await uploadCompanyBrandAssetAction(formData);
    expect(result).toMatchObject({
      data: { asset: { revisionNo: 1, source: "persisted" } },
      ok: true,
    });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain("brand-action-1");
    expect(auditJson).not.toContain("firma-logo.png");
    expect(auditJson).not.toContain("data:image");
    for (const path of ["/ayarlar", "/faturalar", "/hakedis"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  it("removes the active asset with optimistic revision", async () => {
    mocks.repository.find.mockResolvedValue({
      companyId: scope.companyId,
      content: createPngHeader(),
      createdAt: "2026-07-31T00:00:00.000Z",
      createdBy: scope.userId,
      height: 64,
      id: "brand-1",
      lastMutationKey: null,
      mimeType: "image/png",
      originalFileName: "logo.png",
      revisionNo: 1,
      sha256: "hash",
      sizeBytes: 24,
      status: "ACTIVE",
      tenantId: scope.tenantId,
      updatedAt: "2026-07-31T00:00:00.000Z",
      updatedBy: scope.userId,
      width: 128,
    });

    await expect(
      removeCompanyBrandAssetAction({
        expectedRevisionNo: 1,
        requestKey: "brand-remove-1",
      }),
    ).resolves.toMatchObject({
      data: { asset: { revisionNo: 2, source: "none" } },
      ok: true,
    });
  });
});
