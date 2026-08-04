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
vi.mock("@/lib/finance-settings-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/finance-settings-prisma-repository")
  >("@/lib/finance-settings-prisma-repository");
  return {
    ...actual,
    createFinanceSettingsPrismaRepository: () => mocks.repository,
  };
});

import {
  getFinanceSettingsAction,
  saveFinanceSettingsAction,
} from "./finance-settings-actions";

const scope = {
  companyId: "company-finance",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-finance",
  periodLabel: "2026",
  tenantId: "tenant-finance",
  tenantName: "Tenant",
  userId: "admin-finance",
  userName: "Yönetici",
  userRole: "admin" as const,
};

describe("finance settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.repository.find.mockResolvedValue(null);
    mocks.auditRecord.mockResolvedValue(undefined);
  });

  it("returns the fallback from the active scope", async () => {
    await expect(getFinanceSettingsAction()).resolves.toMatchObject({
      data: { settings: { defaultVatRate: 20, source: "fallback" } },
      ok: true,
    });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, scope);
  });

  it("persists, audits safe metadata and revalidates every consumer route", async () => {
    const result = await saveFinanceSettingsAction({
      defaultVatRate: 18,
      expectedRevisionNo: 0,
      requestKey: "save-action-1",
      showVatBreakdown: false,
    });

    expect(result).toMatchObject({
      data: { settings: { defaultVatRate: 18, revisionNo: 1 } },
      ok: true,
    });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain("save-action-1");
    for (const path of ["/ayarlar", "/giderler", "/faturalar", "/hakedis"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });
});
