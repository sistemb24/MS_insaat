import { describe, expect, test } from "vitest";

import {
  createBankIntegrationPrismaRepository,
  createBankLedgerPrismaRepository,
} from "./bank-integration-prisma-repository";
import type {
  BankIntegrationConnectionRow,
  BankLedgerEntryRow,
  BankTransactionRow,
} from "./bank-integration-service";
import { defaultTenantScope } from "./tenant-scope";

const connection: BankIntegrationConnectionRow = {
  bankCode: "isbank",
  bankName: "İş Bankası",
  companyId: defaultTenantScope.companyId,
  consentId: "NOA-SANDBOX-001",
  createdAt: "2026-07-03T09:00:00.000Z",
  createdBy: defaultTenantScope.userId,
  environment: "sandbox",
  id: "tenant-noa-demo::company-demo-insaat::period-2026::bank-integration::isbank::sandbox",
  lastTestedAt: "2026-07-03T09:00:00.000Z",
  lastTestMessage: "Sandbox bağlantısı doğrulandı.",
  lastTestStatus: "success",
  periodId: defaultTenantScope.periodId,
  status: "connected",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-03T09:00:00.000Z",
  updatedBy: defaultTenantScope.userId,
};

const transaction: BankTransactionRow = {
  amount: 125000,
  bankConnectionId: connection.id,
  bankName: "İş Bankası",
  companyId: defaultTenantScope.companyId,
  currency: "TRY",
  description: "Sandbox hakediş tahsilatı",
  direction: "inflow",
  externalId: "isbank-sandbox-2026-07-03-inflow",
  id: `${connection.id}::transaction::isbank-sandbox-2026-07-03-inflow`,
  occurredAt: "2026-07-03T09:00:00.000Z",
  periodId: defaultTenantScope.periodId,
  status: "pending",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-03T09:30:00.000Z",
};

const ledgerEntry: BankLedgerEntryRow = {
  amount: 125000,
  bankTransactionId: transaction.id,
  cashBankAccountCode: "102.01",
  cashBankAccountName: "İş Bankası TL",
  cashBankMovementId: "cash-movement-1",
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-03T10:00:00.000Z",
  createdBy: defaultTenantScope.userId,
  currency: "TRY",
  description: "Sandbox hakediş tahsilatı -> KBN-0001",
  documentNo: "KBN-0001",
  entryDate: "2026-07-03",
  id: `${transaction.id}::ledger::cash-movement-1`,
  ledgerDirection: "debit",
  periodId: defaultTenantScope.periodId,
  status: "active",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-03T10:00:00.000Z",
  updatedBy: defaultTenantScope.userId,
};

