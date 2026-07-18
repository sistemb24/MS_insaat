import { describe, expect, test } from "vitest";

import type { AuditLogEntryInput } from "./audit-log";
import {
  createExpenseService,
  createSeededExpenseMemoryRepository,
  type ExpenseCreateValues,
} from "./expense-service";
import type { CashBankMovementRepository, CashBankMovementRow } from "./cash-bank-movement-service";
import { defaultTenantScope } from "./tenant-scope";

const validExpenseValues: ExpenseCreateValues = {
  accountCode: "KASA-0001",
  accountName: "MERKEZ KASA",
  amount: 12500,
  counterpartyName: "ABC Beton A.Ş.",
  description: "Şantiye nakliye gideri",
  documentNo: "GDR-0001",
  expenseDate: "2026-06-30",
  movementGroup: "Nakliye",
  siteCode: "SANT-0001",
  siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  vatRate: 20,
};

describe("expense service", () => {
  test("creates a tenant scoped site expense and one cash bank outgoing movement", async () => {
    const movements: CashBankMovementRow[] = [];
    const service = createExpenseService({
      auditLogRepository: createAuditLogRecorder([]),
      cashBankMovementRepository: createCashBankMovementRecorder(movements),
      now: () => "2026-06-30T13:00:00.000Z",
      repository: createSeededExpenseMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: validExpenseValues,
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accountCode: "KASA-0001",
        amount: 12500,
        counterpartyName: "ABC Beton A.Ş.",
        documentNo: "GDR-0001",
        grandTotal: 15000,
        movementGroup: "Nakliye",
        siteCode: "SANT-0001",
        status: "Kaydedildi",
        vatTotal: 2500,
      }),
    });
    expect(movements).toEqual([
      expect.objectContaining({
        amount: 15000,
        counterpartyName: "ABC Beton A.Ş.",
        direction: "Çıkış",
        documentNo: "ODM-GDR-0001",
        movementDate: "2026-06-30",
        movementType: "Gider Ödemesi",
        sourceLabel: "GDR-0001",
        sourceType: "expense",
      }),
    ]);
  });

  test("records audit metadata for the created expense", async () => {
    const auditEntries: AuditLogEntryInput[] = [];
    const service = createExpenseService({
      auditLogRepository: createAuditLogRecorder(auditEntries),
      cashBankMovementRepository: createCashBankMovementRecorder([]),
      now: () => "2026-06-30T13:00:00.000Z",
      repository: createSeededExpenseMemoryRepository(),
    });

    await service.create({
      scope: defaultTenantScope,
      values: validExpenseValues,
    });

    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "expense.create",
        entityLabel: "GDR-0001",
        entityType: "expense",
        metadata: expect.objectContaining({
          accountCode: "KASA-0001",
          documentNo: "GDR-0001",
          grandTotal: 15000,
          movementGroup: "Nakliye",
          siteCode: "SANT-0001",
          statusTo: "Kaydedildi",
        }),
      }),
    ]);
  });

  test("rejects duplicate document numbers in the same tenant scope", async () => {
    const service = createExpenseService({
      cashBankMovementRepository: createCashBankMovementRecorder([]),
      now: () => "2026-06-30T13:00:00.000Z",
      repository: createSeededExpenseMemoryRepository(),
    });

    await service.create({ scope: defaultTenantScope, values: validExpenseValues });
    const duplicate = await service.create({
      scope: defaultTenantScope,
      values: validExpenseValues,
    });

    expect(duplicate).toEqual({
      ok: false,
      errors: ["Gider evrak no bu dönem için zaten kullanılıyor: GDR-0001"],
    });
  });

  test("rejects expense creation for read only users", async () => {
    const service = createExpenseService({
      cashBankMovementRepository: createCashBankMovementRecorder([]),
      now: () => "2026-06-30T13:00:00.000Z",
      repository: createSeededExpenseMemoryRepository(),
    });

    const result = await service.create({
      scope: { ...defaultTenantScope, userRole: "viewer" },
      values: validExpenseValues,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Gider işlemi için muhasebe yetkisi gereklidir."],
    });
  });

  test("validates required site, movement group, account and positive amount", async () => {
    const service = createExpenseService({
      cashBankMovementRepository: createCashBankMovementRecorder([]),
      now: () => "2026-06-30T13:00:00.000Z",
      repository: createSeededExpenseMemoryRepository(),
    });

    const result = await service.create({
      scope: defaultTenantScope,
      values: {
        ...validExpenseValues,
        accountCode: "",
        amount: 0,
        documentNo: "",
        expenseDate: "",
        movementGroup: "",
        siteCode: "",
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Gider evrak no zorunludur.",
        "Gider tarihi geçerli olmalıdır.",
        "Şantiye zorunludur.",
        "Gider hareket grubu zorunludur.",
        "Ödeme hesabı zorunludur.",
        "Gider tutarı sıfırdan büyük olmalıdır.",
      ],
    });
  });
});

function createCashBankMovementRecorder(
  rows: CashBankMovementRow[],
): CashBankMovementRepository {
  return {
    async create(input) {
      rows.push(input);

      return input;
    },
    async list({ scope }) {
      return rows.filter(
        (row) =>
          row.tenantId === scope.tenantId &&
          row.companyId === scope.companyId &&
          row.periodId === scope.periodId,
      );
    },
  };
}

function createAuditLogRecorder(entries: AuditLogEntryInput[]) {
  return {
    async record(input: AuditLogEntryInput) {
      entries.push(input);
    },
  };
}
