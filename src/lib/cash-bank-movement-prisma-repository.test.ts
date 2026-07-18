import { describe, expect, test } from "vitest";

import {
  createChequeCollectionMovement,
  type CashBankMovementRow,
} from "./cash-bank-movement-service";
import { createCashBankMovementPrismaRepository } from "./cash-bank-movement-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const row: CashBankMovementRow = createChequeCollectionMovement({
  amount: 125000,
  counterpartyName: "ABC Beton A.Ş.",
  currency: "TL",
  documentNo: "CEK-0001",
  movementDate: "2026-06-27",
  nowIso: "2026-06-27T09:00:00.000Z",
  scope: defaultTenantScope,
  sourceId: "cheque-1",
  sourceLabel: "CEK-0001 / CK-0001",
});

describe("cash bank movement prisma repository", () => {
  test("creates cash bank movement row", async () => {
    const calls: unknown[] = [];
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            movementDate: new Date("2026-06-27T00:00:00.000Z"),
            updatedAt: new Date(row.updatedAt),
          };
        },
      },
    });

    await repository.create(row);

    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          accountCode: "KASA-0001",
          amount: 125000,
          direction: "Giriş",
          documentNo: "CEK-0001",
          movementDate: new Date("2026-06-27T00:00:00.000Z"),
          movementType: "Çek Tahsilatı",
          sourceId: "cheque-1",
          sourceType: "cheque",
        }),
      },
    ]);
  });

  test("normalizes created movement currency to the P0 base transaction currency", async () => {
    const calls: unknown[] = [];
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [];
        },
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            createdAt: new Date(row.createdAt),
            movementDate: new Date("2026-06-27T00:00:00.000Z"),
            updatedAt: new Date(row.updatedAt),
          };
        },
      },
    });

    await repository.create({
      ...row,
      currency: "EUR",
    });

    expect(calls).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "TL",
        }),
      }),
    ]);
  });

  test("lists tenant scoped movements ordered by newest date", async () => {
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
            },
            orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
          });

          return [
            {
              ...row,
              amount: "125000",
              createdAt: new Date(row.createdAt),
              movementDate: new Date("2026-06-27T00:00:00.000Z"),
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      row,
    ]);
  });

  test("normalizes listed movement currency to the P0 base transaction currency", async () => {
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [
            {
              ...row,
              amount: "125000",
              currency: "EUR",
              createdAt: new Date(row.createdAt),
              movementDate: new Date("2026-06-27T00:00:00.000Z"),
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({
        currency: "TL",
        documentNo: "CEK-0001",
      }),
    ]);
  });

  test("preserves progress payment movement type while listing rows", async () => {
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [
            {
              ...row,
              amount: "11400",
              createdAt: new Date(row.createdAt),
              direction: "Çıkış",
              documentNo: "ODM-HAK-0001",
              movementDate: new Date("2026-06-30T00:00:00.000Z"),
              movementType: "Hakediş Ödemesi",
              sourceId: "progress-payment-1",
              sourceLabel: "HAK-0001",
              sourceType: "progress-payment",
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({
        direction: "Çıkış",
        documentNo: "ODM-HAK-0001",
        movementType: "Hakediş Ödemesi",
        sourceType: "progress-payment",
      }),
    ]);
  });
  test("preserves progress payment collection movement type while listing rows", async () => {
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [
            {
              ...row,
              amount: "11400",
              createdAt: new Date(row.createdAt),
              direction: "Giriş",
              documentNo: "THS-HAK-0001",
              movementDate: new Date("2026-06-30T00:00:00.000Z"),
              movementType: "Hakediş Tahsilatı",
              sourceId: "progress-payment-1",
              sourceLabel: "HAK-0001",
              sourceType: "progress-payment",
              updatedAt: new Date(row.updatedAt),
            },
          ];
        },
        async create() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({
        direction: "Giriş",
        documentNo: "THS-HAK-0001",
        movementType: "Hakediş Tahsilatı",
        sourceType: "progress-payment",
      }),
    ]);
  });

  test("hydrates source-linked invoice ledger reference while listing movements", async () => {
    const invoiceMovement = {
      ...row,
      documentNo: "THS-SF-001",
      movementType: "Tahsilat",
      sourceType: "sales-invoice",
      sourceId: "sales-invoice-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() { return [invoiceMovement]; },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          return input.where.sourceType === "cash-bank-movement"
            ? [{ id: "ledger-1", sourceId: invoiceMovement.id, documentNo: "YVM-THS-THS-SF-001", sourceType: "cash-bank-movement" }]
            : [{ id: "ledger-reversal-1", sourceId: invoiceMovement.id, documentNo: "YVM-IA-YVM-THS-THS-SF-001", sourceType: "cash-bank-movement-reversal" }];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ ledgerEntryId: "ledger-1", ledgerDocumentNo: "YVM-THS-THS-SF-001" }),
    ]);
  });

  test("hydrates reversal movement ledger reference by reversal source type", async () => {
    const reversalMovement = {
      ...row,
      id: "movement-reversal-1",
      documentNo: "YVM-IA-YVM-THS-THS-SF-001",
      movementType: "Tahsilat",
      sourceType: "cash-bank-movement-reversal",
      sourceId: "movement-original-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() { return [reversalMovement]; },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          return input.where.sourceType === "cash-bank-movement-reversal"
            ? [{ id: "ledger-reversal-1", sourceId: "movement-original-1", documentNo: reversalMovement.documentNo, sourceType: "cash-bank-movement-reversal" }]
            : [];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ ledgerEntryId: "ledger-reversal-1", ledgerDocumentNo: reversalMovement.documentNo }),
    ]);
  });

  test("hydrates expense payment movement from the expense source ledger", async () => {
    const expenseMovement = {
      ...row,
      documentNo: "ODM-GDR-0001",
      movementType: "Gider Ödemesi",
      sourceType: "expense",
      sourceId: "expense-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() { return [expenseMovement]; },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          return input.where.sourceType === "expense"
            ? [{ id: "ledger-expense-1", sourceId: "expense-1", documentNo: "YVM-GDR-GDR-0001", sourceType: "expense" }]
            : [];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ ledgerEntryId: "ledger-expense-1", ledgerDocumentNo: "YVM-GDR-GDR-0001" }),
    ]);
  });

  test("hydrates payroll and progress payment movements from the cash bank source ledger", async () => {
    const payrollMovement = {
      ...row,
      id: "movement-payroll-1",
      documentNo: "ODM-MAAS-PNT-001",
      movementType: "Maaş Ödemesi",
      sourceType: "payroll-accrual",
      sourceId: "payroll-accrual-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const progressPaymentMovement = {
      ...row,
      id: "movement-progress-payment-1",
      documentNo: "ODM-HAK-001",
      movementType: "Hakediş Ödemesi",
      sourceType: "progress-payment",
      sourceId: "progress-payment-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const progressCollectionMovement = {
      ...row,
      id: "movement-progress-collection-1",
      documentNo: "THS-HAK-001",
      movementType: "Hakediş Tahsilatı",
      sourceType: "progress-payment",
      sourceId: "progress-payment-1",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() {
          return [payrollMovement, progressPaymentMovement, progressCollectionMovement];
        },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          if (input.where.sourceType !== "cash-bank-movement") return [];
          return [
            { id: "ledger-payroll-1", sourceId: payrollMovement.id, documentNo: "YVM-ODM-ODM-MAAS-PNT-001", sourceType: "cash-bank-movement" },
            { id: "ledger-progress-payment-1", sourceId: progressPaymentMovement.id, documentNo: "YVM-ODM-ODM-HAK-001", sourceType: "cash-bank-movement" },
            { id: "ledger-progress-collection-1", sourceId: progressCollectionMovement.id, documentNo: "YVM-THS-THS-HAK-001", sourceType: "cash-bank-movement" },
          ];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ id: payrollMovement.id, ledgerEntryId: "ledger-payroll-1", ledgerDocumentNo: "YVM-ODM-ODM-MAAS-PNT-001" }),
      expect.objectContaining({ id: progressPaymentMovement.id, ledgerEntryId: "ledger-progress-payment-1", ledgerDocumentNo: "YVM-ODM-ODM-HAK-001" }),
      expect.objectContaining({ id: progressCollectionMovement.id, ledgerEntryId: "ledger-progress-collection-1", ledgerDocumentNo: "YVM-THS-THS-HAK-001" }),
    ]);
  });

  test("hydrates counterparty movement ledger reference from its movement id", async () => {
    const counterpartyMovement = {
      ...row,
      id: "movement-counterparty-1",
      documentNo: "CAR-THS-0001",
      movementType: "Tahsilat",
      sourceType: "counterparty-musteriler",
      sourceId: "musteriler-MUS-0001-CAR-THS-0001",
      createdAt: new Date(row.createdAt),
      movementDate: new Date("2026-07-15T00:00:00.000Z"),
      updatedAt: new Date(row.updatedAt),
    };
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() { return [counterpartyMovement]; },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          return input.where.sourceType === "cash-bank-movement"
            ? [{ id: "ledger-counterparty-1", sourceId: counterpartyMovement.id, documentNo: "YVM-THS-CARI-CAR-THS-0001", sourceType: "cash-bank-movement" }]
            : [];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ id: counterpartyMovement.id, ledgerEntryId: "ledger-counterparty-1", ledgerDocumentNo: "YVM-THS-CARI-CAR-THS-0001" }),
    ]);
  });

  test("hydrates both sides of a transfer from one transfer ledger journal", async () => {
    const transferRows = [
      {
        ...row,
        id: "movement-transfer-out",
        documentNo: "VRM-0001",
        movementType: "Virman",
        direction: "Çıkış",
        sourceType: "transfer",
        sourceId: "VRM-0001-cikis",
        createdAt: new Date(row.createdAt),
        movementDate: new Date("2026-07-15T00:00:00.000Z"),
        updatedAt: new Date(row.updatedAt),
      },
      {
        ...row,
        id: "movement-transfer-in",
        documentNo: "VRM-0001",
        movementType: "Virman",
        direction: "Giriş",
        sourceType: "transfer",
        sourceId: "VRM-0001-giris",
        createdAt: new Date(row.createdAt),
        movementDate: new Date("2026-07-15T00:00:00.000Z"),
        updatedAt: new Date(row.updatedAt),
      },
    ];
    const repository = createCashBankMovementPrismaRepository({
      cashBankMovement: {
        async findMany() { return transferRows; },
        async create() { throw new Error("not used"); },
      },
      ledgerEntry: {
        async findMany(input) {
          return input.where.sourceType === "cash-bank-transfer"
            ? [{ id: "ledger-transfer-1", sourceId: "VRM-0001", documentNo: "YVM-VRM-VRM-0001", sourceType: "cash-bank-transfer" }]
            : [];
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({ id: "movement-transfer-out", ledgerEntryId: "ledger-transfer-1", ledgerDocumentNo: "YVM-VRM-VRM-0001" }),
      expect.objectContaining({ id: "movement-transfer-in", ledgerEntryId: "ledger-transfer-1", ledgerDocumentNo: "YVM-VRM-VRM-0001" }),
    ]);
  });
});

