import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureScope: vi.fn(),
  getScope: vi.fn(),
  entityRepository: {
    read: vi.fn(async () => []),
    replace: vi.fn(async () => undefined),
  },
  customerTypeRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByNormalizedName: vi.fn(),
    listManaged: vi.fn(),
    listUsage: vi.fn(),
    update: vi.fn(),
  },
  supplierRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByNormalizedName: vi.fn(),
    listManaged: vi.fn(),
    listUsage: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: mocks.ensureScope,
}));
vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: mocks.getScope,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: vi.fn() }),
}));
vi.mock("@/lib/entity-prisma-repository", () => ({
  createEntityPrismaRepository: () => mocks.entityRepository,
}));
vi.mock("@/lib/supplier-category-prisma-repository", () => ({
  createSupplierCategoryPrismaRepository: () => mocks.supplierRepository,
}));
vi.mock("@/lib/customer-type-prisma-repository", () => ({
  createCustomerTypePrismaRepository: () => mocks.customerTypeRepository,
}));

import {
  createEntityRowAction,
  importEntityRowsAction,
} from "./entity-actions";

const scope = {
  companyId: "company",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period",
  periodLabel: "2026",
  tenantId: "tenant",
  tenantName: "Tenant",
  userId: "admin",
  userName: "Yönetici",
  userRole: "admin" as const,
};

describe("entity actions supplier category guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getScope.mockResolvedValue(scope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.supplierRepository.listManaged.mockResolvedValue([
      {
        companyId: scope.companyId,
        createdAt: "2026-07-31T00:00:00.000Z",
        createdBy: scope.userId,
        description: "",
        id: "inactive-service",
        lastMutationKey: null,
        name: "Hizmet",
        normalizedName: "hizmet",
        revisionNo: 1,
        status: "INACTIVE",
        tenantId: scope.tenantId,
        updatedAt: "2026-07-31T00:00:00.000Z",
        updatedBy: scope.userId,
      },
    ]);
    mocks.supplierRepository.listUsage.mockResolvedValue([]);
    mocks.customerTypeRepository.listManaged.mockResolvedValue([
      {
        companyId: scope.companyId,
        createdAt: "2026-07-31T00:00:00.000Z",
        createdBy: scope.userId,
        description: "",
        id: "inactive-customer-type",
        lastMutationKey: null,
        name: "Kamu",
        normalizedName: "kamu",
        revisionNo: 1,
        status: "INACTIVE",
        tenantId: scope.tenantId,
        updatedAt: "2026-07-31T00:00:00.000Z",
        updatedBy: scope.userId,
      },
    ]);
    mocks.customerTypeRepository.listUsage.mockResolvedValue([]);
  });

  it("rejects inactive and unknown customer types before writing", async () => {
    const createResult = await createEntityRowAction("musteriler", {
      balance: "0,00 TL",
      code: "MUS-0098",
      customerType: "Kamu",
      name: "Test Müşteri",
      status: "Aktif",
    });
    expect(createResult).toEqual({
      errors: ["Müşteri tipi aktif sözlükte bulunamadı: Kamu"],
      ok: false,
    });

    const importResult = await importEntityRowsAction("musteriler", [
      {
        balance: "0,00 TL",
        code: "MUS-0098",
        customerType: "Kamu",
        name: "Birinci Müşteri",
        status: "Aktif",
      },
      {
        balance: "0,00 TL",
        code: "MUS-0099",
        customerType: "Tanımsız",
        name: "İkinci Müşteri",
        status: "Aktif",
      },
    ]);
    expect(importResult).toEqual({
      errors: [
        "1. satır: Müşteri tipi aktif sözlükte bulunamadı: Kamu",
        "2. satır: Müşteri tipi aktif sözlükte bulunamadı: Tanımsız",
      ],
      ok: false,
    });
    expect(mocks.entityRepository.replace).not.toHaveBeenCalled();
  });

  it("rejects an inactive category before creating a supplier row", async () => {
    const result = await createEntityRowAction("tedarikciler", {
      balance: "0,00 TL",
      category: "Hizmet",
      code: "TED-0098",
      name: "Test Tedarikçi",
      status: "Aktif",
    });

    expect(result).toEqual({
      errors: ["Tedarikçi kategorisi aktif sözlükte bulunamadı: Hizmet"],
      ok: false,
    });
    expect(mocks.entityRepository.read).not.toHaveBeenCalled();
    expect(mocks.entityRepository.replace).not.toHaveBeenCalled();
  });

  it("identifies invalid supplier import rows without writing any row", async () => {
    const result = await importEntityRowsAction("tedarikciler", [
      {
        balance: "0,00 TL",
        category: "Hizmet",
        code: "TED-0098",
        name: "Birinci Tedarikçi",
        status: "Aktif",
      },
      {
        balance: "0,00 TL",
        category: "Tanımsız",
        code: "TED-0099",
        name: "İkinci Tedarikçi",
        status: "Aktif",
      },
    ]);

    expect(result).toEqual({
      errors: [
        "1. satır: Tedarikçi kategorisi aktif sözlükte bulunamadı: Hizmet",
        "2. satır: Tedarikçi kategorisi aktif sözlükte bulunamadı: Tanımsız",
      ],
      ok: false,
    });
    expect(mocks.entityRepository.replace).not.toHaveBeenCalled();
  });
});
