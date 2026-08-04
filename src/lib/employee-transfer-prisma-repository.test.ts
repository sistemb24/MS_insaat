import { describe, expect, test, vi } from "vitest";

import {
  EmployeeTransferRepositoryError,
  createEmployeeTransferPrismaRepository,
  type EmployeeTransferPrismaClientLike,
  type EmployeeTransferRow,
} from "./employee-transfer-prisma-repository";
import type { TenantScope } from "./tenant-scope";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
} as TenantScope;

const transfer: EmployeeTransferRow = {
  approveRequestKey: null,
  approvedAt: null,
  companyId: scope.companyId,
  createRequestKey: "user-admin::create-1",
  createdAt: "2026-07-30T10:00:00.000Z",
  createdBy: "user-admin",
  effectiveDate: "2026-07-30",
  id: "transfer-1",
  lastUpdateKey: null,
  note: "Saha planlaması",
  periodId: scope.periodId,
  personnelCode: "PER-0003",
  personnelName: "Hasan Çelik",
  rejectRequestKey: null,
  rejectedAt: null,
  revisionNo: 1,
  sourceSiteCode: "SAN-0001",
  sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
  status: "DRAFT",
  submitRequestKey: null,
  submittedAt: null,
  targetSiteCode: "SAN-0002",
  targetSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
  tenantId: scope.tenantId,
  updatedAt: "2026-07-30T10:00:00.000Z",
  updatedBy: "user-admin",
};

function transferRecord(row = transfer) {
  return {
    ...row,
    approvedAt: row.approvedAt ? new Date(row.approvedAt) : null,
    createdAt: new Date(row.createdAt),
    effectiveDate: new Date(`${row.effectiveDate}T00:00:00.000Z`),
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt) : null,
    submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
    updatedAt: new Date(row.updatedAt),
  };
}

