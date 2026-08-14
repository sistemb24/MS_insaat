import { describe, expect, test } from "vitest";

import { createPayrollAccrualReversalPrismaRepository } from "./payroll-accrual-reversal-prisma-repository";
import { createPayrollAccrualReversalService } from "./payroll-accrual-reversal-service";
import {
  createAccrualLedger,
  createPayment,
  createPaymentLedger,
  createPayroll,
} from "./payroll-accrual-reversal-service.test";
import { defaultTenantScope } from "./tenant-scope";

const adminScope = { ...defaultTenantScope, userRole: "admin" as const };

describe("payroll accrual reversal prisma repository", () => {
  test("atomically reverses accrual and payment and reuses the chain on retry", async () => {
    const fixture = createPrismaFixture();
    const service = createService(fixture.prisma);

    const first = await service.reverse(createInput());
    const retry = await service.reverse(createInput());

    expect(first.ok ? first.data.created : undefined).toBe(true);
    expect(retry.ok ? retry.data.created : undefined).toBe(false);
    expect(fixture.state.payroll.status).toBe("İptal");
    expect(fixture.state.ledgers).toHaveLength(4);
    expect(fixture.state.movements).toHaveLength(2);
    expect(fixture.state.audits).toHaveLength(4);
    expect(
      fixture.state.movements.find(
        (row) => row.sourceType === "cash-bank-movement-reversal",
      ),
    ).toMatchObject({ direction: "Giriş", sourceId: "movement-1" });
  });

  test("reverses an unpaid accrual without creating cash bank records", async () => {
    const fixture = createPrismaFixture({ paid: false });
    const result = await createService(fixture.prisma).reverse(createInput());

    expect(result.ok).toBe(true);
    expect(fixture.state.payroll.status).toBe("İptal");
    expect(fixture.state.ledgers).toHaveLength(2);
    expect(fixture.state.movements).toHaveLength(0);
    expect(fixture.state.audits).toHaveLength(2);
  });

  test("rolls back every reversal write when audit persistence fails", async () => {
    const fixture = createPrismaFixture({ failAuditCreate: true });
    const result = await createService(fixture.prisma).reverse(createInput());

    expect(result).toEqual({
      ok: false,
      errors: [
        "Maaş tahakkuku ve bağlı ödeme ters kayıtları atomik olarak kalıcılaştırılamadı.",
      ],
      reasonCode: "persistence-failed",
    });
    expect(fixture.state.payroll.status).toBe("Kaydedildi");
    expect(fixture.state.ledgers).toHaveLength(2);
    expect(fixture.state.movements).toHaveLength(1);
    expect(fixture.state.audits).toHaveLength(0);
  });

  test("fails closed for a partial reversal chain", async () => {
    const fixture = createPrismaFixture();
    const service = createService(fixture.prisma);
    const first = await service.reverse(createInput());
    if (!first.ok) throw new Error(first.errors.join(" "));

    fixture.state.ledgers = fixture.state.ledgers.filter(
      (row) => row.sourceType !== "cash-bank-movement-reversal",
    );
    const retry = await service.reverse(createInput());

    expect(retry.ok).toBe(false);
    expect(retry.ok ? [] : retry.errors).toEqual([
      "Maaş tahakkuku ters kayıt zinciri eksik veya kaynak kayıtlarla uyumsuz; işlem güvenli biçimde durduruldu.",
    ]);
  });

  test("rejects a closed period inside the transaction", async () => {
    const fixture = createPrismaFixture({ periodClosed: true });
    const result = await createService(fixture.prisma).reverse(createInput());

    expect(result.ok).toBe(false);
    expect(fixture.state.payroll.status).toBe("Kaydedildi");
    expect(fixture.state.ledgers).toHaveLength(2);
  });
});

function createService(prisma: unknown) {
  return createPayrollAccrualReversalService({
    now: () => "2026-08-14T10:00:00.000Z",
    repository: createPayrollAccrualReversalPrismaRepository(prisma as never),
  });
}

function createInput() {
  return { payrollAccrualId: "payroll-1", scope: adminScope };
}

function createPrismaFixture(
  options: {
    failAuditCreate?: boolean;
    paid?: boolean;
    periodClosed?: boolean;
  } = {},
) {
  const paid = options.paid ?? true;
  const state = {
    audits: [] as Array<Record<string, unknown>>,
    ledgers: [
      ledgerRecord(createAccrualLedger()),
      ...(paid ? [ledgerRecord(createPaymentLedger())] : []),
    ],
    movements: paid ? [movementRecord(createPayment())] : [],
    payroll: payrollRecord(),
  };

  function client(target = state) {
    return {
      auditLog: {
        async create({ data }: { data: Record<string, unknown> }) {
          if (options.failAuditCreate) throw new Error("audit failed");
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
          return target.movements.find((row) => matches(row, where)) ?? null;
        },
        async findMany({ where }: { where: Record<string, unknown> }) {
          return target.movements.filter((row) => matches(row, where));
        },
      },
      ledgerEntry: {
        async create({ data }: { data: Record<string, unknown> }) {
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
        async findFirst({ where }: { where: Record<string, unknown> }) {
          return matches(target.payroll, where) ? target.payroll : null;
        },
        async updateMany({
          data,
          where,
        }: {
          data: Record<string, unknown>;
          where: Record<string, unknown>;
        }) {
          if (!matches(target.payroll, where)) return { count: 0 };
          Object.assign(target.payroll, data);
          return { count: 1 };
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
      state.audits = transactionState.audits;
      state.ledgers = transactionState.ledgers;
      state.movements = transactionState.movements;
      state.payroll = transactionState.payroll;
      return result;
    },
  };

  return { prisma, state };
}

function payrollRecord() {
  const payroll = createPayroll();
  return {
    ...payroll,
    contractorCode: null,
    contractorName: null,
    createdAt: new Date(payroll.createdAt),
    updatedAt: new Date(payroll.updatedAt),
  } as Record<string, unknown>;
}

function movementRecord(row: ReturnType<typeof createPayment>) {
  return {
    ...row,
    movementDate: new Date(`${row.movementDate}T00:00:00.000Z`),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  } as Record<string, unknown>;
}

function ledgerRecord(row: ReturnType<typeof createAccrualLedger>) {
  return {
    ...row,
    entryDate: new Date(`${row.entryDate}T00:00:00.000Z`),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lines: row.lines.map((line, index) => ({
      lineNo: index + 1,
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.direction === "debit" ? line.amount : 0,
      credit: line.direction === "credit" ? line.amount : 0,
      description: line.description ?? null,
    })),
  } as Record<string, unknown>;
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => {
    const current = row[key];
    if (current instanceof Date && value instanceof Date) {
      return current.getTime() === value.getTime();
    }
    return current === value;
  });
}
