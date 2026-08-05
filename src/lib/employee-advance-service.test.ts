import { describe, expect, test, vi } from "vitest";

import {
  createEmployeeAdvanceService,
  type EmployeeAdvancePaymentInput,
} from "./employee-advance-service";
import type {
  EmployeeAdvanceRepository,
  EmployeeAdvanceRow,
  EmployeeAdvanceSettlementRow,
} from "./employee-advance-prisma-repository";
import type { TenantScope } from "./tenant-scope";

const adminScope: TenantScope = {
  companyId: "company-1",
  companyName: "NOA İnşaat",
  licenseLabel: "Pro",
  periodClosed: false,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "NOA",
  userId: "user-admin",
  userName: "Yönetici",
  userRole: "admin",
};
const accountingScope: TenantScope = {
  ...adminScope,
  userId: "user-accounting",
  userRole: "accounting",
};

function setup() {
  const advances: EmployeeAdvanceRow[] = [];
  const settlements: EmployeeAdvanceSettlementRow[] = [];
  const repository: EmployeeAdvanceRepository = {
    create: vi.fn(async (row) => {
      advances.push(row);
      return row;
    }),
    findByCreateKey: vi.fn(async ({ createRequestKey, scope }) =>
      advances.find((row) =>
        row.createRequestKey === createRequestKey
        && row.tenantId === scope.tenantId
        && row.companyId === scope.companyId
        && row.periodId === scope.periodId,
      ) ?? null),
    findById: vi.fn(async ({ id, scope }) =>
      advances.find((row) =>
        row.id === id
        && row.tenantId === scope.tenantId
        && row.companyId === scope.companyId
        && row.periodId === scope.periodId,
      ) ?? null),
    findSettlementByKey: vi.fn(async ({ mutationRequestKey, scope }) =>
      settlements.find((row) =>
        row.mutationRequestKey === mutationRequestKey
        && row.tenantId === scope.tenantId,
      ) ?? null),
    list: vi.fn(async () => ({ advances, settlements })),
    listPayrollDeductions: vi.fn(async () => [{
      allocatedAmount: settlements.reduce((sum, row) => sum + row.amount, 0),
      availableAmount: 3000 - settlements.reduce((sum, row) => sum + row.amount, 0),
      documentNo: "BRD-2026-08",
      payrollAccrualId: "payroll-1",
      personnelCode: "PER-0001",
      personnelName: "Ayşe Demir",
    }]),
    pay: vi.fn(async ({ row }) => {
      const index = advances.findIndex((item) => item.id === row.id);
      const paid = {
        ...row,
        paymentLedgerEntryId: "ledger-1",
        paymentMovementId: "movement-1",
      };
      advances[index] = paid;
      return paid;
    }),
    settle: vi.fn(async ({ row, settlement }) => {
      const index = advances.findIndex((item) => item.id === row.id);
      advances[index] = row;
      settlements.push(settlement);
      return { advance: row, settlement };
    }),
    transition: vi.fn(async ({ row }) => {
      const index = advances.findIndex((item) => item.id === row.id);
      advances[index] = row;
      return row;
    }),
    updateDraft: vi.fn(async ({ row }) => {
      const index = advances.findIndex((item) => item.id === row.id);
      advances[index] = row;
      return row;
    }),
  };
  const auditRows: Array<{ metadata?: Record<string, unknown> }> = [];
  let id = 0;
  const service = createEmployeeAdvanceService({
    auditLogRepository: {
      record: vi.fn(async (entry) => {
        auditRows.push(entry);
      }),
    },
    createId: (_scope, entity) => `${entity}-${++id}`,
    now: () => "2026-08-01T10:00:00.000Z",
    repository,
  });
  return { advances, auditRows, repository, service, settlements };
}

async function createAndSubmit(
  service: ReturnType<typeof createEmployeeAdvanceService>,
) {
  const created = await service.create({
    scope: adminScope,
    values: {
      note: "Okul masrafı",
      personnelCode: "PER-0001",
      personnelName: "Ayşe Demir",
      requestDate: "2026-08-01",
      requestedAmount: 7500,
      requestKey: "create-1",
    },
  });
  if (!created.ok) throw new Error(created.errors.join(" "));
  const submitted = await service.submit({
    advanceId: created.data.advance.id,
    requestKey: "submit-1",
    scope: adminScope,
  });
  if (!submitted.ok) throw new Error(submitted.errors.join(" "));
  return submitted.data.advance;
}

