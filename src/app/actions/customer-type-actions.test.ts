import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditRecord: vi.fn(),
  ensureScope: vi.fn(),
  getScope: vi.fn(),
  prisma: {},
  repository: {
    create: vi.fn(async (row) => row),
    findById: vi.fn(),
    findByNormalizedName: vi.fn(),
    listManaged: vi.fn(),
    listUsage: vi.fn(),
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
vi.mock("@/lib/customer-type-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/customer-type-prisma-repository")
  >("@/lib/customer-type-prisma-repository");
  return {
    ...actual,
    createCustomerTypePrismaRepository: () => mocks.repository,
  };
});

import {
  changeCustomerTypeStatusAction,
  listCustomerTypesAction,
  saveCustomerTypeAction,
} from "./customer-type-actions";

const scope = {
  companyId: "company",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: true,
  periodId: "period",
  periodLabel: "2026",
  tenantId: "tenant",
  tenantName: "Tenant",
  userId: "admin",
  userName: "Yönetici",
  userRole: "admin" as const,
};

describe("customer type actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.repository.findById.mockResolvedValue(null);
    mocks.repository.findByNormalizedName.mockResolvedValue(null);
    mocks.repository.listManaged.mockResolvedValue([]);
    mocks.repository.listUsage.mockResolvedValue([]);
    mocks.auditRecord.mockResolvedValue(undefined);
  });

  it("lists company customer types in a closed period", async () => {
    await expect(listCustomerTypesAction()).resolves.toEqual({
      data: { customerTypes: [] },
      ok: true,
    });
  });

  it("creates with redacted audit and revalidates settings and customers", async () => {
    const values = {
      description: "Gizli açıklama",
      expectedRevisionNo: 0,
      name: "Kurumsal",
      requestKey: "customer-type-action-1",
    };
    const result = await saveCustomerTypeAction(values);
    expect(result).toMatchObject({
      data: { customerType: { name: "Kurumsal", revisionNo: 1 } },
      ok: true,
    });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain(values.name);
    expect(auditJson).not.toContain(values.description);
    expect(auditJson).not.toContain(values.requestKey);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ayarlar");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/musteriler");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  it("changes status with optimistic revision", async () => {
    mocks.repository.findById.mockResolvedValue({
      companyId: "company",
      createdAt: "2026-07-31T00:00:00.000Z",
      createdBy: "admin",
      description: "",
      id: "type-1",
      lastMutationKey: null,
      name: "Kurumsal",
      normalizedName: "kurumsal",
      revisionNo: 1,
      status: "ACTIVE",
      tenantId: "tenant",
      updatedAt: "2026-07-31T00:00:00.000Z",
      updatedBy: "admin",
    });
    await expect(changeCustomerTypeStatusAction({
      expectedRevisionNo: 1,
      id: "type-1",
      requestKey: "status-1",
      status: "INACTIVE",
    })).resolves.toMatchObject({
      data: { customerType: { revisionNo: 2, status: "INACTIVE" } },
      ok: true,
    });
  });
});
