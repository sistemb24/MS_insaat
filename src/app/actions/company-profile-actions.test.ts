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
vi.mock("@/lib/company-profile-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/company-profile-prisma-repository")
  >("@/lib/company-profile-prisma-repository");
  return {
    ...actual,
    createCompanyProfilePrismaRepository: () => mocks.repository,
  };
});

import {
  getCompanyProfileAction,
  saveCompanyProfileAction,
} from "./company-profile-actions";

const scope = {
  companyId: "company-profile",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-profile",
  periodLabel: "2026",
  tenantId: "tenant-profile",
  tenantName: "Tenant",
  userId: "admin-profile",
  userName: "Yönetici",
  userRole: "admin" as const,
};

const values = {
  addressLine: "Atatürk Cad. No: 10",
  city: "İstanbul",
  district: "Kadıköy",
  email: "bilgi@ornek.com",
  expectedRevisionNo: 0,
  legalName: "Örnek İnşaat A.Ş.",
  mersisNumber: "0123456789012345",
  phone: "+90 212 555 00 00",
  postalCode: "34710",
  requestKey: "profile-action-1",
  taxNumber: "1234567890",
  taxOffice: "Kadıköy",
};

describe("company profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.repository.find.mockResolvedValue(null);
    mocks.auditRecord.mockResolvedValue(undefined);
  });

  it("returns company-name fallback from active scope", async () => {
    await expect(getCompanyProfileAction()).resolves.toMatchObject({
      data: { profile: { legalName: "Şirket", source: "fallback" } },
      ok: true,
    });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, scope);
  });

  it("persists in a closed period, audits no values and revalidates consumers", async () => {
    const result = await saveCompanyProfileAction(values);
    expect(result).toMatchObject({
      data: { profile: { legalName: values.legalName, revisionNo: 1 } },
      ok: true,
    });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain(values.taxNumber);
    expect(auditJson).not.toContain(values.email);
    expect(auditJson).not.toContain(values.requestKey);
    for (const path of ["/ayarlar", "/faturalar", "/hakedis"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });
});
