import type { PrismaClient } from "@prisma/client";
import { describe, expect, test, vi } from "vitest";

import { createEmployeeAdvancePrismaRepository } from "./employee-advance-prisma-repository";
import type { TenantScope } from "./tenant-scope";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
} as TenantScope;
const record = {
  approvedAmount: null,
  cancelRequestKey: null,
  cancelledAt: null,
  companyId: scope.companyId,
  createRequestKey: "user-1::create-1",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  createdBy: "user-1",
  financeApproveRequestKey: null,
  financeApprovedAt: null,
  financeRejectRequestKey: null,
  financeRejectedAt: null,
  id: "advance-1",
  lastUpdateKey: null,
  managerApproveRequestKey: null,
  managerApprovedAt: null,
  managerRejectRequestKey: null,
  managerRejectedAt: null,
  note: "Açıklama",
  paidAt: null,
  paymentAccountCode: null,
  paymentAccountName: null,
  paymentDate: null,
  paymentLedgerEntryId: null,
  paymentMovementId: null,
  paymentRequestKey: null,
  periodId: scope.periodId,
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestDate: new Date("2026-08-01T00:00:00.000Z"),
  requestedAmount: { toNumber: () => 7500 },
  revisionNo: 1,
  settledAmount: { toNumber: () => 0 },
  status: "DRAFT",
  submitRequestKey: null,
  submittedAt: null,
  tenantId: scope.tenantId,
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedBy: "user-1",
};

describe("employee advance prisma repository", () => {
  test("scopes list reads by tenant, company and period", async () => {
    const advanceFindMany = vi.fn(async () => [record]);
    const settlementFindMany = vi.fn(async () => []);
    const repository = createEmployeeAdvancePrismaRepository({
      employeeAdvanceRequest: { findMany: advanceFindMany },
      employeeAdvanceSettlement: { findMany: settlementFindMany },
    } as unknown as PrismaClient);
    const result = await repository.list({ scope });
    expect(result.advances[0]).toMatchObject({
      requestDate: "2026-08-01",
      requestedAmount: 7500,
      status: "DRAFT",
    });
    expect(advanceFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId: scope.companyId,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    }));
    expect(settlementFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        companyId: scope.companyId,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    }));
  });

  test("uses the same scope for id and create-key lookups", async () => {
    const findFirst = vi.fn(async () => record);
    const repository = createEmployeeAdvancePrismaRepository({
      employeeAdvanceRequest: { findFirst },
    } as unknown as PrismaClient);
    await repository.findById({ id: "advance-1", scope });
    await repository.findByCreateKey({
      createRequestKey: "user-1::create-1",
      scope,
    });
    expect(findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: scope.companyId,
        id: "advance-1",
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        companyId: scope.companyId,
        createRequestKey: "user-1::create-1",
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
  });
});
