import { describe, expect, test } from "vitest";

import { createPayrollPaymentPostingPrismaRepository } from "./payroll-payment-posting-prisma-repository";
import { createPayrollPaymentPostingService } from "./payroll-payment-posting-service";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import { defaultTenantScope } from "./tenant-scope";

describe("payroll payment posting prisma repository", () => {
  test("commits movement, ledger and audits atomically and reuses them on retry", async () => {
    const fixture = createPrismaFixture();
    const service = createService(fixture.prisma);

    const first = await service.post(createInput());
    const retry = await service.post(createInput());

    expect(first.ok ? first.data.created : undefined).toBe(true);
    expect(retry.ok ? retry.data.created : undefined).toBe(false);
    expect(fixture.state.movements).toHaveLength(1);
    expect(fixture.state.ledgers).toHaveLength(1);
    expect(fixture.state.audits).toHaveLength(2);
    expect(retry.ok ? retry.data.movement.ledgerDocumentNo : undefined).toBe(
      "YVM-ODM-ODM-MAAS-PNT-2026-06-001",
    );
  });

  test("rolls back the movement when ledger persistence fails", async () => {
    const fixture = createPrismaFixture({ failLedgerCreate: true });
    const result = await createService(fixture.prisma).post(createInput());

    expect(result).toEqual({
      ok: false,
      errors: [
        "Maaş ödeme hareketi ve muhasebe fişi atomik olarak kalıcılaştırılamadı.",
      ],
      reasonCode: "persistence-failed",
    });
    expect(fixture.state.movements).toHaveLength(0);
    expect(fixture.state.ledgers).toHaveLength(0);
    expect(fixture.state.audits).toHaveLength(0);
  });

  test("fails closed for a partial legacy payment state", async () => {
    const fixture = createPrismaFixture();
    const service = createService(fixture.prisma);
    const commandResult = await service.post(createInput());

    if (!commandResult.ok) {
      throw new Error(commandResult.errors.join(" "));
    }

    fixture.state.ledgers.length = 0;
    const retry = await service.post(createInput());

    expect(retry).toEqual({
      ok: false,
      errors: [
        "Maaş ödemesi için hareket ve muhasebe fişi birlikte bulunmalıdır.",
      ],
      reasonCode: "persistence-failed",
    });
    expect(fixture.state.movements).toHaveLength(1);
  });

  test("rejects closed periods inside the transaction", async () => {
    const fixture = createPrismaFixture({ periodClosed: true });
    const result = await createService(fixture.prisma).post(createInput());

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toEqual([
      "Kapalı veya bulunamayan dönemde maaş ödemesi oluşturulamaz.",
    ]);
    expect(fixture.state.movements).toHaveLength(0);
  });
});

function createService(prisma: unknown) {
  return createPayrollPaymentPostingService({
    now: () => "2026-08-14T08:00:00.000Z",
    repository: createPayrollPaymentPostingPrismaRepository(prisma as never),
  });
}

function createInput() {
  return {
    account: { code: "KASA-0001", name: "MERKEZ KASA" },
    payrollAccrual: createPayrollAccrual(),
    scope: defaultTenantScope,
  };
}

function createPayrollAccrual(): PayrollAccrualRow {
  return {
    id: "payroll-accrual-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    documentNo: "MAAS-PNT-2026-06-001",
    sourceTimesheetId: "timesheet-1",
    sourceTimesheetNo: "PNT-2026-06-001",
    year: 2026,
    month: 6,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    contractorCode: "",
    contractorName: "",
    status: "Kaydedildi",
    grossTotal: 32000,
    deductionTotal: 500,
    netTotal: 31500,
    lineCount: 1,
    lines: [],
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-08-14T07:00:00.000Z",
    updatedAt: "2026-08-14T07:00:00.000Z",
  };
}

function createPrismaFixture(
  options: { failLedgerCreate?: boolean; periodClosed?: boolean } = {},
) {
  const state = {
    audits: [] as unknown[],
    ledgers: [] as Array<Record<string, unknown>>,
    movements: [] as Array<Record<string, unknown>>,
  };

  function client(target = state) {
    return {
      auditLog: {
        async create({ data }: { data: unknown }) {
          target.audits.push(data);
          return data;
        },
      },
      cashBankMovement: {
        async create({ data }: { data: Record<string, unknown> }) {
          target.movements.push(data);
          return data;
        },
        async findFirst({ where }: { where: Record<string, unknown> }) {
          return (
            target.movements.find((row) => matches(row, where)) ?? null
          );
        },
      },
      ledgerEntry: {
        async create({ data }: { data: Record<string, unknown> }) {
          if (options.failLedgerCreate) {
            throw new Error("ledger failed");
          }

          const lines = (
            data.lines as { create: Array<Record<string, unknown>> }
          ).create;
          const row = { ...data, lines };
          target.ledgers.push(row);
          return row;
        },
        async findFirst({ where }: { where: Record<string, unknown> }) {
          return target.ledgers.find((row) => matches(row, where)) ?? null;
        },
      },
      payrollAccrual: {
        async findFirst() {
          const payroll = createPayrollAccrual();
          return {
            id: payroll.id,
            tenantId: payroll.tenantId,
            companyId: payroll.companyId,
            periodId: payroll.periodId,
            status: payroll.status,
            netTotal: payroll.netTotal,
          };
        },
      },
      period: {
        async findFirst() {
          return { isClosed: options.periodClosed ?? false };
        },
      },
    };
  }

  const prisma = {
    ...client(),
    async $transaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const transactionState = structuredClone(state);
      const result = await callback(client(transactionState));
      state.audits.splice(0, state.audits.length, ...transactionState.audits);
      state.ledgers.splice(0, state.ledgers.length, ...transactionState.ledgers);
      state.movements.splice(
        0,
        state.movements.length,
        ...transactionState.movements,
      );
      return result;
    },
  };

  return { prisma, state };
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}
