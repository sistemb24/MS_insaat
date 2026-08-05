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
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: mocks.getScope }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: mocks.auditRecord }),
}));
vi.mock("@/lib/supplier-category-prisma-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supplier-category-prisma-repository")>(
    "@/lib/supplier-category-prisma-repository",
  );
  return { ...actual, createSupplierCategoryPrismaRepository: () => mocks.repository };
});

import {
  changeSupplierCategoryStatusAction,
  listSupplierCategoriesAction,
  saveSupplierCategoryAction,
} from "./supplier-category-actions";

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

describe("supplier category actions", () => {
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

  it("lists company categories in a closed period", async () => {
    await expect(listSupplierCategoriesAction()).resolves.toEqual({
      data: { categories: [] },
      ok: true,
    });
  });

  it("creates with redacted audit and revalidates settings and suppliers", async () => {
    const values = {
      description: "Gizli açıklama",
      expectedRevisionNo: 0,
      name: "Malzeme",
      requestKey: "category-action-1",
    };
    const result = await saveSupplierCategoryAction(values);
    expect(result).toMatchObject({ data: { category: { name: "Malzeme", revisionNo: 1 } }, ok: true });
    const auditJson = JSON.stringify(mocks.auditRecord.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain(values.name);
    expect(auditJson).not.toContain(values.description);
    expect(auditJson).not.toContain(values.requestKey);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/ayarlar");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/tedarikciler");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  it("changes status with optimistic revision", async () => {
    mocks.repository.findById.mockResolvedValue({
      companyId: "company",
      createdAt: "2026-07-31T00:00:00.000Z",
      createdBy: "admin",
      description: "",
      id: "category-1",
      lastMutationKey: null,
      name: "Malzeme",
      normalizedName: "malzeme",
      revisionNo: 1,
      status: "ACTIVE",
      tenantId: "tenant",
      updatedAt: "2026-07-31T00:00:00.000Z",
      updatedBy: "admin",
    });
    await expect(changeSupplierCategoryStatusAction({
      expectedRevisionNo: 1,
      id: "category-1",
      requestKey: "status-1",
      status: "INACTIVE",
    })).resolves.toMatchObject({ data: { category: { revisionNo: 2, status: "INACTIVE" } }, ok: true });
  });
});
