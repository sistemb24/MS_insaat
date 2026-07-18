import { describe, expect, test, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import type {
  CashBankMovementRepository,
  CashBankMovementRow,
} from "./cash-bank-movement-service";
import {
  buildBankLedgerFailureAuditReadModel,
  buildBankLedgerReconciliationIssues,
  buildBankTransactionMatchSuggestions,
  buildBankTransactionCashBankMovementDrafts,
  buildManualBankTransactionMatchCandidates,
  buildBankTransactionPartialCashBankMovementDrafts,
  buildBankTransactionPartialReconciliationDrafts,
  getBankLedgerReconciliationIssueLabel,
  evaluateManualBankTransactionMatchCandidates,
  createBankIntegrationService,
  createSeededBankIntegrationMemoryRepository,
  getSupportedBankIntegrations,
  isPartialCashBankMovementForTransaction,
  summarizeActiveBankLedgerByAccount,
  type BankIntegrationConnectionRow,
  type BankLedgerEntryRow,
  type BankTransactionRow,
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

const syncedTransactions: BankTransactionRow[] = [
  {
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
  },
  {
    amount: -48500,
    bankConnectionId: connection.id,
    bankName: "İş Bankası",
    companyId: defaultTenantScope.companyId,
    currency: "TRY",
    description: "Sandbox tedarikçi ödemesi",
    direction: "outflow",
    externalId: "isbank-sandbox-2026-07-03-outflow",
    id: `${connection.id}::transaction::isbank-sandbox-2026-07-03-outflow`,
    occurredAt: "2026-07-03T09:05:00.000Z",
    periodId: defaultTenantScope.periodId,
    status: "pending",
    tenantId: defaultTenantScope.tenantId,
    updatedAt: "2026-07-03T09:30:00.000Z",
  },
];

const matchingCashBankMovement: CashBankMovementRow = {
  accountCode: "102.01",
  accountName: "İş Bankası TL",
  amount: 125000,
  companyId: defaultTenantScope.companyId,
  counterpartyName: "AKDENİZ BELEDİYESİ YAPI İŞLERİ MD.",
  createdAt: "2026-07-03T09:10:00.000Z",
  createdBy: defaultTenantScope.userId,
  currency: "TL",
  description: "Hakediş tahsilatı",
  direction: "Giriş",
  documentNo: "KBN-0001",
  id: "cash-movement-1",
  movementDate: "2026-07-03",
  movementType: "Hakediş Tahsilatı",
  periodId: defaultTenantScope.periodId,
  sourceId: "progress-payment-1",
  sourceLabel: "HAK-0001",
  sourceType: "progress-payment",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-03T09:10:00.000Z",
  updatedBy: defaultTenantScope.userId,
};

describe("bank integration service", () => {
  test("lists supported banks from the P2 contract", () => {
    expect(getSupportedBankIntegrations()).toEqual([
      { bankCode: "vakifbank", bankName: "VakıfBank", status: "Mevcut" },
      { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
      { bankCode: "qnb", bankName: "QNB Finansbank", status: "Mevcut" },
      { bankCode: "akbank", bankName: "Akbank", status: "Mevcut" },
      { bankCode: "yapikredi", bankName: "Yapı Kredi", status: "Mevcut" },
      { bankCode: "garanti", bankName: "Garanti BBVA", status: "Mevcut" },
      { bankCode: "ziraat", bankName: "Ziraat Bankası", status: "Yakında" },
    ]);
  });

  test("tests and persists an admin sandbox bank connection", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      now: () => "2026-07-03T09:00:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository(),
    });

    const result = await service.testSandboxConnection({
      scope: { ...defaultTenantScope, userRole: "admin" },
      values: {
        bankCode: "isbank",
        consentId: " NOA-SANDBOX-001 ",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        connection,
      },
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.sandbox-test",
        entityId: connection.id,
        entityLabel: "İş Bankası / NOA-SANDBOX-001",
        entityType: "bank-integration",
        metadata: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-001",
          environment: "sandbox",
          statusTo: "connected",
        }),
      }),
    );
  });

  test("syncs sandbox transactions for a connected bank connection", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      now: () => "2026-07-03T09:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 2,
        transactions: syncedTransactions,
      },
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [syncedTransactions[1], syncedTransactions[0]],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync",
        entityId: connection.id,
        entityLabel: "İş Bankası / NOA-SANDBOX-001",
        entityType: "bank-integration",
        metadata: expect.objectContaining({
          bankCode: "isbank",
          preservedStatusCount: 0,
          syncedCount: 2,
          transactionExternalIds: [
            "isbank-sandbox-2026-07-03-inflow",
            "isbank-sandbox-2026-07-03-outflow",
          ],
        }),
      }),
    );
  });

  test("preserves local matched status when sync sees the same bank transaction again", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const matchedTransaction: BankTransactionRow = {
      ...syncedTransactions[0],
      status: "matched",
      updatedAt: "2026-07-03T10:00:00.000Z",
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: [matchedTransaction],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });
    const expectedPreservedTransaction: BankTransactionRow = {
      ...matchedTransaction,
      updatedAt: "2026-07-03T10:30:00.000Z",
    };
    const expectedNewTransaction: BankTransactionRow = {
      ...syncedTransactions[1],
      updatedAt: "2026-07-03T10:30:00.000Z",
    };

    expect(result).toEqual({
      ok: true,
      data: {
        preservedStatusCount: 1,
        syncedCount: 2,
        transactions: [expectedPreservedTransaction, expectedNewTransaction],
      },
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [expectedNewTransaction, expectedPreservedTransaction],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync",
        metadata: expect.objectContaining({
          preservedStatusCount: 1,
          syncedCount: 2,
        }),
      }),
    );
  });

  test("syncs bank transactions through the configured bank adapter", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const adaptedTransaction: BankTransactionRow = {
      amount: 28000,
      bankConnectionId: connection.id,
      bankName: "İş Bankası",
      companyId: defaultTenantScope.companyId,
      currency: "TRY",
      description: "Adapter kaynaklı banka komisyon iadesi",
      direction: "inflow",
      externalId: "isbank-adapter-commission-refund",
      id: `${connection.id}::transaction::isbank-adapter-commission-refund`,
      occurredAt: "2026-07-03T10:15:00.000Z",
      periodId: defaultTenantScope.periodId,
      status: "pending",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-03T10:30:00.000Z",
    };
    const bankAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([adaptedTransaction]),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter,
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 1,
        transactions: [adaptedTransaction],
      },
    });
    expect(bankAdapter.syncTransactions).toHaveBeenCalledWith({
      connection,
      timestamp: "2026-07-03T10:30:00.000Z",
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync",
        metadata: expect.objectContaining({
          bankCode: "isbank",
          preservedStatusCount: 0,
          syncedCount: 1,
          transactionExternalIds: ["isbank-adapter-commission-refund"],
        }),
      }),
    );
  });

  test("rejects bank transaction sync when date range format is invalid", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const bankAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([]),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter,
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      dateFrom: "2026/07/01",
      dateTo: "2026-07-03",
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka hareketi tarih aralığı YYYY-AA-GG formatında olmalıdır."],
    });
    expect(bankAdapter.syncTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).not.toHaveBeenCalled();
  });

  test("scopes ledger overview rows to the visible bank transaction window", async () => {
    const listEntries = vi.fn().mockResolvedValue([]);
    const listByEntityType = vi.fn().mockResolvedValue([]);
    const service = createBankIntegrationService({
      auditLogRepository: {
        listByEntityType,
        record: vi.fn(),
      },
      ledgerRepository: {
        findActiveByCashBankMovementId: vi.fn(),
        listEntries,
        upsertEntry: vi.fn(),
        voidByBankTransactionId: vi.fn(),
      },
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        ledgerFailureAudits: [],
        ledgerEntries: [],
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [syncedTransactions[1], syncedTransactions[0]],
      },
    });
    expect(listEntries).toHaveBeenCalledWith({
      bankTransactionIds: [syncedTransactions[1].id, syncedTransactions[0].id],
      scope: defaultTenantScope,
    });
    expect(listByEntityType).toHaveBeenCalledWith({
      entityType: "bank-transaction",
      limit: 50,
      scope: defaultTenantScope,
    });
  });
  test("rejects bank transaction sync when date range contains an invalid calendar date", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const bankAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([]),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter,
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      dateFrom: "2026-02-30",
      dateTo: "2026-07-03",
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka hareketi tarih aralığı YYYY-AA-GG formatında olmalıdır."],
    });
    expect(bankAdapter.syncTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).not.toHaveBeenCalled();
  });
  test("rejects bank transaction sync when date range is reversed", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const bankAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([]),
    };
    const repository = createSeededBankIntegrationMemoryRepository({
      connections: [connection],
    });
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter,
      now: () => "2026-07-03T10:30:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      dateFrom: "2026-07-05",
      dateTo: "2026-07-01",
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka hareketi başlangıç tarihi bitiş tarihinden sonra olamaz."],
    });
    expect(bankAdapter.syncTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).not.toHaveBeenCalled();
  });
  test("syncs only bank transactions inside the requested date range", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const insideRangeTransaction: BankTransactionRow = {
      amount: 28000,
      bankConnectionId: connection.id,
      bankName: "İş Bankası",
      companyId: defaultTenantScope.companyId,
      currency: "TRY",
      description: "Tarih aralığındaki banka hareketi",
      direction: "inflow",
      externalId: "isbank-filtered-inflow",
      id: `${connection.id}::transaction::isbank-filtered-inflow`,
      occurredAt: "2026-07-02T10:15:00.000Z",
      periodId: defaultTenantScope.periodId,
      status: "pending",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-03T10:30:00.000Z",
    };
    const outsideRangeTransaction: BankTransactionRow = {
      ...insideRangeTransaction,
      description: "Aralık dışındaki banka hareketi",
      externalId: "isbank-outside-range-inflow",
      id: `${connection.id}::transaction::isbank-outside-range-inflow`,
      occurredAt: "2026-06-30T10:15:00.000Z",
    };
    const bankAdapter = {
      syncTransactions: vi
        .fn()
        .mockResolvedValue([insideRangeTransaction, outsideRangeTransaction]),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter,
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-02",
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 1,
        transactions: [insideRangeTransaction],
      },
    });
    expect(bankAdapter.syncTransactions).toHaveBeenCalledWith({
      connection,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-02",
      timestamp: "2026-07-03T10:30:00.000Z",
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync",
        metadata: expect.objectContaining({
          dateFrom: "2026-07-01",
          dateTo: "2026-07-02",
          syncedCount: 1,
          transactionExternalIds: ["isbank-filtered-inflow"],
        }),
      }),
    );
  });
  test("selects the bank-specific adapter before the fallback adapter", async () => {
    const bankSpecificTransaction: BankTransactionRow = {
      amount: 56000,
      bankConnectionId: connection.id,
      bankName: "İş Bankası",
      companyId: defaultTenantScope.companyId,
      currency: "TRY",
      description: "İş Bankası adaptörü kaynaklı hareket",
      direction: "inflow",
      externalId: "isbank-specific-adapter-inflow",
      id: `${connection.id}::transaction::isbank-specific-adapter-inflow`,
      occurredAt: "2026-07-03T11:15:00.000Z",
      periodId: defaultTenantScope.periodId,
      status: "pending",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-03T11:30:00.000Z",
    };
    const fallbackAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([]),
    };
    const isbankAdapter = {
      syncTransactions: vi.fn().mockResolvedValue([bankSpecificTransaction]),
    };
    const service = createBankIntegrationService({
      bankAdapter: fallbackAdapter,
      bankAdapters: {
        isbank: isbankAdapter,
      },
      now: () => "2026-07-03T11:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
    } as Parameters<typeof createBankIntegrationService>[0] & {
      bankAdapters: Record<string, typeof isbankAdapter>;
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        preservedStatusCount: 0,
        syncedCount: 1,
        transactions: [bankSpecificTransaction],
      },
    });
    expect(isbankAdapter.syncTransactions).toHaveBeenCalledWith({
      connection,
      timestamp: "2026-07-03T11:30:00.000Z",
    });
    expect(fallbackAdapter.syncTransactions).not.toHaveBeenCalled();
  });

  test("audits and rejects adapter transactions outside the active connection scope before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            tenantId: "other-tenant",
          },
        ]),
      },
      now: () => "2026-07-03T10:45:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Banka adaptörü aktif tenant/firma/dönem dışında hareket döndürdü.",
      ],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        entityId: connection.id,
        entityLabel: "İş Bankası / NOA-SANDBOX-001",
        entityType: "bank-integration",
        metadata: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-001",
          errors: [
            "Banka adaptörü aktif tenant/firma/dönem dışında hareket döndürdü.",
          ],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with mismatched bank name before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            bankName: "Başka Banka",
          },
        ]),
      },
      now: () => "2026-07-03T10:49:30.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü bağlantı bankası dışında hareket döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: [
            "Banka adaptörü bağlantı bankası dışında hareket döndürdü.",
          ],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("audits and returns a controlled error when the selected adapter fails", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi
          .fn()
          .mockRejectedValue(new Error("Open Banking zaman aşımı")),
      },
      now: () => "2026-07-03T11:45:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü senkronizasyon sırasında hata verdi."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-error",
        entityId: connection.id,
        entityLabel: "İş Bankası / NOA-SANDBOX-001",
        entityType: "bank-integration",
        metadata: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-001",
          errorMessage: "Open Banking zaman aşımı",
        }),
      }),
    );
  });

  test("rejects adapter transactions with duplicate external ids before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          syncedTransactions[0],
          {
            ...syncedTransactions[0],
            id: `${syncedTransactions[0].id}-duplicate`,
            occurredAt: "2026-07-03T10:20:00.000Z",
          },
        ]),
      },
      now: () => "2026-07-03T10:50:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Banka adaptörü aynı senkronizasyonda tekrar eden externalId döndürdü.",
      ],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: [
            "Banka adaptörü aynı senkronizasyonda tekrar eden externalId döndürdü.",
          ],
          rejectedTransactionCount: 2,
          transactionExternalIds: [
            "isbank-sandbox-2026-07-03-inflow",
            "isbank-sandbox-2026-07-03-inflow",
          ],
        }),
      }),
    );
  });
  test("rejects adapter transactions with duplicate transaction ids before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          syncedTransactions[0],
          {
            ...syncedTransactions[1],
            id: syncedTransactions[0].id,
          },
        ]),
      },
      now: () => "2026-07-03T10:50:30.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Banka adaptörü aynı senkronizasyonda tekrar eden hareket kimliği döndürdü.",
      ],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: [
            "Banka adaptörü aynı senkronizasyonda tekrar eden hareket kimliği döndürdü.",
          ],
          rejectedTransactionCount: 2,
          transactionExternalIds: [
            "isbank-sandbox-2026-07-03-inflow",
            "isbank-sandbox-2026-07-03-outflow",
          ],
        }),
      }),
    );
  });
  test("rejects adapter transactions with blank external id before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            externalId: "   ",
          },
        ]),
      },
      now: () => "2026-07-03T10:51:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü boş externalId döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü boş externalId döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["   "],
        }),
      }),
    );
  });
  test("rejects adapter transactions with untrimmed external id before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            externalId: ` ${syncedTransactions[0].externalId} `,
          },
        ]),
      },
      now: () => "2026-07-03T10:51:15.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü kırpılmamış externalId döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü kırpılmamış externalId döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: [" isbank-sandbox-2026-07-03-inflow "],
        }),
      }),
    );
  });
  test("rejects adapter transactions with blank transaction id before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            id: "   ",
          },
        ]),
      },
      now: () => "2026-07-03T10:51:30.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü boş hareket kimliği döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü boş hareket kimliği döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });
  test("rejects adapter transactions with untrimmed transaction id before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            id: ` ${syncedTransactions[0].id} `,
          },
        ]),
      },
      now: () => "2026-07-03T10:51:45.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü kırpılmamış hareket kimliği döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü kırpılmamış hareket kimliği döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with blank description before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            description: "   ",
          },
        ]),
      },
      now: () => "2026-07-03T10:51:55.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü boş hareket açıklaması döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü boş hareket açıklaması döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with untrimmed description before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            description: ` ${syncedTransactions[0].description} `,
          },
        ]),
      },
      now: () => "2026-07-03T10:51:58.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü kırpılmamış hareket açıklaması döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: [
            "Banka adaptörü kırpılmamış hareket açıklaması döndürdü.",
          ],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with invalid occurredAt before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            occurredAt: "not-a-date",
          },
        ]),
      },
      now: () => "2026-07-03T10:52:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü geçersiz hareket tarihi döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü geçersiz hareket tarihi döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with invalid updatedAt before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            updatedAt: "not-a-date",
          },
        ]),
      },
      now: () => "2026-07-03T10:52:30.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü geçersiz güncelleme tarihi döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü geçersiz güncelleme tarihi döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions updated before occurrence before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            occurredAt: "2026-07-03T09:00:00.000Z",
            updatedAt: "2026-07-03T08:59:59.000Z",
          },
        ]),
      },
      now: () => "2026-07-03T10:52:45.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü hareket güncelleme tarihini işlem tarihinden önce döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: [
            "Banka adaptörü hareket güncelleme tarihini işlem tarihinden önce döndürdü.",
          ],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with invalid occurredAt calendar date before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            occurredAt: "2026-02-30T09:00:00.000Z",
          },
        ]),
      },
      now: () => "2026-07-03T10:53:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü geçersiz hareket tarihi döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü geçersiz hareket tarihi döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });
  test("rejects adapter transactions with non-pending status before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            status: "matched",
          },
        ]),
      },
      now: () => "2026-07-03T10:54:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü bekleyen dışında hareket durumu döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü bekleyen dışında hareket durumu döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });
  test("rejects adapter transactions with non-TRY currency before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            currency: "USD",
          } as unknown as BankTransactionRow,
        ]),
      },
      now: () => "2026-07-03T10:54:30.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü TRY dışında para birimi döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü TRY dışında para birimi döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });
  test("rejects adapter transactions with non-finite amount before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            amount: Number.NaN,
          },
        ]),
      },
      now: () => "2026-07-03T10:54:45.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü geçersiz hareket tutarı döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü geçersiz hareket tutarı döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with invalid direction before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[1],
            direction: "transfer",
          } as unknown as BankTransactionRow,
        ]),
      },
      now: () => "2026-07-03T10:54:55.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü geçersiz hareket yönü döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü geçersiz hareket yönü döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-outflow"],
        }),
      }),
    );
  });

  test("rejects adapter transactions with inconsistent direction and amount before persistence", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertTransactions = vi.fn().mockResolvedValue([]);
    const repository = {
      ...createSeededBankIntegrationMemoryRepository({
        connections: [connection],
      }),
      upsertTransactions,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      bankAdapter: {
        syncTransactions: vi.fn().mockResolvedValue([
          {
            ...syncedTransactions[0],
            amount: -125000,
            direction: "inflow",
          },
        ]),
      },
      now: () => "2026-07-03T10:55:00.000Z",
      repository,
    });

    const result = await service.syncSandboxTransactions({
      connectionId: connection.id,
      scope: { ...defaultTenantScope, userRole: "admin" },
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Banka adaptörü yön/tutar uyumsuz hareket döndürdü."],
    });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-sync-reject",
        metadata: expect.objectContaining({
          errors: ["Banka adaptörü yön/tutar uyumsuz hareket döndürdü."],
          rejectedTransactionCount: 1,
          transactionExternalIds: ["isbank-sandbox-2026-07-03-inflow"],
        }),
      }),
    );
  });

  test("builds automatic match suggestions from amount date direction and description", () => {
    expect(
      buildBankTransactionMatchSuggestions({
        cashBankMovements: [
          matchingCashBankMovement,
          {
            ...matchingCashBankMovement,
            amount: 999,
            documentNo: "KBN-0002",
            id: "cash-movement-2",
          },
        ],
        transactions: syncedTransactions,
      }),
    ).toEqual([
      {
        bankTransactionAmount: 125000,
        bankTransactionDescription: "Sandbox hakediş tahsilatı",
        bankTransactionId: syncedTransactions[0].id,
        cashBankMovementDocumentNo: "KBN-0001",
        cashBankMovementId: "cash-movement-1",
        cashBankMovementLabel: "HAK-0001",
        matchedAmount: 125000,
        matchedDate: "2026-07-03",
        score: 95,
        statusLabel: "Öneri",
      },
    ]);
  });

  test("evaluates manual match candidates for exact and partial reconciliation drafts", () => {
    const exactCandidate = {
      amount: 125000,
      cashBankMovementDocumentNo: "KBN-0001",
      cashBankMovementId: "cash-movement-exact",
      cashBankMovementLabel: "HAK-0001",
      direction: "Giriş" as const,
      matchedDate: "2026-07-03",
    };
    const partialCandidate = {
      amount: 120000,
      cashBankMovementDocumentNo: "KBN-0002",
      cashBankMovementId: "cash-movement-partial",
      cashBankMovementLabel: "HAK-0002",
      direction: "Giriş" as const,
      matchedDate: "2026-07-04",
    };
    const oppositeDirectionCandidate = {
      amount: 125000,
      cashBankMovementDocumentNo: "KBN-0003",
      cashBankMovementId: "cash-movement-outflow",
      cashBankMovementLabel: "TED-0003",
      direction: "Çıkış" as const,
      matchedDate: "2026-07-05",
    };

    expect(
      evaluateManualBankTransactionMatchCandidates({
        candidates: [
          partialCandidate,
          oppositeDirectionCandidate,
          exactCandidate,
        ],
        transaction: syncedTransactions[0],
      }),
    ).toEqual([
      {
        ...exactCandidate,
        canApprove: true,
        differenceAmount: 0,
        matchKind: "exact",
      },
      {
        ...partialCandidate,
        canApprove: false,
        differenceAmount: 5000,
        matchKind: "partial",
      },
    ]);
  });

  test("builds cash bank movement drafts from pending bank transactions", () => {
    expect(
      buildBankTransactionCashBankMovementDrafts({
        transactions: [
          syncedTransactions[0],
          syncedTransactions[0],
          syncedTransactions[1],
          { ...syncedTransactions[0], id: "matched-bank-tx", status: "matched" },
          { ...syncedTransactions[1], id: "ignored-bank-tx", status: "ignored" },
        ],
      }),
    ).toEqual([
      {
        amount: 125000,
        bankTransactionDescription: "Sandbox hakediş tahsilatı",
        bankTransactionId: syncedTransactions[0].id,
        directionLabel: "Giriş",
        movementDate: "2026-07-03",
        movementType: "Tahsilat",
        suggestedDescription: "Banka hareketinden tahsilat: Sandbox hakediş tahsilatı",
        statusLabel: "Kayıt Taslağı",
      },
      {
        amount: 48500,
        bankTransactionDescription: "Sandbox tedarikçi ödemesi",
        bankTransactionId: syncedTransactions[1].id,
        directionLabel: "Çıkış",
        movementDate: "2026-07-03",
        movementType: "Ödeme",
        suggestedDescription: "Banka hareketinden ödeme: Sandbox tedarikçi ödemesi",
        statusLabel: "Kayıt Taslağı",
      },
    ]);
  });
  test("builds partial reconciliation drafts for pending bank transactions", () => {
    expect(
      buildBankTransactionPartialReconciliationDrafts({
        candidates: [
          {
            amount: 125000,
            cashBankMovementDocumentNo: "KBN-0001",
            cashBankMovementId: "cash-movement-exact",
            cashBankMovementLabel: "HAK-0001",
            direction: "Giriş",
            matchedDate: "2026-07-03",
          },
          {
            amount: 120000,
            cashBankMovementDocumentNo: "KBN-0002",
            cashBankMovementId: "cash-movement-partial",
            cashBankMovementLabel: "HAK-0002",
            direction: "Giriş",
            matchedDate: "2026-07-04",
          },
          {
            amount: 48000,
            cashBankMovementDocumentNo: "KBN-0003",
            cashBankMovementId: "cash-movement-outflow-partial",
            cashBankMovementLabel: "TED-0003",
            direction: "Çıkış",
            matchedDate: "2026-07-05",
          },
        ],
        transactions: [
          syncedTransactions[0],
          syncedTransactions[1],
          { ...syncedTransactions[0], id: "matched-bank-tx", status: "matched" },
        ],
      }),
    ).toEqual([
      {
        bankTransactionAmount: 125000,
        bankTransactionDescription: "Sandbox hakediş tahsilatı",
        bankTransactionId: syncedTransactions[0].id,
        cashBankMovementAmount: 120000,
        cashBankMovementDocumentNo: "KBN-0002",
        cashBankMovementId: "cash-movement-partial",
        cashBankMovementLabel: "HAK-0002",
        differenceAmount: 5000,
        matchedDate: "2026-07-04",
        statusLabel: "Kısmi Taslak",
      },
      {
        bankTransactionAmount: -48500,
        bankTransactionDescription: "Sandbox tedarikçi ödemesi",
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementAmount: 48000,
        cashBankMovementDocumentNo: "KBN-0003",
        cashBankMovementId: "cash-movement-outflow-partial",
        cashBankMovementLabel: "TED-0003",
        differenceAmount: 500,
        matchedDate: "2026-07-05",
        statusLabel: "Kısmi Taslak",
      },
    ]);
  });

  test("builds partial cash bank movement drafts for remaining bank transaction amounts", () => {
    expect(
      buildBankTransactionPartialCashBankMovementDrafts({
        candidates: [
          {
            amount: 47000,
            cashBankMovementDocumentNo: "KBN-0101",
            cashBankMovementId: "cash-movement-partial",
            cashBankMovementLabel: "PARCA-0101",
            direction: "Çıkış",
            matchedDate: "2026-07-03",
          },
        ],
        transactions: [syncedTransactions[1]],
      }),
    ).toEqual([
      {
        bankTransactionAmount: -48500,
        bankTransactionDescription: "Sandbox tedarikçi ödemesi",
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementAmount: 47000,
        cashBankMovementDocumentNo: "KBN-0101",
        cashBankMovementId: "cash-movement-partial",
        cashBankMovementLabel: "PARCA-0101",
        directionLabel: "Çıkış",
        movementDate: "2026-07-03",
        movementType: "Ödeme",
        remainingAmount: 1500,
        statusLabel: "Parçalı Kayıt Taslağı",
        suggestedDescription:
          "Banka hareketinden parçalı ödeme farkı: Sandbox tedarikçi ödemesi",
      },
    ]);
  });

  test("matches completed partial movement candidates only to their exact transaction", () => {
    const candidate = {
      amount: 1200,
      cashBankMovementDocumentNo: "KB-001",
      cashBankMovementId: "cash-movement-partial",
      cashBankMovementLabel: "Parçalı kayıt",
      direction: "Giriş" as const,
      matchedDate: "2026-07-02",
      sourceId: "bank-tx-001::cash-movement-partial",
      sourceType: "bank-transaction-partial",
    };

    expect(isPartialCashBankMovementForTransaction(candidate, "bank-tx-001")).toBe(
      true,
    );
    expect(isPartialCashBankMovementForTransaction(candidate, "bank-tx-002")).toBe(
      false,
    );
  });

  test("hides partial cash bank movement drafts when the same remaining pair was already created", () => {
    const existingPartialMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      amount: 47000,
      direction: "Çıkış",
      documentNo: "KBN-0101",
      id: "cash-movement-partial",
      movementType: "Ödeme",
      sourceLabel: "PARCA-0101",
    };
    const createdRemainingMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      amount: 1500,
      direction: "Çıkış",
      documentNo: "BNK-20260703-OUTFLOW-1GMFY2-PART-ABC123",
      id: "cash-movement-partial-difference",
      movementType: "Ödeme",
      sourceId: `${syncedTransactions[1].id}::${existingPartialMovement.id}`,
      sourceLabel: "isbank-sandbox-2026-07-03-outflow -> KBN-0101",
      sourceType: "bank-transaction-partial",
    };

    const candidates = buildManualBankTransactionMatchCandidates([
      existingPartialMovement,
      createdRemainingMovement,
    ]);

    expect(
      buildBankTransactionPartialReconciliationDrafts({
        candidates,
        transactions: [syncedTransactions[1]],
      }),
    ).toEqual([]);
    expect(
      buildBankTransactionPartialCashBankMovementDrafts({
        candidates,
        transactions: [syncedTransactions[1]],
      }),
    ).toEqual([]);
  });

  test("approves an automatic match suggestion and records audit metadata", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const ledgerEntries: BankLedgerEntryRow[] = [];
    const repository = createSeededBankIntegrationMemoryRepository({
      connections: [connection],
      transactions: syncedTransactions,
    });
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry({ entry }) {
          ledgerEntries.push(entry);

          return entry;
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:00:00.000Z",
      repository,
    });

    const result = await service.approveMatchSuggestion({
      cashBankMovementId: matchingCashBankMovement.id,
      cashBankMovements: [matchingCashBankMovement],
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[0].id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        cashBankMovement: matchingCashBankMovement,
        transaction: {
          ...syncedTransactions[0],
          status: "matched",
          updatedAt: "2026-07-03T10:00:00.000Z",
        },
      },
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [
          syncedTransactions[1],
          {
            ...syncedTransactions[0],
            status: "matched",
            updatedAt: "2026-07-03T10:00:00.000Z",
          },
        ],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.match-approve",
        entityId: syncedTransactions[0].id,
        entityLabel: "Sandbox hakediş tahsilatı -> KBN-0001",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[0].id,
          cashBankMovementDocumentNo: "KBN-0001",
          cashBankMovementId: "cash-movement-1",
          cashBankMovementLabel: "HAK-0001",
          score: 95,
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
    expect(ledgerEntries).toEqual([
      expect.objectContaining({
        amount: 125000,
        bankTransactionId: syncedTransactions[0].id,
        cashBankAccountCode: "102.01",
        cashBankAccountName: "İş Bankası TL",
        cashBankMovementId: "cash-movement-1",
        companyId: defaultTenantScope.companyId,
        currency: "TRY",
        description: "Sandbox hakediş tahsilatı -> KBN-0001",
        documentNo: "KBN-0001",
        entryDate: "2026-07-03",
        id: `${syncedTransactions[0].id}::ledger::cash-movement-1`,
        ledgerDirection: "debit",
        periodId: defaultTenantScope.periodId,
        status: "active",
        tenantId: defaultTenantScope.tenantId,
      }),
    ]);
  });

  test("reopens an automatic match when ledger persistence fails", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const repository = createSeededBankIntegrationMemoryRepository({
      connections: [connection],
      transactions: syncedTransactions,
    });
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry() {
          throw new Error("ledger unavailable");
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:05:00.000Z",
      repository,
    });

    await expect(
      service.approveMatchSuggestion({
        cashBankMovementId: matchingCashBankMovement.id,
        cashBankMovements: [matchingCashBankMovement],
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Banka eşleştirmesi ledger kaydı oluşturulamadığı için geri alındı.",
      ],
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [
          syncedTransactions[1],
          {
            ...syncedTransactions[0],
            status: "pending",
            updatedAt: "2026-07-03T10:05:00.000Z",
          },
        ],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.ledger-write-failed",
        entityId: syncedTransactions[0].id,
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[0].id,
          cashBankMovementId: matchingCashBankMovement.id,
          recovered: true,
          retryable: true,
          statusFrom: "pending",
          statusTo: "pending",
        }),
      }),
    );
  });

  test("reopens a manual match when ledger persistence fails", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockRejectedValue(new Error("audit unavailable")),
    };
    const repository = createSeededBankIntegrationMemoryRepository({
      connections: [connection],
      transactions: syncedTransactions,
    });
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry() {
          throw new Error("ledger unavailable");
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:10:00.000Z",
      repository,
    });

    await expect(
      service.approveManualMatch({
        cashBankMovementId: matchingCashBankMovement.id,
        cashBankMovements: [matchingCashBankMovement],
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Banka eşleştirmesi ledger kaydı oluşturulamadığı için geri alındı.",
      ],
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [
          syncedTransactions[1],
          {
            ...syncedTransactions[0],
            status: "pending",
            updatedAt: "2026-07-03T10:10:00.000Z",
          },
        ],
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.ledger-write-failed",
        entityId: syncedTransactions[0].id,
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[0].id,
          cashBankMovementId: matchingCashBankMovement.id,
          recovered: true,
          retryable: true,
          statusFrom: "pending",
          statusTo: "pending",
        }),
      }),
    );
  });

  test("creates a cash bank movement from a pending bank transaction draft", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const cashBankMovementRows: CashBankMovementRow[] = [];
    const ledgerEntries: BankLedgerEntryRow[] = [];
    const repository = createSeededBankIntegrationMemoryRepository({
      connections: [connection],
      transactions: syncedTransactions,
    });
    const service = createBankIntegrationService({
      auditLogRepository,
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry({ entry }) {
          ledgerEntries.push(entry);

          return entry;
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:00:00.000Z",
      repository,
    });

    const result = await service.createCashBankMovementFromTransaction({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        cashBankMovement: expect.objectContaining({
          accountCode: "102.01",
          accountName: "İş Bankası TL",
          amount: 48500,
          counterpartyName: "Banka Hareketi",
          currency: "TL",
          description:
            "Banka hareketinden ödeme: Sandbox tedarikçi ödemesi",
          direction: "Çıkış",
          documentNo: "BNK-20260703-OUTFLOW-1GMFY2",
          movementDate: "2026-07-03",
          movementType: "Ödeme",
          sourceId: syncedTransactions[1].id,
          sourceLabel: syncedTransactions[1].externalId,
          sourceType: "bank-transaction",
        }),
        transaction: {
          ...syncedTransactions[1],
          status: "matched",
          updatedAt: "2026-07-03T10:00:00.000Z",
        },
      },
    });
    expect(cashBankMovementRows).toEqual([
      expect.objectContaining({
        amount: 48500,
        documentNo: "BNK-20260703-OUTFLOW-1GMFY2",
        movementType: "Ödeme",
        sourceId: syncedTransactions[1].id,
        sourceType: "bank-transaction",
      }),
    ]);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.cash-bank-movement-create",
        entityId: syncedTransactions[1].id,
        entityLabel: "Sandbox tedarikçi ödemesi -> BNK-20260703-OUTFLOW-1GMFY2",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[1].id,
          cashBankMovementDocumentNo: "BNK-20260703-OUTFLOW-1GMFY2",
          cashBankMovementId: expect.any(String),
          cashBankMovementLabel: syncedTransactions[1].externalId,
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
    expect(ledgerEntries).toEqual([
      expect.objectContaining({
        amount: 48500,
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: expect.any(String),
        documentNo: "BNK-20260703-OUTFLOW-1GMFY2",
        ledgerDirection: "credit",
        status: "active",
      }),
    ]);
  });

  test("uses the selected cash bank account when creating a movement from a bank transaction", async () => {
    const cashBankMovementRows: CashBankMovementRow[] = [];
    const ledgerEntries: BankLedgerEntryRow[] = [];
    const service = createBankIntegrationService({
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry({ entry }) {
          ledgerEntries.push(entry);

          return entry;
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:00:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.createCashBankMovementFromTransaction({
        account: {
          code: "102.09",
          name: "QNB Şantiye Hesabı",
        },
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[1].id,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        cashBankMovement: expect.objectContaining({
          accountCode: "102.09",
          accountName: "QNB Şantiye Hesabı",
        }),
        transaction: expect.objectContaining({
          id: syncedTransactions[1].id,
          status: "matched",
        }),
      },
    });
    expect(ledgerEntries).toEqual([
      expect.objectContaining({
        cashBankAccountCode: "102.09",
        cashBankAccountName: "QNB Şantiye Hesabı",
      }),
    ]);
  });

  test("keeps a failed cash bank conversion pending and retries its existing movement", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const cashBankMovementRows: CashBankMovementRow[] = [];
    const ledgerEntries: BankLedgerEntryRow[] = [];
    const upsertEntry = vi
      .fn()
      .mockRejectedValueOnce(new Error("ledger unavailable"))
      .mockImplementation(async ({ entry }: { entry: BankLedgerEntryRow }) => {
        ledgerEntries.push(entry);
        return entry;
      });
    const service = createBankIntegrationService({
      auditLogRepository,
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        upsertEntry,
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:20:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.createCashBankMovementFromTransaction({
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[1].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Banka hareketi ledger kaydı oluşturulamadığı için kasa/banka kaydı tamamlanamadı.",
      ],
    });
    expect(cashBankMovementRows).toHaveLength(1);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.cash-bank-ledger-write-failed",
        entityId: syncedTransactions[1].id,
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[1].id,
          recovered: false,
          retryable: true,
          reusedExistingMovement: false,
          statusFrom: "pending",
          statusTo: "pending",
        }),
      }),
    );

    await expect(
      service.createCashBankMovementFromTransaction({
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[1].id,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        cashBankMovement: cashBankMovementRows[0],
        transaction: expect.objectContaining({
          id: syncedTransactions[1].id,
          status: "matched",
        }),
      },
    });
    expect(cashBankMovementRows).toHaveLength(1);
    expect(ledgerEntries).toHaveLength(1);
    expect(upsertEntry).toHaveBeenCalledTimes(2);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.cash-bank-movement-create",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[1].id,
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
  });

  test("creates a partial cash bank movement for the remaining bank transaction amount", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const partialMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      amount: 47000,
      counterpartyName: "Sandbox Tedarikçi",
      description: "Parçalı tedarikçi ödemesi",
      direction: "Çıkış",
      documentNo: "KBN-0101",
      id: "cash-movement-partial",
      movementType: "Ödeme",
      sourceLabel: "PARCA-0101",
    };
    const cashBankMovementRows: CashBankMovementRow[] = [partialMovement];
    const upsertEntry = vi.fn();
    const service = createBankIntegrationService({
      auditLogRepository,
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        upsertEntry,
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T12:00:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    const result = await service.createPartialCashBankMovementFromTransaction({
      account: {
        code: "102.09",
        name: "QNB Şantiye Hesabı",
      },
      cashBankMovementId: partialMovement.id,
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        cashBankMovement: expect.objectContaining({
          accountCode: "102.09",
          accountName: "QNB Şantiye Hesabı",
          amount: 1500,
          counterpartyName: "Banka Hareketi",
          currency: "TL",
          description:
            "Banka hareketinden parçalı ödeme farkı: Sandbox tedarikçi ödemesi",
          direction: "Çıkış",
          documentNo: expect.stringMatching(
            /^BNK-20260703-OUTFLOW-[A-Z0-9]{6}-PART-[A-Z0-9]{6}$/,
          ),
          movementDate: "2026-07-03",
          movementType: "Ödeme",
          sourceId: `${syncedTransactions[1].id}::${partialMovement.id}`,
          sourceLabel: `${syncedTransactions[1].externalId} -> KBN-0101`,
          sourceType: "bank-transaction-partial",
        }),
        transaction: expect.objectContaining({
          id: syncedTransactions[1].id,
          status: "matched",
        }),
      },
    });
    expect(cashBankMovementRows).toHaveLength(2);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.partial-cash-bank-movement-create",
        entityId: syncedTransactions[1].id,
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[1].id,
          existingCashBankMovementDocumentNo: "KBN-0101",
          existingCashBankMovementId: partialMovement.id,
          remainingAmount: 1500,
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
    expect(upsertEntry).toHaveBeenCalledTimes(2);
    expect(upsertEntry).toHaveBeenNthCalledWith(1, {
      entry: expect.objectContaining({
        amount: 47000,
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: partialMovement.id,
        documentNo: "KBN-0101",
        id: `${syncedTransactions[1].id}::ledger::${partialMovement.id}`,
      }),
      scope: { ...defaultTenantScope, userRole: "accounting" },
    });
    expect(upsertEntry).toHaveBeenNthCalledWith(2, {
      entry: expect.objectContaining({
        amount: 1500,
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: expect.stringContaining(
          "::cash-bank-movement::bank-transaction-partial::",
        ),
        id: expect.stringContaining(`${syncedTransactions[1].id}::ledger::`),
      }),
      scope: { ...defaultTenantScope, userRole: "accounting" },
    });
  });

  test("keeps a failed partial ledger conversion pending and retries both ledger entries", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const partialMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      amount: 47000,
      direction: "Çıkış",
      movementType: "Ödeme",
      documentNo: "KBN-0101",
    };
    const cashBankMovementRows: CashBankMovementRow[] = [partialMovement];
    const upsertEntry = vi
      .fn()
      .mockImplementationOnce(async ({ entry }: { entry: BankLedgerEntryRow }) => entry)
      .mockRejectedValueOnce(new Error("second ledger unavailable"))
      .mockImplementation(async ({ entry }: { entry: BankLedgerEntryRow }) => entry);
    const voidByBankTransactionId = vi.fn().mockResolvedValue(undefined);
    const service = createBankIntegrationService({
      auditLogRepository,
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        upsertEntry,
        voidByBankTransactionId,
      },
      now: () => "2026-07-03T12:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.createPartialCashBankMovementFromTransaction({
        account: { code: "102.09", name: "QNB Şantiye Hesabı" },
        cashBankMovementId: partialMovement.id,
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[1].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Parçalı banka hareketi ledger kayıtları oluşturulamadığı için işlem tamamlanamadı.",
      ],
    });
    expect(cashBankMovementRows).toHaveLength(2);
    expect(voidByBankTransactionId).toHaveBeenCalledWith(
      expect.objectContaining({
        bankTransactionId: syncedTransactions[1].id,
        updatedBy: defaultTenantScope.userId,
      }),
    );
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.partial-cash-bank-ledger-write-failed",
        entityId: syncedTransactions[1].id,
        metadata: expect.objectContaining({
          recovered: false,
          retryable: true,
          reusedExistingMovement: false,
          statusFrom: "pending",
          statusTo: "pending",
        }),
      }),
    );

    await expect(
      service.createPartialCashBankMovementFromTransaction({
        account: { code: "102.09", name: "QNB Şantiye Hesabı" },
        cashBankMovementId: partialMovement.id,
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[1].id,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        cashBankMovement: cashBankMovementRows[1],
        transaction: expect.objectContaining({
          id: syncedTransactions[1].id,
          status: "matched",
        }),
      },
    });
    expect(cashBankMovementRows).toHaveLength(2);
    expect(upsertEntry).toHaveBeenCalledTimes(4);
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.partial-cash-bank-movement-create",
        metadata: expect.objectContaining({
          reusedExistingMovement: true,
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
  });

  test("creates unique document numbers for same-day same-direction bank transactions", async () => {
    const sameDayOutflow: BankTransactionRow = {
      ...syncedTransactions[1],
      amount: -1250,
      description: "Sandbox ikinci tedarikçi ödemesi",
      externalId: "isbank-sandbox-2026-07-03-outflow-002",
      id: `${connection.id}::transaction::isbank-sandbox-2026-07-03-outflow-002`,
      status: "pending",
    };
    const cashBankMovementRows: CashBankMovementRow[] = [];
    const service = createBankIntegrationService({
      cashBankMovementRepository:
        createSeededCashBankMovementMemoryRepository(cashBankMovementRows),
      now: () => "2026-07-03T10:00:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: [syncedTransactions[1], sameDayOutflow],
      }),
    });

    await service.createCashBankMovementFromTransaction({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    });
    await service.createCashBankMovementFromTransaction({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: sameDayOutflow.id,
    });

    const documentNumbers = cashBankMovementRows.map((row) => row.documentNo);

    expect(documentNumbers).toHaveLength(2);
    expect(new Set(documentNumbers).size).toBe(2);
    expect(documentNumbers).toEqual([
      expect.stringMatching(/^BNK-20260703-OUTFLOW-[A-Z0-9]{6}$/),
      expect.stringMatching(/^BNK-20260703-OUTFLOW-[A-Z0-9]{6}$/),
    ]);
  });

  test("turns a concurrent partial movement unique conflict into a side-effect-free duplicate result", async () => {
    const auditLogRepository: AuditLogRepository = { record: vi.fn().mockResolvedValue(undefined) };
    const upsertTransactions = vi.fn();
    const partialExistingMovement: CashBankMovementRow = { ...matchingCashBankMovement, amount: 47000, direction: "Çıkış", movementType: "Ödeme" };
    const cashBankMovementRows: CashBankMovementRow[] = [partialExistingMovement];
    const cashBankMovementRepository: CashBankMovementRepository = {
      async create() {
        throw new Error("Unique constraint failed on CashBankMovement source");
      },
      async list() {
        return cashBankMovementRows;
      },
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      cashBankMovementRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() { return null; },
        async upsertEntry() { throw new Error("not used"); },
        async voidByBankTransactionId() { throw new Error("not used"); },
      },
      repository: {
        ...createSeededBankIntegrationMemoryRepository({ connections: [connection], transactions: syncedTransactions }),
        async upsertTransactions(input) {
          upsertTransactions(input);
          return input.transactions;
        },
      },
    });

    await expect(service.createPartialCashBankMovementFromTransaction({
      cashBankMovementId: partialExistingMovement.id,
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    })).resolves.toEqual({ ok: false, errors: ["Bu banka hareketi ve kasa/banka hareketi için parçalı fark kaydı zaten oluşturulmuş."] });
    expect(upsertTransactions).not.toHaveBeenCalled();
    expect(auditLogRepository.record).not.toHaveBeenCalled();
  });

  test("does not mask non-unique partial movement repository failures as duplicates", async () => {
    const cashBankMovementRepository: CashBankMovementRepository = {
      async create() { throw new Error("database unavailable"); },
      async list() { return [{ ...matchingCashBankMovement, amount: 47000, direction: "Çıkış", movementType: "Ödeme" }]; },
    };
    const service = createBankIntegrationService({
      cashBankMovementRepository,
      repository: createSeededBankIntegrationMemoryRepository({ connections: [connection], transactions: syncedTransactions }),
    });

    await expect(service.createPartialCashBankMovementFromTransaction({
      cashBankMovementId: matchingCashBankMovement.id,
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    })).resolves.toEqual({ ok: false, errors: ["Parçalı kasa/banka fark kaydı oluşturulamadı."] });
  });

  test("rejects an automatic match when the cash bank movement already has an active ledger entry", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertEntry = vi.fn();
    const existingEntry: BankLedgerEntryRow = {
      amount: 125000,
      bankTransactionId: "other-bank-transaction",
      cashBankAccountCode: "102.01",
      cashBankAccountName: "İş Bankası TL",
      cashBankMovementId: matchingCashBankMovement.id,
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-03T09:45:00.000Z",
      createdBy: defaultTenantScope.userId,
      currency: "TRY",
      description: "Önceden eşleşmiş hareket",
      documentNo: matchingCashBankMovement.documentNo,
      entryDate: matchingCashBankMovement.movementDate,
      id: "other-bank-transaction::ledger",
      ledgerDirection: "debit",
      periodId: defaultTenantScope.periodId,
      status: "active",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-03T09:45:00.000Z",
      updatedBy: defaultTenantScope.userId,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId({ cashBankMovementId }) {
          return cashBankMovementId === matchingCashBankMovement.id
            ? existingEntry
            : null;
        },
        upsertEntry,
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T10:05:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    const result = await service.approveMatchSuggestion({
      cashBankMovementId: matchingCashBankMovement.id,
      cashBankMovements: [matchingCashBankMovement],
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[0].id,
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Bu kasa/banka hareketi aktif başka bir banka eşleşmesine bağlıdır.",
      ],
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [syncedTransactions[1], syncedTransactions[0]],
      },
    });
    expect(auditLogRepository.record).not.toHaveBeenCalled();
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  test("reopens an approved bank transaction match and records audit metadata", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const voidByBankTransactionId = vi.fn().mockResolvedValue(undefined);
    const matchedTransaction: BankTransactionRow = {
      ...syncedTransactions[0],
      status: "matched",
      updatedAt: "2026-07-03T10:00:00.000Z",
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          throw new Error("not used");
        },
        async upsertEntry() {
          throw new Error("not used");
        },
        voidByBankTransactionId,
      },
      now: () => "2026-07-03T10:30:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: [matchedTransaction],
      }),
    });

    const result = await service.reopenMatchApproval({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: matchedTransaction.id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        transaction: {
          ...matchedTransaction,
          status: "pending",
          updatedAt: "2026-07-03T10:30:00.000Z",
        },
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.match-reopen",
        entityId: matchedTransaction.id,
        entityLabel: "Sandbox hakediş tahsilatı",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: matchedTransaction.id,
          statusFrom: "matched",
          statusTo: "pending",
        }),
      }),
    );
    expect(voidByBankTransactionId).toHaveBeenCalledWith({
      bankTransactionId: matchedTransaction.id,
      scope: { ...defaultTenantScope, userRole: "accounting" },
      updatedAt: "2026-07-03T10:30:00.000Z",
      updatedBy: defaultTenantScope.userId,
    });
  });

  test("ignores a pending bank transaction and records audit metadata", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      now: () => "2026-07-03T10:45:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    const result = await service.ignoreBankTransaction({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[1].id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        transaction: {
          ...syncedTransactions[1],
          status: "ignored",
          updatedAt: "2026-07-03T10:45:00.000Z",
        },
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-ignore",
        entityId: syncedTransactions[1].id,
        entityLabel: "Sandbox tedarikçi ödemesi",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[1].id,
          statusFrom: "pending",
          statusTo: "ignored",
        }),
      }),
    );
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [
          {
            ...syncedTransactions[1],
            status: "ignored",
            updatedAt: "2026-07-03T10:45:00.000Z",
          },
          syncedTransactions[0],
        ],
      },
    });
  });
  test("reopens an ignored bank transaction without touching ledger entries", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const voidByBankTransactionId = vi.fn();
    const ignoredTransaction: BankTransactionRow = {
      ...syncedTransactions[1],
      status: "ignored",
      updatedAt: "2026-07-03T10:45:00.000Z",
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          throw new Error("not used");
        },
        async upsertEntry() {
          throw new Error("not used");
        },
        voidByBankTransactionId,
      },
      now: () => "2026-07-03T11:15:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: [ignoredTransaction],
      }),
    });

    const result = await service.reopenIgnoredBankTransaction({
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: ignoredTransaction.id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        transaction: {
          ...ignoredTransaction,
          status: "pending",
          updatedAt: "2026-07-03T11:15:00.000Z",
        },
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.transaction-ignore-reopen",
        entityId: ignoredTransaction.id,
        entityLabel: "Sandbox tedarikçi ödemesi",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: ignoredTransaction.id,
          statusFrom: "ignored",
          statusTo: "pending",
        }),
      }),
    );
    expect(voidByBankTransactionId).not.toHaveBeenCalled();
  });
  test("approves a manual bank transaction match and records audit metadata", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const ledgerEntries: BankLedgerEntryRow[] = [];
    const manualMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      description: "Manuel seçilen hakediş tahsilatı",
      documentNo: "KBN-0099",
      id: "cash-movement-manual",
      movementDate: "2026-07-01",
      sourceLabel: "MANUEL-HAK-0099",
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId() {
          return null;
        },
        async upsertEntry({ entry }) {
          ledgerEntries.push(entry);

          return entry;
        },
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T11:00:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    const result = await service.approveManualMatch({
      cashBankMovementId: manualMovement.id,
      cashBankMovements: [manualMovement],
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[0].id,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        cashBankMovement: manualMovement,
        transaction: {
          ...syncedTransactions[0],
          status: "matched",
          updatedAt: "2026-07-03T11:00:00.000Z",
        },
      },
    });
    expect(auditLogRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "bank-integration.manual-match-approve",
        entityId: syncedTransactions[0].id,
        entityLabel: "Sandbox hakediş tahsilatı -> KBN-0099",
        entityType: "bank-transaction",
        metadata: expect.objectContaining({
          bankTransactionId: syncedTransactions[0].id,
          cashBankMovementDocumentNo: "KBN-0099",
          cashBankMovementId: "cash-movement-manual",
          cashBankMovementLabel: "MANUEL-HAK-0099",
          statusFrom: "pending",
          statusTo: "matched",
        }),
      }),
    );
    expect(ledgerEntries).toEqual([
      expect.objectContaining({
        amount: 125000,
        bankTransactionId: syncedTransactions[0].id,
        cashBankAccountCode: "102.01",
        cashBankMovementId: "cash-movement-manual",
        description: "Sandbox hakediş tahsilatı -> KBN-0099",
        documentNo: "KBN-0099",
        entryDate: "2026-07-01",
        id: `${syncedTransactions[0].id}::ledger::cash-movement-manual`,
        ledgerDirection: "debit",
        status: "active",
      }),
    ]);
  });

  test("rejects a manual match when the cash bank movement already has an active ledger entry", async () => {
    const auditLogRepository: AuditLogRepository = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    const upsertEntry = vi.fn();
    const manualMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      documentNo: "KBN-0100",
      id: "cash-movement-manual-conflict",
      movementDate: "2026-07-01",
      sourceLabel: "MANUEL-HAK-0100",
    };
    const existingEntry: BankLedgerEntryRow = {
      amount: 125000,
      bankTransactionId: "other-bank-transaction",
      cashBankAccountCode: manualMovement.accountCode,
      cashBankAccountName: manualMovement.accountName,
      cashBankMovementId: manualMovement.id,
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-03T09:45:00.000Z",
      createdBy: defaultTenantScope.userId,
      currency: "TRY",
      description: "Önceden eşleşmiş manuel hareket",
      documentNo: manualMovement.documentNo,
      entryDate: manualMovement.movementDate,
      id: "other-bank-transaction::ledger",
      ledgerDirection: "debit",
      periodId: defaultTenantScope.periodId,
      status: "active",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-03T09:45:00.000Z",
      updatedBy: defaultTenantScope.userId,
    };
    const service = createBankIntegrationService({
      auditLogRepository,
      ledgerRepository: {
        async findActiveByCashBankMovementId({ cashBankMovementId }) {
          return cashBankMovementId === manualMovement.id ? existingEntry : null;
        },
        upsertEntry,
        async voidByBankTransactionId() {
          throw new Error("not used");
        },
      },
      now: () => "2026-07-03T11:05:00.000Z",
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    const result = await service.approveManualMatch({
      cashBankMovementId: manualMovement.id,
      cashBankMovements: [manualMovement],
      scope: { ...defaultTenantScope, userRole: "accounting" },
      transactionId: syncedTransactions[0].id,
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Bu kasa/banka hareketi aktif başka bir banka eşleşmesine bağlıdır.",
      ],
    });
    await expect(
      service.listConnections({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        rows: [connection],
        supportedBanks: getSupportedBankIntegrations(),
        transactions: [syncedTransactions[1], syncedTransactions[0]],
      },
    });
    expect(auditLogRepository.record).not.toHaveBeenCalled();
    expect(upsertEntry).not.toHaveBeenCalled();
  });

  test("rejects transaction sync when the connection is missing or user is not admin", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository(),
    });

    await expect(
      service.syncSandboxTransactions({
        connectionId: connection.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka hareketi senkronizasyon yetkisi yalnız admin rolündedir."],
    });

    await expect(
      service.syncSandboxTransactions({
        connectionId: connection.id,
        scope: { ...defaultTenantScope, userRole: "admin" },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Sandbox banka bağlantısı bulunamadı."],
    });
  });

  test("rejects match approval without accounting permission or current suggestion", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.approveMatchSuggestion({
        cashBankMovementId: matchingCashBankMovement.id,
        cashBankMovements: [matchingCashBankMovement],
        scope: { ...defaultTenantScope, userRole: "viewer" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka eşleştirme onayı için muhasebe yetkisi gereklidir."],
    });

    await expect(
      service.approveMatchSuggestion({
        cashBankMovementId: "missing-movement",
        cashBankMovements: [matchingCashBankMovement],
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Onaylanabilir banka eşleşme önerisi bulunamadı."],
    });
  });

  test("rejects ignored transaction reopen without accounting permission or ignored transaction", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.reopenIgnoredBankTransaction({
        scope: { ...defaultTenantScope, userRole: "viewer" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Banka hareketi yoksayma geri alma için muhasebe yetkisi gereklidir.",
      ],
    });

    await expect(
      service.reopenIgnoredBankTransaction({
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Geri alınabilir yoksayılmış banka hareketi bulunamadı."],
    });
  });
  test("rejects transaction ignore without accounting permission or pending transaction", async () => {
    const matchedTransaction: BankTransactionRow = {
      ...syncedTransactions[0],
      status: "matched",
      updatedAt: "2026-07-03T10:00:00.000Z",
    };
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: [matchedTransaction],
      }),
    });

    await expect(
      service.ignoreBankTransaction({
        scope: { ...defaultTenantScope, userRole: "viewer" },
        transactionId: matchedTransaction.id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka hareketi yoksayma için muhasebe yetkisi gereklidir."],
    });

    await expect(
      service.ignoreBankTransaction({
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: matchedTransaction.id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Yoksayılabilir bekleyen banka hareketi bulunamadı."],
    });
  });
  test("rejects match reopen without accounting permission or matched transaction", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });

    await expect(
      service.reopenMatchApproval({
        scope: { ...defaultTenantScope, userRole: "viewer" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka eşleştirme geri alma için muhasebe yetkisi gereklidir."],
    });

    await expect(
      service.reopenMatchApproval({
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Geri alınabilir eşleşmiş banka hareketi bulunamadı."],
    });
  });

  test("rejects manual match without accounting permission or compatible movement", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository({
        connections: [connection],
        transactions: syncedTransactions,
      }),
    });
    const partialMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      amount: 120000,
      id: "cash-movement-partial",
    };
    const incompatibleMovement: CashBankMovementRow = {
      ...matchingCashBankMovement,
      direction: "Çıkış",
      id: "cash-movement-incompatible",
    };

    await expect(
      service.approveManualMatch({
        cashBankMovementId: matchingCashBankMovement.id,
        cashBankMovements: [matchingCashBankMovement],
        scope: { ...defaultTenantScope, userRole: "viewer" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka manuel eşleştirme için muhasebe yetkisi gereklidir."],
    });

    await expect(
      service.approveManualMatch({
        cashBankMovementId: partialMovement.id,
        cashBankMovements: [partialMovement],
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Kısmi mutabakat onayı henüz açılmadı; fark 5.000,00 TL olarak taslakta izlenir.",
      ],
    });

    await expect(
      service.approveManualMatch({
        cashBankMovementId: incompatibleMovement.id,
        cashBankMovements: [incompatibleMovement],
        scope: { ...defaultTenantScope, userRole: "accounting" },
        transactionId: syncedTransactions[0].id,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Manuel eşleştirme için tutar ve yön uyumlu olmalıdır."],
    });
  });

  test("rejects non-admin sandbox tests and unsupported banks", async () => {
    const service = createBankIntegrationService({
      repository: createSeededBankIntegrationMemoryRepository(),
    });

    await expect(
      service.testSandboxConnection({
        scope: defaultTenantScope,
        values: {
          bankCode: "ziraat",
          consentId: "NOA-SANDBOX-001",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Banka entegrasyonu test yetkisi yalnız admin rolündedir."],
    });

    await expect(
      service.testSandboxConnection({
        scope: { ...defaultTenantScope, userRole: "admin" },
        values: {
          bankCode: "ziraat",
          consentId: "",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Seçilen banka sandbox bağlantısına açık değildir.",
        "Rıza numarası zorunludur.",
      ],
    });
  });

  test("summarizes active ledger entries by cash bank account", () => {
    const baseLedgerEntry: BankLedgerEntryRow = {
      amount: 0,
      bankTransactionId: "ledger-transaction",
      cashBankAccountCode: "102.01",
      cashBankAccountName: "İş Bankası TL",
      cashBankMovementId: "ledger-movement",
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-13T09:00:00.000Z",
      createdBy: defaultTenantScope.userId,
      currency: "TRY",
      description: "Ledger test",
      documentNo: "LEDGER-TEST",
      entryDate: "2026-07-13",
      id: "ledger-test",
      ledgerDirection: "debit",
      periodId: defaultTenantScope.periodId,
      status: "active",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-13T09:00:00.000Z",
      updatedBy: defaultTenantScope.userId,
    };
    expect(
      summarizeActiveBankLedgerByAccount([
        {
          ...baseLedgerEntry,
          amount: 100,
          cashBankAccountCode: "102.02",
          cashBankAccountName: "QNB TL",
          id: "ledger-test-1",
        },
        {
          ...baseLedgerEntry,
          id: "ledger-test-2",
          amount: 40,
          ledgerDirection: "credit",
        },
        {
          ...baseLedgerEntry,
          id: "ledger-test-3",
          amount: 999,
          status: "voided",
        },
      ]),
    ).toEqual([
      {
        accountCode: "102.01",
        accountName: "İş Bankası TL",
        activeEntryCount: 1,
        debitTotal: 0,
        creditTotal: 40,
        currency: "TRY",
      },
      {
        accountCode: "102.02",
        accountName: "QNB TL",
        activeEntryCount: 1,
        debitTotal: 100,
        creditTotal: 0,
        currency: "TRY",
      },
    ]);
  });

  test("detects bank ledger reconciliation gaps without counting voided traces", () => {
    const baseLedgerEntry: BankLedgerEntryRow = {
      amount: 100,
      bankTransactionId: "matched-partial",
      cashBankAccountCode: "102.01",
      cashBankAccountName: "İş Bankası TL",
      cashBankMovementId: "movement-1",
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-13T09:00:00.000Z",
      createdBy: defaultTenantScope.userId,
      currency: "TRY",
      description: "Ledger test",
      documentNo: "LEDGER-TEST",
      entryDate: "2026-07-13",
      id: "ledger-test",
      ledgerDirection: "debit",
      periodId: defaultTenantScope.periodId,
      status: "active",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-13T09:00:00.000Z",
      updatedBy: defaultTenantScope.userId,
    };

    expect(
      buildBankLedgerReconciliationIssues(
        [
          {
            amount: 150,
            bankName: "İş Bankası",
            currency: "TRY",
            description: "Parçalı ve tutarlı hareket",
            direction: "inflow",
            id: "matched-partial",
            occurredAt: "2026-07-13T09:00:00.000Z",
            status: "matched",
            statusLabel: "Eşleştirildi",
          },
          {
            amount: -80,
            bankName: "İş Bankası",
            currency: "TRY",
            description: "Eksik izli hareket",
            direction: "outflow",
            id: "matched-missing",
            occurredAt: "2026-07-13T09:00:00.000Z",
            status: "matched",
            statusLabel: "Eşleştirildi",
          },
          {
            amount: 40,
            bankName: "İş Bankası",
            currency: "TRY",
            description: "Bekleyen çakışmalı hareket",
            direction: "inflow",
            id: "pending-with-ledger",
            occurredAt: "2026-07-13T09:00:00.000Z",
            status: "pending",
            statusLabel: "Bekliyor",
          },
        ],
        [
          baseLedgerEntry,
          {
            ...baseLedgerEntry,
            amount: 50,
            cashBankMovementId: "movement-2",
            id: "ledger-test-2",
          },
          {
            ...baseLedgerEntry,
            id: "ledger-test-duplicate",
          },
          {
            ...baseLedgerEntry,
            bankTransactionId: "pending-with-ledger",
            cashBankMovementId: "movement-3",
            id: "ledger-test-3",
          },
          {
            ...baseLedgerEntry,
            bankTransactionId: "matched-missing",
            cashBankMovementId: "movement-4",
            id: "ledger-test-4",
            status: "voided",
          },
          {
            ...baseLedgerEntry,
            bankTransactionId: "orphan-transaction",
            cashBankMovementId: "movement-5",
            id: "ledger-test-5",
          },
        ],
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bankTransactionId: "pending-with-ledger",
          issueType: "unexpected-active-ledger",
        }),
        expect.objectContaining({
          bankTransactionId: "matched-missing",
          issueType: "missing-active-ledger",
        }),
        expect.objectContaining({
          bankTransactionId: "matched-partial",
          issueType: "duplicate-active-ledger",
          activeLedgerEntryCount: 2,
        }),
        expect.objectContaining({
          bankTransactionId: "orphan-transaction",
          issueType: "orphan-active-ledger",
        }),
      ]),
    );
  });

  test("keeps reconciliation issue labels aligned with issue types", () => {
    expect(getBankLedgerReconciliationIssueLabel("amount-mismatch")).toBe(
      "Ledger tutarı uyumsuz",
    );
    expect(getBankLedgerReconciliationIssueLabel("direction-mismatch")).toBe(
      "Ledger yönü uyumsuz",
    );
    expect(getBankLedgerReconciliationIssueLabel("duplicate-active-ledger")).toBe(
      "Aynı kasa/banka bağlantısında yinelenen aktif iz",
    );
    expect(getBankLedgerReconciliationIssueLabel("missing-active-ledger")).toBe(
      "Aktif ledger izi eksik",
    );
    expect(getBankLedgerReconciliationIssueLabel("orphan-active-ledger")).toBe(
      "Sahipsiz aktif ledger izi",
    );
    expect(
      getBankLedgerReconciliationIssueLabel("unexpected-active-ledger"),
    ).toBe("Eşleşmemiş harekette aktif iz");
  });

  test("builds a scoped retryable ledger failure read-model from audit entries", () => {
    const baseEntry = {
      actorUserId: defaultTenantScope.userId,
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-13T12:00:00.000Z",
      entityId: syncedTransactions[1].id,
      entityLabel: "Sandbox tedarikçi ödemesi -> BNK-001",
      entityType: "bank-transaction",
      id: "audit-ledger-failure",
      metadata: {
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: "cash-movement-partial",
        recovered: false,
        retryable: true,
        statusFrom: "pending",
        statusTo: "pending",
      },
      occurredAt: "2026-07-13T12:00:00.000Z",
      periodId: defaultTenantScope.periodId,
      tenantId: defaultTenantScope.tenantId,
    };

    expect(
      buildBankLedgerFailureAuditReadModel([
        {
          ...baseEntry,
          action: "bank-integration.partial-cash-bank-ledger-write-failed",
        },
        {
          ...baseEntry,
          action: "bank-integration.cash-bank-movement-create",
          id: "audit-unrelated",
        },
        {
          ...baseEntry,
          action: "bank-integration.ledger-write-failed",
          id: "audit-non-retryable",
          metadata: {
            ...baseEntry.metadata,
            retryable: false,
          },
        },
        {
          ...baseEntry,
          action: "bank-integration.ledger-write-failed",
          id: "audit-unknown-status",
          metadata: {
            ...baseEntry.metadata,
            statusFrom: "unexpected",
          },
        },
      ]),
    ).toEqual([
      {
        action: "bank-integration.partial-cash-bank-ledger-write-failed",
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: "cash-movement-partial",
        entityLabel: "Sandbox tedarikçi ödemesi -> BNK-001",
        occurredAt: "2026-07-13T12:00:00.000Z",
        recovered: false,
        retryable: true,
        failureTypeLabel: "Parçalı kasa/banka",
        statusTransitionLabel: "Bekliyor → Bekliyor",
      },
      {
        action: "bank-integration.ledger-write-failed",
        bankTransactionId: syncedTransactions[1].id,
        cashBankMovementId: "cash-movement-partial",
        entityLabel: "Sandbox tedarikçi ödemesi -> BNK-001",
        occurredAt: "2026-07-13T12:00:00.000Z",
        recovered: false,
        retryable: true,
        failureTypeLabel: "Eşleştirme",
      },
    ]);
  });
});

function createSeededCashBankMovementMemoryRepository(
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