describe("bank integration prisma repository", () => {
  test("lists sandbox bank connections in tenant company period scope", async () => {
    const repository = createBankIntegrationPrismaRepository({
      bankIntegrationConnection: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              tenantId: defaultTenantScope.tenantId,
            },
            orderBy: [{ bankName: "asc" }],
          });

          return [
            {
              ...connection,
              createdAt: new Date(connection.createdAt),
              lastTestedAt: new Date(connection.lastTestedAt),
              updatedAt: new Date(connection.updatedAt),
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      bankTransaction: {
        async findMany() {
          return [];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual([connection]);
  });

  test("upserts a sandbox connection by deterministic id", async () => {
    const calls: unknown[] = [];
    const repository = createBankIntegrationPrismaRepository({
      bankIntegrationConnection: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            createdAt: input.create.createdAt,
            lastTestedAt: input.create.lastTestedAt,
            updatedAt: input.create.updatedAt,
          };
        },
      },
      bankTransaction: {
        async findMany() {
          return [];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.upsertConnection({ connection, scope: defaultTenantScope }),
    ).resolves.toEqual(connection);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-001",
          environment: "sandbox",
          tenantId: defaultTenantScope.tenantId,
        }),
        update: expect.objectContaining({
          lastTestMessage: "Sandbox bağlantısı doğrulandı.",
          lastTestStatus: "success",
          status: "connected",
          updatedBy: defaultTenantScope.userId,
        }),
        where: {
          id: connection.id,
        },
      }),
    ]);
  });

  test("lists bank transactions in tenant company period scope", async () => {
    const repository = createBankIntegrationPrismaRepository({
      bankIntegrationConnection: {
        async findMany() {
          return [];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      bankTransaction: {
        async findMany(input) {
          expect(input).toEqual({
            orderBy: [{ occurredAt: "desc" }],
            take: 20,
            where: {
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              tenantId: defaultTenantScope.tenantId,
            },
          });

          return [
            {
              ...transaction,
              amount: "125000",
              occurredAt: new Date(transaction.occurredAt),
              updatedAt: new Date(transaction.updatedAt),
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.listTransactions({ scope: defaultTenantScope }),
    ).resolves.toEqual([transaction]);
  });

  test("upserts synced bank transactions by deterministic id", async () => {
    const calls: unknown[] = [];
    const repository = createBankIntegrationPrismaRepository({
      bankIntegrationConnection: {
        async findMany() {
          return [];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      bankTransaction: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            amount: input.create.amount,
            occurredAt: input.create.occurredAt,
            updatedAt: input.create.updatedAt,
          };
        },
      },
    });

    await expect(
      repository.upsertTransactions({
        scope: defaultTenantScope,
        transactions: [transaction],
      }),
    ).resolves.toEqual([transaction]);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          amount: 125000,
          bankConnectionId: connection.id,
          externalId: "isbank-sandbox-2026-07-03-inflow",
          status: "pending",
        }),
        update: expect.objectContaining({
          amount: 125000,
          description: "Sandbox hakediş tahsilatı",
          updatedAt: new Date(transaction.updatedAt),
        }),
        where: {
          id: transaction.id,
        },
      }),
    ]);
  });

  test("can preserve existing bank transaction status during sync upserts", async () => {
    const calls: unknown[] = [];
    const matchedRecord = {
      ...transaction,
      amount: transaction.amount,
      occurredAt: new Date(transaction.occurredAt),
      status: "matched",
      updatedAt: new Date(transaction.updatedAt),
    };
    const repository = createBankIntegrationPrismaRepository({
      bankIntegrationConnection: {
        async findMany() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
      bankTransaction: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return matchedRecord;
        },
      },
    });

    await expect(
      repository.upsertTransactions({
        preserveExistingStatus: true,
        scope: defaultTenantScope,
        transactions: [transaction],
      }),
    ).resolves.toEqual([{ ...transaction, status: "matched" }]);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          status: "pending",
        }),
        update: expect.not.objectContaining({
          status: expect.any(String),
        }),
        where: {
          id: transaction.id,
        },
      }),
    ]);
  });

  test("lists recent bank ledger entries in scoped deterministic order", async () => {
    const calls: unknown[] = [];
    const repository = createBankLedgerPrismaRepository({
      bankLedgerEntry: {
        async findMany(input) {
          calls.push(input);

          return [
            {
              ...ledgerEntry,
              createdAt: new Date(ledgerEntry.createdAt),
              entryDate: new Date(ledgerEntry.entryDate),
              updatedAt: new Date(ledgerEntry.updatedAt),
            },
          ];
        },
        async findFirst() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.listEntries?.({ scope: defaultTenantScope })).resolves.toEqual([
      ledgerEntry,
    ]);
    expect(calls).toEqual([
      {
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        take: 20,
        where: {
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          tenantId: defaultTenantScope.tenantId,
        },
      },
    ]);

    calls.length = 0;
    await expect(
      repository.listEntries?.({
        bankTransactionIds: [transaction.id, "bank-transaction-2", transaction.id],
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual([ledgerEntry]);
    expect(calls).toEqual([
      {
        orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
        where: {
          bankTransactionId: {
            in: [transaction.id, "bank-transaction-2"],
          },
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          tenantId: defaultTenantScope.tenantId,
        },
      },
    ]);
  });

  test("upserts bank ledger entries by deterministic id", async () => {
    const calls: unknown[] = [];
    const repository = createBankLedgerPrismaRepository({
      bankLedgerEntry: {
        async findFirst() {
          throw new Error("not used");
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            amount: input.create.amount,
            createdAt: input.create.createdAt,
            entryDate: input.create.entryDate,
            updatedAt: input.create.updatedAt,
          };
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.upsertEntry({
        entry: ledgerEntry,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual(ledgerEntry);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          bankTransactionId: transaction.id,
          cashBankMovementId: "cash-movement-1",
          ledgerDirection: "debit",
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        }),
        update: expect.objectContaining({
          amount: 125000,
          documentNo: "KBN-0001",
          status: "active",
          updatedBy: defaultTenantScope.userId,
        }),
        where: {
          id: ledgerEntry.id,
        },
      }),
    ]);
  });

  test("finds active bank ledger entry by cash bank movement in tenant company period scope", async () => {
    const calls: unknown[] = [];
    const repository = createBankLedgerPrismaRepository({
      bankLedgerEntry: {
        async findFirst(input) {
          calls.push(input);

          return {
            ...ledgerEntry,
            amount: "125000",
            createdAt: new Date(ledgerEntry.createdAt),
            entryDate: new Date(ledgerEntry.entryDate),
            updatedAt: new Date(ledgerEntry.updatedAt),
          };
        },
        async upsert() {
          throw new Error("not used");
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.findActiveByCashBankMovementId({
        cashBankMovementId: ledgerEntry.cashBankMovementId,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual(ledgerEntry);
    expect(calls).toEqual([
      {
        where: {
          cashBankMovementId: ledgerEntry.cashBankMovementId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        },
      },
    ]);
  });

  test("voids bank ledger entry in tenant company period scope", async () => {
    const calls: unknown[] = [];
    const repository = createBankLedgerPrismaRepository({
      bankLedgerEntry: {
        async findFirst() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
        async updateMany(input) {
          calls.push(input);

          return { count: 1 };
        },
      },
    });

    await repository.voidByBankTransactionId({
      bankTransactionId: transaction.id,
      scope: defaultTenantScope,
      updatedAt: "2026-07-03T10:30:00.000Z",
      updatedBy: defaultTenantScope.userId,
    });

    expect(calls).toEqual([
      {
        data: {
          status: "voided",
          updatedAt: new Date("2026-07-03T10:30:00.000Z"),
          updatedBy: defaultTenantScope.userId,
        },
        where: {
          bankTransactionId: transaction.id,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        },
      },
    ]);
  });
});