describe("employee transfer prisma repository", () => {
  test("scopes deterministic list and personnel history reads", async () => {
    const findMany = vi.fn().mockResolvedValue([transferRecord()]);
    const repository = createEmployeeTransferPrismaRepository({
      employeeTransfer: { findMany },
    } as unknown as EmployeeTransferPrismaClientLike);

    expect((await repository.list({ scope }))[0]).toMatchObject({
      effectiveDate: "2026-07-30",
      id: transfer.id,
      status: "DRAFT",
    });
    await repository.listPersonnelTransfers({
      personnelCode: transfer.personnelCode,
      scope,
    });

    expect(findMany).toHaveBeenNthCalledWith(1, {
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      where: {
        companyId: scope.companyId,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
    expect(findMany.mock.calls[1]?.[0].where).toEqual({
      companyId: scope.companyId,
      periodId: scope.periodId,
      personnelCode: transfer.personnelCode,
      tenantId: scope.tenantId,
    });
  });

  test("uses the same scope for id and create-key lookups", async () => {
    const findFirst = vi.fn().mockResolvedValue(transferRecord());
    const repository = createEmployeeTransferPrismaRepository({
      employeeTransfer: { findFirst },
    } as unknown as EmployeeTransferPrismaClientLike);
    await repository.findById({ id: transfer.id, scope });
    await repository.findByCreateKey({
      createRequestKey: transfer.createRequestKey,
      scope,
    });
    expect(findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: scope.companyId,
        id: transfer.id,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        companyId: scope.companyId,
        createRequestKey: transfer.createRequestKey,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
  });

  test("uses optimistic scope, status and revision for draft updates", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue(transferRecord({
      ...transfer,
      revisionNo: 2,
    }));
    const repository = createEmployeeTransferPrismaRepository({
      employeeTransfer: { findFirst, updateMany },
    } as unknown as EmployeeTransferPrismaClientLike);
    await repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...transfer, revisionNo: 2 },
    });
    expect(updateMany.mock.calls[0]?.[0].where).toEqual({
      companyId: scope.companyId,
      id: transfer.id,
      periodId: scope.periodId,
      revisionNo: 1,
      status: "DRAFT",
      tenantId: scope.tenantId,
    });
  });

  test("fails closed when an optimistic transfer update matches no row", async () => {
    const repository = createEmployeeTransferPrismaRepository({
      employeeTransfer: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as EmployeeTransferPrismaClientLike);
    await expect(repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...transfer, revisionNo: 2 },
    })).rejects.toThrow("beklenen durumda veya revizyonda");
  });

  test("approves transfer and updates only personnel site in one transaction", async () => {
    const personnelUpdatedAt = "2026-07-30T09:00:00.000Z";
    const transferUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const entityUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const approved = {
      ...transfer,
      approveRequestKey: "transfer-1::user-admin::approve::approve-1",
      approvedAt: "2026-07-30T11:00:00.000Z",
      revisionNo: 3,
      status: "APPROVED" as const,
      updatedAt: "2026-07-30T11:00:00.000Z",
    };
    const tx = {
      employeeTransfer: {
        findFirst: vi.fn().mockResolvedValue(transferRecord(approved)),
        updateMany: transferUpdateMany,
      },
      entityRecord: {
        findFirst: vi.fn().mockResolvedValue({
          code: transfer.personnelCode,
          companyId: scope.companyId,
          data: {
            code: transfer.personnelCode,
            name: transfer.personnelName,
            role: "Saha Mühendisi",
            site: transfer.sourceSiteName,
            status: "Aktif",
          },
          id: "entity-personnel-1",
          periodId: scope.periodId,
          slug: "personel",
          tenantId: scope.tenantId,
          updatedAt: new Date(personnelUpdatedAt),
          updatedBy: "user-admin",
        }),
        updateMany: entityUpdateMany,
      },
    };
    const repository = createEmployeeTransferPrismaRepository({
      ...tx,
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as unknown as EmployeeTransferPrismaClientLike);

    const result = await repository.approve({
      expectedPersonnelUpdatedAt: personnelUpdatedAt,
      expectedRevisionNo: 2,
      row: approved,
    });

    expect(result.personnel).toEqual({
      code: transfer.personnelCode,
      site: transfer.targetSiteName,
      updatedAt: approved.updatedAt,
    });
    expect(transferUpdateMany.mock.calls[0]?.[0].where).toMatchObject({
      id: transfer.id,
      revisionNo: 2,
      status: "SUBMITTED",
    });
    expect(entityUpdateMany.mock.calls[0]?.[0]).toEqual({
      data: {
        data: {
          code: transfer.personnelCode,
          name: transfer.personnelName,
          role: "Saha Mühendisi",
          site: transfer.targetSiteName,
          status: "Aktif",
        },
        updatedAt: new Date(approved.updatedAt),
        updatedBy: "user-admin",
      },
      where: {
        code: transfer.personnelCode,
        companyId: scope.companyId,
        id: "entity-personnel-1",
        periodId: scope.periodId,
        slug: "personel",
        tenantId: scope.tenantId,
        updatedAt: new Date(personnelUpdatedAt),
      },
    });
  });

  test("rejects stale or source-mismatched personnel without touching transfer", async () => {
    const transferUpdateMany = vi.fn();
    const tx = {
      employeeTransfer: { updateMany: transferUpdateMany },
      entityRecord: {
        findFirst: vi.fn().mockResolvedValue({
          code: transfer.personnelCode,
          companyId: scope.companyId,
          data: { site: "Başka Şantiye" },
          id: "entity-personnel-1",
          periodId: scope.periodId,
          slug: "personel",
          tenantId: scope.tenantId,
          updatedAt: new Date("2026-07-30T09:00:00.000Z"),
          updatedBy: "user-admin",
        }),
      },
    };
    const repository = createEmployeeTransferPrismaRepository({
      ...tx,
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as unknown as EmployeeTransferPrismaClientLike);

    await expect(repository.approve({
      expectedPersonnelUpdatedAt: "2026-07-30T09:00:00.000Z",
      expectedRevisionNo: 2,
      row: {
        ...transfer,
        revisionNo: 3,
        status: "APPROVED",
      },
    })).rejects.toThrow(EmployeeTransferRepositoryError);
    expect(transferUpdateMany).not.toHaveBeenCalled();
  });

  test("fails the approval transaction when personnel changes after its read", async () => {
    const personnelUpdatedAt = "2026-07-30T09:00:00.000Z";
    const transferUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      employeeTransfer: {
        updateMany: transferUpdateMany,
      },
      entityRecord: {
        findFirst: vi.fn().mockResolvedValue({
          code: transfer.personnelCode,
          companyId: scope.companyId,
          data: { site: transfer.sourceSiteName },
          id: "entity-personnel-1",
          periodId: scope.periodId,
          slug: "personel",
          tenantId: scope.tenantId,
          updatedAt: new Date(personnelUpdatedAt),
          updatedBy: "user-admin",
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const repository = createEmployeeTransferPrismaRepository({
      ...tx,
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as unknown as EmployeeTransferPrismaClientLike);

    await expect(repository.approve({
      expectedPersonnelUpdatedAt: personnelUpdatedAt,
      expectedRevisionNo: 2,
      row: {
        ...transfer,
        approvedAt: "2026-07-30T11:00:00.000Z",
        revisionNo: 3,
        status: "APPROVED",
        updatedAt: "2026-07-30T11:00:00.000Z",
      },
    })).rejects.toThrow("beklenen sürümde");
    expect(transferUpdateMany).toHaveBeenCalledOnce();
  });
});
