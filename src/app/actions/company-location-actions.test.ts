import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditRecord: vi.fn(),
  ensureScope: vi.fn(),
  getScope: vi.fn(),
  prisma: {},
  repository: {
    create: vi.fn(async (row) => row),
    find: vi.fn(),
    list: vi.fn(),
    listSites: vi.fn(),
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
vi.mock("@/lib/company-location-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/company-location-prisma-repository")
  >("@/lib/company-location-prisma-repository");
  return {
    ...actual,
    createCompanyLocationPrismaRepository: () => mocks.repository,
  };
});

import {
  listCompanyLocationsAction,
  saveCompanyLocationAction,
} from "./company-location-actions";

const scope = {
  companyId: "company-1",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "Tenant",
  userId: "admin-1",
  userName: "Yönetici",
  userRole: "admin" as const,
};

const values = {
  addressLine: "Atatürk Bulvarı No: 1",
  city: "Ankara",
  code: "MRK-01",
  district: "Çankaya",
  email: "merkez@example.com",
  expectedRevisionNo: 0,
  name: "Ana Merkez",
  phone: "+90 312 555 00 00",
  postalCode: "06550",
  requestKey: "location-action-1",
  responsiblePerson: "Ayşe Demir",
  status: "ACTIVE" as const,
  type: "HEADQUARTERS" as const,
};

describe("company location actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.repository.find.mockResolvedValue(null);
    mocks.repository.list.mockResolvedValue([]);
    mocks.repository.listSites.mockResolvedValue([]);
    mocks.auditRecord.mockResolvedValue(undefined);
  });

  test("lists the active tenant/company directory", async () => {
    await expect(listCompanyLocationsAction()).resolves.toEqual({
      data: { locations: [] },
      ok: true,
    });
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, scope);
  });

  test("saves in a closed period, redacts audit and revalidates settings", async () => {
    const result = await saveCompanyLocationAction(values);
    expect(result).toMatchObject({
      data: { location: { code: "MRK-01", revisionNo: 1 } },
      ok: true,
    });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain(values.email);
    expect(auditJson).not.toContain(values.phone);
    expect(auditJson).not.toContain(values.addressLine);
    expect(auditJson).not.toContain(values.responsiblePerson);
    expect(auditJson).not.toContain(values.requestKey);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ayarlar");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });
});