describe("employee advance service", () => {
  test("runs manager and finance approval with strict role separation", async () => {
    const { service } = setup();
    const submitted = await createAndSubmit(service);
    const unauthorized = await service.managerApprove({
      advanceId: submitted.id,
      requestKey: "manager-1",
      scope: accountingScope,
    });
    expect(unauthorized.ok).toBe(false);
    const managed = await service.managerApprove({
      advanceId: submitted.id,
      requestKey: "manager-1",
      scope: adminScope,
    });
    expect(managed.ok && managed.data.advance.status).toBe("MANAGER_APPROVED");
    const financed = await service.financeApprove({
      scope: accountingScope,
      values: {
        advanceId: submitted.id,
        approvedAmount: 7000,
        expectedRevisionNo: managed.ok ? managed.data.advance.revisionNo : 0,
        requestKey: "finance-1",
      },
    });
    expect(financed.ok && financed.data.advance).toMatchObject({
      approvedAmount: 7000,
      status: "FINANCE_APPROVED",
    });
  });

  test("creates one payment result and returns it idempotently", async () => {
    const { repository, service } = setup();
    const submitted = await createAndSubmit(service);
    const managed = await service.managerApprove({
      advanceId: submitted.id,
      requestKey: "manager-1",
      scope: adminScope,
    });
    if (!managed.ok) throw new Error(managed.errors.join(" "));
    const financed = await service.financeApprove({
      scope: accountingScope,
      values: {
        advanceId: submitted.id,
        approvedAmount: 7000,
        expectedRevisionNo: managed.data.advance.revisionNo,
        requestKey: "finance-1",
      },
    });
    if (!financed.ok) throw new Error(financed.errors.join(" "));
    const values: EmployeeAdvancePaymentInput = {
      accountCode: "KASA-0001",
      accountName: "Merkez Kasa",
      advanceId: submitted.id,
      expectedRevisionNo: financed.data.advance.revisionNo,
      paymentDate: "2026-08-02",
      requestKey: "pay-1",
    };
    const paid = await service.pay({ scope: accountingScope, values });
    const retried = await service.pay({ scope: accountingScope, values });
    expect(paid.ok && paid.data.advance).toMatchObject({
      paymentLedgerEntryId: "ledger-1",
      paymentMovementId: "movement-1",
      status: "PAID",
    });
    expect(retried.ok && retried.data.idempotent).toBe(true);
    expect(repository.pay).toHaveBeenCalledTimes(1);
  });

  test("allocates partial and final payroll deductions without writing payroll", async () => {
    const { repository, service } = setup();
    const submitted = await createAndSubmit(service);
    const managed = await service.managerApprove({
      advanceId: submitted.id,
      requestKey: "manager-1",
      scope: adminScope,
    });
    if (!managed.ok) throw new Error(managed.errors.join(" "));
    const financed = await service.financeApprove({
      scope: accountingScope,
      values: {
        advanceId: submitted.id,
        approvedAmount: 3000,
        expectedRevisionNo: managed.data.advance.revisionNo,
        requestKey: "finance-1",
      },
    });
    if (!financed.ok) throw new Error(financed.errors.join(" "));
    const paid = await service.pay({
      scope: accountingScope,
      values: {
        accountCode: "KASA-0001",
        accountName: "Merkez Kasa",
        advanceId: submitted.id,
        expectedRevisionNo: financed.data.advance.revisionNo,
        paymentDate: "2026-08-02",
        requestKey: "pay-1",
      },
    });
    if (!paid.ok) throw new Error(paid.errors.join(" "));
    const partial = await service.settle({
      scope: accountingScope,
      values: {
        advanceId: submitted.id,
        amount: 1000,
        payrollAccrualId: "payroll-1",
        payrollLinePersonCode: "PER-0001",
        requestKey: "settle-1",
        settlementDate: "2026-08-31",
      },
    });
    const final = await service.settle({
      scope: accountingScope,
      values: {
        advanceId: submitted.id,
        amount: 2000,
        payrollAccrualId: "payroll-1",
        payrollLinePersonCode: "PER-0001",
        requestKey: "settle-2",
        settlementDate: "2026-08-31",
      },
    });
    expect(partial.ok && partial.data.advance.status).toBe("PAID");
    expect(final.ok && final.data.advance).toMatchObject({
      settledAmount: 3000,
      status: "SETTLED",
    });
    expect(repository.settle).toHaveBeenCalledTimes(2);
  });

  test("rejects cross-scope reads and keeps sensitive note out of audit metadata", async () => {
    const { auditRows, service } = setup();
    const submitted = await createAndSubmit(service);
    const crossScope = await service.get({
      advanceId: submitted.id,
      scope: { ...adminScope, companyId: "company-2" },
    });
    expect(crossScope.ok).toBe(false);
    expect(JSON.stringify(auditRows)).not.toContain("Okul masrafı");
    expect(JSON.stringify(auditRows)).not.toContain("create-1");
  });
});
