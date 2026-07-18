import type {
  AuditLogEntry,
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type {
  CashBankAccountOption,
  CashBankMovementRepository,
  CashBankMovementRow,
} from "./cash-bank-movement-service";
import type { TenantScope } from "./tenant-scope";
import { buildTenantScopeKey, validateTenantScope } from "./tenant-scope";

export type BankIntegrationSupportedBank = {
  bankCode: string;
  bankName: string;
  status: "Mevcut" | "Yakında";
};

export type BankIntegrationConnectionRow = {
  bankCode: string;
  bankName: string;
  companyId: string;
  consentId: string;
  createdAt: string;
  createdBy: string;
  environment: "sandbox";
  id: string;
  lastTestedAt: string;
  lastTestMessage: string;
  lastTestStatus: "success" | "failed";
  periodId: string;
  status: "connected" | "failed";
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type BankIntegrationConnectionView = Pick<
  BankIntegrationConnectionRow,
  | "bankCode"
  | "bankName"
  | "consentId"
  | "id"
  | "lastTestedAt"
  | "lastTestMessage"
  | "lastTestStatus"
  | "status"
> & {
  environmentLabel: "Sandbox";
  statusLabel: "Bağlı" | "Hatalı";
};

export type BankTransactionRow = {
  amount: number;
  bankConnectionId: string;
  bankName: string;
  companyId: string;
  currency: "TRY";
  description: string;
  direction: "inflow" | "outflow";
  externalId: string;
  id: string;
  occurredAt: string;
  periodId: string;
  status: "pending" | "matched" | "ignored";
  tenantId: string;
  updatedAt: string;
};

export type BankTransactionView = Pick<
  BankTransactionRow,
  | "amount"
  | "bankName"
  | "currency"
  | "description"
  | "direction"
  | "id"
  | "occurredAt"
  | "status"
> & {
  statusLabel: "Bekliyor" | "Eşleştirildi" | "Yoksayıldı";
};

export type BankTransactionMatchSuggestion = {
  bankTransactionAmount: number;
  bankTransactionDescription: string;
  bankTransactionId: string;
  cashBankMovementDocumentNo: string;
  cashBankMovementId: string;
  cashBankMovementLabel: string;
  matchedAmount: number;
  matchedDate: string;
  score: number;
  statusLabel: "Öneri";
};

export type BankTransactionManualMatchCandidate = {
  amount: number;
  cashBankMovementDocumentNo: string;
  cashBankMovementId: string;
  cashBankMovementLabel: string;
  direction: CashBankMovementRow["direction"];
  matchedDate: string;
  sourceId?: string;
  sourceType?: string;
};

export type BankTransactionManualMatchCandidateEvaluation =
  BankTransactionManualMatchCandidate & {
    canApprove: boolean;
    differenceAmount: number;
    matchKind: "exact" | "partial";
  };

export type BankTransactionCashBankMovementDraft = {
  amount: number;
  bankTransactionDescription: string;
  bankTransactionId: string;
  directionLabel: CashBankMovementRow["direction"];
  movementDate: string;
  movementType: "Tahsilat" | "Ödeme";
  statusLabel: "Kayıt Taslağı";
  suggestedDescription: string;
};
export type BankTransactionPartialReconciliationDraft = {
  bankTransactionAmount: number;
  bankTransactionDescription: string;
  bankTransactionId: string;
  cashBankMovementAmount: number;
  cashBankMovementDocumentNo: string;
  cashBankMovementId: string;
  cashBankMovementLabel: string;
  differenceAmount: number;
  matchedDate: string;
  statusLabel: "Kısmi Taslak";
};

export type BankTransactionPartialCashBankMovementDraft = {
  bankTransactionAmount: number;
  bankTransactionDescription: string;
  bankTransactionId: string;
  cashBankMovementAmount: number;
  cashBankMovementDocumentNo: string;
  cashBankMovementId: string;
  cashBankMovementLabel: string;
  directionLabel: CashBankMovementRow["direction"];
  movementDate: string;
  movementType: "Tahsilat" | "Ödeme";
  remainingAmount: number;
  statusLabel: "Parçalı Kayıt Taslağı";
  suggestedDescription: string;
};

export type BankLedgerEntryRow = {
  amount: number;
  bankTransactionId: string;
  cashBankAccountCode: string;
  cashBankAccountName: string;
  cashBankMovementId: string;
  companyId: string;
  createdAt: string;
  createdBy: string;
  currency: "TRY";
  description: string;
  documentNo: string;
  entryDate: string;
  id: string;
  ledgerDirection: "credit" | "debit";
  periodId: string;
  status: "active" | "voided";
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type BankLedgerFailureAuditView = {
  action: string;
  bankTransactionId: string;
  cashBankMovementId: string;
  entityLabel: string;
  occurredAt: string;
  recovered: boolean;
  retryable: true;
  failureTypeLabel: "Eşleştirme" | "Yeni kasa/banka" | "Parçalı kasa/banka";
  statusTransitionLabel?: string;
};

const bankLedgerFailureActions = new Set([
  "bank-integration.cash-bank-ledger-write-failed",
  "bank-integration.ledger-write-failed",
  "bank-integration.partial-cash-bank-ledger-write-failed",
]);

function getBankLedgerFailureTypeLabel(
  action: string,
): BankLedgerFailureAuditView["failureTypeLabel"] {
  if (action === "bank-integration.ledger-write-failed") {
    return "Eşleştirme";
  }
  if (action === "bank-integration.partial-cash-bank-ledger-write-failed") {
    return "Parçalı kasa/banka";
  }
  return "Yeni kasa/banka";
}

function formatBankLedgerFailureStatus(status: string): string | undefined {
  if (status === "pending") return "Bekliyor";
  if (status === "matched") return "Eşleştirildi";
  if (status === "ignored") return "Yoksayıldı";
  return undefined;
}

export function buildBankLedgerFailureAuditReadModel(
  entries: AuditLogEntry[],
): BankLedgerFailureAuditView[] {
  return entries.flatMap((entry) => {
    if (!bankLedgerFailureActions.has(entry.action)) return [];

    const metadata = entry.metadata;
    if (metadata.retryable !== true) return [];
    if (
      typeof metadata.bankTransactionId !== "string" ||
      typeof metadata.cashBankMovementId !== "string"
    ) {
      return [];
    }

    const statusFrom =
      typeof metadata.statusFrom === "string" ? metadata.statusFrom : undefined;
    const statusTo =
      typeof metadata.statusTo === "string" ? metadata.statusTo : undefined;

    const statusFromLabel = statusFrom
      ? formatBankLedgerFailureStatus(statusFrom)
      : undefined;
    const statusToLabel = statusTo
      ? formatBankLedgerFailureStatus(statusTo)
      : undefined;

    return [
      {
        action: entry.action,
        bankTransactionId: metadata.bankTransactionId,
        cashBankMovementId: metadata.cashBankMovementId,
        entityLabel: entry.entityLabel,
        occurredAt: entry.occurredAt,
        recovered: metadata.recovered === true,
        retryable: true,
        failureTypeLabel: getBankLedgerFailureTypeLabel(entry.action),
        ...(statusFromLabel && statusToLabel
          ? {
              statusTransitionLabel: `${statusFromLabel} → ${statusToLabel}`,
            }
          : {}),
      },
    ];
  });
}

export type BankLedgerAccountSummary = {
  accountCode: string;
  accountName: string;
  activeEntryCount: number;
  debitTotal: number;
  creditTotal: number;
  currency: "TRY";
};

export const bankLedgerReconciliationIssueTypes = [
  "amount-mismatch",
  "direction-mismatch",
  "duplicate-active-ledger",
  "missing-active-ledger",
  "orphan-active-ledger",
  "unexpected-active-ledger",
] as const;

export type BankLedgerReconciliationIssueType =
  (typeof bankLedgerReconciliationIssueTypes)[number];

export const bankLedgerReconciliationIssueLabels: Record<
  BankLedgerReconciliationIssueType,
  string
> = {
  "amount-mismatch": "Ledger tutarı uyumsuz",
  "direction-mismatch": "Ledger yönü uyumsuz",
  "duplicate-active-ledger": "Aynı kasa/banka bağlantısında yinelenen aktif iz",
  "missing-active-ledger": "Aktif ledger izi eksik",
  "orphan-active-ledger": "Sahipsiz aktif ledger izi",
  "unexpected-active-ledger": "Eşleşmemiş harekette aktif iz",
};

export function getBankLedgerReconciliationIssueLabel(
  issueType: BankLedgerReconciliationIssueType,
): string {
  return bankLedgerReconciliationIssueLabels[issueType];
}

export type BankLedgerReconciliationIssue = {
  activeLedgerAmount: number;
  activeLedgerEntryCount: number;
  bankTransactionDescription: string;
  bankTransactionId: string;
  expectedAmount?: number;
  issueType: BankLedgerReconciliationIssueType;
  statusLabel: string;
};

export function buildBankLedgerReconciliationIssues(
  transactions: BankTransactionView[],
  entries: BankLedgerEntryRow[],
): BankLedgerReconciliationIssue[] {
  const activeEntriesByTransaction = new Map<string, BankLedgerEntryRow[]>();

  for (const entry of entries) {
    if (entry.status !== "active") continue;
    const transactionEntries =
      activeEntriesByTransaction.get(entry.bankTransactionId) ?? [];
    transactionEntries.push(entry);
    activeEntriesByTransaction.set(entry.bankTransactionId, transactionEntries);
  }

  const issues: BankLedgerReconciliationIssue[] = [];
  const transactionIds = new Set(transactions.map((transaction) => transaction.id));

  for (const transaction of transactions) {
    const activeEntries = activeEntriesByTransaction.get(transaction.id) ?? [];
    const activeLedgerAmount = activeEntries.reduce(
      (total, entry) => total + entry.amount,
      0,
    );
    const issueBase = {
      activeLedgerAmount,
      activeLedgerEntryCount: activeEntries.length,
      bankTransactionDescription: transaction.description,
      bankTransactionId: transaction.id,
      expectedAmount: Math.abs(transaction.amount),
    };

    const activeEntriesByCashBankMovement = new Map<
      string,
      BankLedgerEntryRow[]
    >();
    for (const entry of activeEntries) {
      const movementEntries =
        activeEntriesByCashBankMovement.get(entry.cashBankMovementId) ?? [];
      movementEntries.push(entry);
      activeEntriesByCashBankMovement.set(
        entry.cashBankMovementId,
        movementEntries,
      );
    }
    for (const duplicateEntries of activeEntriesByCashBankMovement.values()) {
      if (duplicateEntries.length < 2) continue;
      issues.push({
        ...issueBase,
        activeLedgerAmount: duplicateEntries.reduce(
          (total, entry) => total + entry.amount,
          0,
        ),
        activeLedgerEntryCount: duplicateEntries.length,
        issueType: "duplicate-active-ledger",
        statusLabel: getBankLedgerReconciliationIssueLabel(
          "duplicate-active-ledger",
        ),
      });
    }

    if (transaction.status !== "matched") {
      if (activeEntries.length) {
        issues.push({
          ...issueBase,
          issueType: "unexpected-active-ledger",
          statusLabel: "Eşleşmemiş harekette aktif iz",
        });
      }
      continue;
    }

    if (!activeEntries.length) {
      issues.push({
        ...issueBase,
        issueType: "missing-active-ledger",
        statusLabel: "Aktif ledger izi eksik",
      });
      continue;
    }

    const expectedDirection =
      transaction.direction === "inflow" ? "debit" : "credit";
    if (activeEntries.some((entry) => entry.ledgerDirection !== expectedDirection)) {
      issues.push({
        ...issueBase,
        issueType: "direction-mismatch",
        statusLabel: "Ledger yönü uyumsuz",
      });
    }

    if (
      Math.round(activeLedgerAmount * 100) !==
      Math.round(Math.abs(transaction.amount) * 100)
    ) {
      issues.push({
        ...issueBase,
        issueType: "amount-mismatch",
        statusLabel: "Ledger tutarı uyumsuz",
      });
    }
  }

  for (const [bankTransactionId, activeEntries] of activeEntriesByTransaction) {
    if (transactionIds.has(bankTransactionId)) continue;
    issues.push({
      activeLedgerAmount: activeEntries.reduce(
        (total, entry) => total + entry.amount,
        0,
      ),
      activeLedgerEntryCount: activeEntries.length,
      bankTransactionDescription: "Banka hareketi read-model içinde bulunamadı",
      bankTransactionId,
      issueType: "orphan-active-ledger",
      statusLabel: "Sahipsiz aktif ledger izi",
    });
  }

  return issues.sort((left, right) =>
    `${left.bankTransactionDescription} ${left.bankTransactionId}`.localeCompare(
      `${right.bankTransactionDescription} ${right.bankTransactionId}`,
      "tr",
    ),
  );
}

export function summarizeActiveBankLedgerByAccount(
  entries: BankLedgerEntryRow[],
): BankLedgerAccountSummary[] {
  const summaries = new Map<string, BankLedgerAccountSummary>();

  for (const entry of entries) {
    if (entry.status !== "active") continue;
    const key = `${entry.cashBankAccountCode}::${entry.cashBankAccountName}`;
    const summary = summaries.get(key) ?? {
      accountCode: entry.cashBankAccountCode,
      accountName: entry.cashBankAccountName,
      activeEntryCount: 0,
      debitTotal: 0,
      creditTotal: 0,
      currency: "TRY",
    };
    summary.activeEntryCount += 1;
    if (entry.ledgerDirection === "debit") {
      summary.debitTotal += entry.amount;
    } else {
      summary.creditTotal += entry.amount;
    }
    summaries.set(key, summary);
  }

  return [...summaries.values()].sort((left, right) =>
    `${left.accountCode} ${left.accountName}`.localeCompare(
      `${right.accountCode} ${right.accountName}`,
      "tr",
    ),
  );
}

export type BankIntegrationOverview = {
  connections: BankIntegrationConnectionView[];
  manualMatchCandidates?: BankTransactionManualMatchCandidate[];
  matchSuggestions: BankTransactionMatchSuggestion[];
  recentTransactions: BankTransactionView[];
  supportedBanks: BankIntegrationSupportedBank[];
  ledgerEntries?: BankLedgerEntryRow[];
  ledgerFailureAudits?: BankLedgerFailureAuditView[];
};

export type BankIntegrationTestValues = {
  bankCode: string;
  consentId: string;
};

export type BankIntegrationResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type BankTransactionSyncDateRange = {
  dateFrom?: string;
  dateTo?: string;
};

export type BankIntegrationRepository = {
  listConnections(input: {
    scope: TenantScope;
  }): Promise<BankIntegrationConnectionRow[]>;
  listTransactions(input: {
    scope: TenantScope;
  }): Promise<BankTransactionRow[]>;
  upsertConnection(input: {
    connection: BankIntegrationConnectionRow;
    scope: TenantScope;
  }): Promise<BankIntegrationConnectionRow>;
  upsertTransactions(input: {
    preserveExistingStatus?: boolean;
    scope: TenantScope;
    transactions: BankTransactionRow[];
  }): Promise<BankTransactionRow[]>;
};

export type BankAdapter = {
  syncTransactions(input: {
    connection: BankIntegrationConnectionRow;
    dateFrom?: string;
    dateTo?: string;
    timestamp: string;
  }): Promise<BankTransactionRow[]> | BankTransactionRow[];
};

export type BankAdapterRegistry = Partial<Record<string, BankAdapter>>;

export type BankLedgerEntryRepository = {
  listEntries?: (input: {
    bankTransactionIds?: string[];
    scope: TenantScope;
  }) => Promise<BankLedgerEntryRow[]>;
  findActiveByCashBankMovementId(input: {
    cashBankMovementId: string;
    scope: TenantScope;
  }): Promise<BankLedgerEntryRow | null>;
  upsertEntry(input: {
    entry: BankLedgerEntryRow;
    scope: TenantScope;
  }): Promise<BankLedgerEntryRow>;
  voidByBankTransactionId(input: {
    bankTransactionId: string;
    scope: TenantScope;
    updatedAt: string;
    updatedBy: string;
  }): Promise<void>;
};

const supportedBanks: BankIntegrationSupportedBank[] = [
  { bankCode: "vakifbank", bankName: "VakıfBank", status: "Mevcut" },
  { bankCode: "isbank", bankName: "İş Bankası", status: "Mevcut" },
  { bankCode: "qnb", bankName: "QNB Finansbank", status: "Mevcut" },
  { bankCode: "akbank", bankName: "Akbank", status: "Mevcut" },
  { bankCode: "yapikredi", bankName: "Yapı Kredi", status: "Mevcut" },
  { bankCode: "garanti", bankName: "Garanti BBVA", status: "Mevcut" },
  { bankCode: "ziraat", bankName: "Ziraat Bankası", status: "Yakında" },
];

export function createBankIntegrationService({
  auditLogRepository,
  bankAdapter = createSandboxBankAdapter(),
  bankAdapters = {},
  cashBankMovementRepository,
  ledgerRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository & Partial<AuditLogReadRepository>;
  bankAdapter?: BankAdapter;
  bankAdapters?: BankAdapterRegistry;
  cashBankMovementRepository?: CashBankMovementRepository;
  ledgerRepository?: BankLedgerEntryRepository;
  now?: () => string;
  repository: BankIntegrationRepository;
}) {
  return {
    async listConnections({
      scope,
    }: {
      scope: TenantScope;
    }): Promise<
      BankIntegrationResult<{
        ledgerFailureAudits?: BankLedgerFailureAuditView[];
        rows: BankIntegrationConnectionRow[];
        ledgerEntries?: BankLedgerEntryRow[];
        supportedBanks: BankIntegrationSupportedBank[];
        transactions: BankTransactionRow[];
      }>
    > {
      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const data: {
        ledgerFailureAudits?: BankLedgerFailureAuditView[];
        ledgerEntries?: BankLedgerEntryRow[];
        rows: BankIntegrationConnectionRow[];
        supportedBanks: BankIntegrationSupportedBank[];
        transactions: BankTransactionRow[];
      } = {
        rows: await repository.listConnections({ scope }),
        supportedBanks: getSupportedBankIntegrations(),
        transactions: await repository.listTransactions({ scope }),
      };

      if (ledgerRepository?.listEntries) {
        data.ledgerEntries = await ledgerRepository.listEntries({
          bankTransactionIds: data.transactions.map((transaction) => transaction.id),
          scope,
        });
      }

      if (auditLogRepository?.listByEntityType) {
        data.ledgerFailureAudits = buildBankLedgerFailureAuditReadModel(
          await auditLogRepository.listByEntityType({
            entityType: "bank-transaction",
            limit: 50,
            scope,
          }),
        );
      }

      return { ok: true, data };
    },

    async testSandboxConnection({
      scope,
      values,
    }: {
      scope: TenantScope;
      values: BankIntegrationTestValues;
    }): Promise<
      BankIntegrationResult<{ connection: BankIntegrationConnectionRow }>
    > {
      if (scope.userRole !== "admin") {
        return {
          ok: false,
          errors: ["Banka entegrasyonu test yetkisi yalnız admin rolündedir."],
        };
      }

      const normalized = normalizeTestValues(values);
      const errors = validateTestValues(normalized);

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const bank = getSupportedBankIntegrations().find(
        (candidate) => candidate.bankCode === normalized.bankCode,
      )!;
      const timestamp = now();
      const connection: BankIntegrationConnectionRow = {
        bankCode: bank.bankCode,
        bankName: bank.bankName,
        companyId: scope.companyId,
        consentId: normalized.consentId,
        createdAt: timestamp,
        createdBy: scope.userId,
        environment: "sandbox",
        id: createBankIntegrationConnectionId(scope, bank.bankCode),
        lastTestedAt: timestamp,
        lastTestMessage: "Sandbox bağlantısı doğrulandı.",
        lastTestStatus: "success",
        periodId: scope.periodId,
        status: "connected",
        tenantId: scope.tenantId,
        updatedAt: timestamp,
        updatedBy: scope.userId,
      };
      const savedConnection = await repository.upsertConnection({
        connection,
        scope,
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.sandbox-test",
          entityId: savedConnection.id,
          entityLabel: `${savedConnection.bankName} / ${savedConnection.consentId}`,
          entityType: "bank-integration",
          metadata: {
            bankCode: savedConnection.bankCode,
            consentId: savedConnection.consentId,
            environment: savedConnection.environment,
            lastTestStatus: savedConnection.lastTestStatus,
            statusTo: savedConnection.status,
          },
          occurredAt: timestamp,
        }),
      );
      return {
        ok: true,
        data: {
          connection: savedConnection,
        },
      };
    },

    async syncSandboxTransactions({
      connectionId,
      dateFrom,
      dateTo,
      scope,
    }: {
      connectionId: string;
      scope: TenantScope;
    } & BankTransactionSyncDateRange): Promise<
      BankIntegrationResult<{
        preservedStatusCount: number;
        syncedCount: number;
        transactions: BankTransactionRow[];
      }>
    > {
      if (scope.userRole !== "admin") {
        return {
          ok: false,
          errors: [
            "Banka hareketi senkronizasyon yetkisi yalnız admin rolündedir.",
          ],
        };
      }

      const dateRangeErrors = validateBankTransactionSyncDateRange({
        dateFrom,
        dateTo,
      });

      if (dateRangeErrors.length > 0) {
        return { ok: false, errors: dateRangeErrors };
      }

      const connections = await repository.listConnections({ scope });
      const connection = connections.find(
        (candidate) =>
          candidate.id === connectionId && candidate.status === "connected",
      );

      if (!connection) {
        return { ok: false, errors: ["Sandbox banka bağlantısı bulunamadı."] };
      }

      const timestamp = now();
      const selectedBankAdapter =
        bankAdapters[connection.bankCode] ?? bankAdapter;
      let transactions: BankTransactionRow[];

      try {
        transactions = await selectedBankAdapter.syncTransactions({
          connection,
          dateFrom,
          dateTo,
          timestamp,
        });
      } catch (error) {
        await auditLogRepository?.record(
          createAuditLogEntry(scope, {
            action: "bank-integration.transaction-sync-error",
            entityId: connection.id,
            entityLabel: `${connection.bankName} / ${connection.consentId}`,
            entityType: "bank-integration",
            metadata: {
              bankCode: connection.bankCode,
              consentId: connection.consentId,
              errorMessage: getErrorMessage(error),
            },
            occurredAt: timestamp,
          }),
        );

        return {
          ok: false,
          errors: ["Banka adaptörü senkronizasyon sırasında hata verdi."],
        };
      }
      const adapterErrors = validateBankAdapterTransactions({
        connection,
        transactions,
      });

      if (adapterErrors.length > 0) {
        await auditLogRepository?.record(
          createAuditLogEntry(scope, {
            action: "bank-integration.transaction-sync-reject",
            entityId: connection.id,
            entityLabel: `${connection.bankName} / ${connection.consentId}`,
            entityType: "bank-integration",
            metadata: {
              bankCode: connection.bankCode,
              consentId: connection.consentId,
              errors: adapterErrors,
              rejectedTransactionCount: transactions.length,
              transactionExternalIds: transactions.map(
                (transaction) => transaction.externalId,
              ),
            },
            occurredAt: timestamp,
          }),
        );

        return { ok: false, errors: adapterErrors };
      }

      transactions = filterBankTransactionsByDateRange({
        dateFrom,
        dateTo,
        transactions,
      });

      const syncedTransactions = await repository.upsertTransactions({
        preserveExistingStatus: true,
        scope,
        transactions,
      });
      const preservedStatusCount = countPreservedTransactionStatuses({
        incomingTransactions: transactions,
        syncedTransactions,
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.transaction-sync",
          entityId: connection.id,
          entityLabel: `${connection.bankName} / ${connection.consentId}`,
          entityType: "bank-integration",
          metadata: {
            bankCode: connection.bankCode,
            consentId: connection.consentId,
            dateFrom,
            dateTo,
            preservedStatusCount,
            syncedCount: syncedTransactions.length,
            transactionExternalIds: syncedTransactions.map(
              (transaction) => transaction.externalId,
            ),
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          preservedStatusCount,
          syncedCount: syncedTransactions.length,
          transactions: syncedTransactions,
        },
      };
    },

    async approveMatchSuggestion({
      cashBankMovementId,
      cashBankMovements,
      scope,
      transactionId,
    }: {
      cashBankMovementId: string;
      cashBankMovements: CashBankMovementRow[];
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: ["Banka eşleştirme onayı için muhasebe yetkisi gereklidir."],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find((row) => row.id === transactionId);
      const suggestion = buildBankTransactionMatchSuggestions({
        cashBankMovements,
        transactions,
      }).find(
        (candidate) =>
          candidate.bankTransactionId === transactionId &&
          candidate.cashBankMovementId === cashBankMovementId,
      );
      const cashBankMovement = cashBankMovements.find(
        (movement) => movement.id === cashBankMovementId,
      );

      if (!transaction || !suggestion || !cashBankMovement) {
        return {
          ok: false,
          errors: ["Onaylanabilir banka eşleşme önerisi bulunamadı."],
        };
      }

      const activeLedgerConflictError = await getActiveLedgerConflictError({
        cashBankMovementId: cashBankMovement.id,
        ledgerRepository,
        scope,
        transactionId: transaction.id,
      });

      if (activeLedgerConflictError) {
        return { ok: false, errors: [activeLedgerConflictError] };
      }

      const timestamp = now();
      const matchPersistence = await persistMatchedTransactionWithLedger({
        auditLogRepository,
        cashBankMovement,
        ledgerRepository,
        repository,
        scope,
        timestamp,
        transaction,
      });

      if (!matchPersistence.ok) return matchPersistence;

      const { transaction: savedTransaction } = matchPersistence.data;

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.match-approve",
          entityId: savedTransaction.id,
          entityLabel: `${savedTransaction.description} -> ${cashBankMovement.documentNo}`,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            cashBankMovementDocumentNo: cashBankMovement.documentNo,
            cashBankMovementId: cashBankMovement.id,
            cashBankMovementLabel:
              cashBankMovement.sourceLabel || cashBankMovement.documentNo,
            score: suggestion.score,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          cashBankMovement,
          transaction: savedTransaction,
        },
      };
    },

    async createCashBankMovementFromTransaction({
      account,
      scope,
      transactionId,
    }: {
      account?: CashBankAccountOption;
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: [
            "Banka hareketinden kasa/banka kaydı oluşturmak için muhasebe yetkisi gereklidir.",
          ],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      if (!cashBankMovementRepository) {
        return {
          ok: false,
          errors: ["Kasa/banka hareket kaydı bağlantısı bulunamadı."],
        };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "pending",
      );

      if (!transaction) {
        return {
          ok: false,
          errors: [
            "Kasa/banka kaydına dönüştürülebilir bekleyen banka hareketi bulunamadı.",
          ],
        };
      }

      const existingCashBankMovements = await cashBankMovementRepository.list({
        scope,
      });
      const duplicateMovement = existingCashBankMovements.find(
        (movement) =>
          movement.sourceType === "bank-transaction" &&
          movement.sourceId === transaction.id,
      );

      const timestamp = now();
      const cashBankMovement = duplicateMovement
        ? duplicateMovement
        : await cashBankMovementRepository.create(
            createCashBankMovementFromBankTransaction({
              account,
              scope,
              timestamp,
              transaction,
            }),
          );
      const ledgerEntry = createBankLedgerEntry({
        cashBankMovement,
        scope,
        timestamp,
        transaction,
      });

      try {
        await ledgerRepository?.upsertEntry({
          entry: ledgerEntry,
          scope,
        });
      } catch {
        try {
          await auditLogRepository?.record(
            createAuditLogEntry(scope, {
              action: "bank-integration.cash-bank-ledger-write-failed",
              entityId: transaction.id,
              entityLabel: `${transaction.description} -> ${cashBankMovement.documentNo}`,
              entityType: "bank-transaction",
              metadata: {
                bankTransactionId: transaction.id,
                cashBankMovementId: cashBankMovement.id,
                ledgerEntryId: ledgerEntry.id,
                recovered: false,
                retryable: true,
                reusedExistingMovement: Boolean(duplicateMovement),
                statusFrom: transaction.status,
                statusTo: transaction.status,
              },
              occurredAt: timestamp,
            }),
          );
        } catch {
          // Audit failure must not hide the retryable pending state.
        }

        return {
          ok: false,
          errors: [
            "Banka hareketi ledger kaydı oluşturulamadığı için kasa/banka kaydı tamamlanamadı.",
          ],
        };
      }

      let savedTransaction: BankTransactionRow;
      try {
        [savedTransaction] = await repository.upsertTransactions({
          scope,
          transactions: [
            {
              ...transaction,
              status: "matched",
              updatedAt: timestamp,
            },
          ],
        });
      } catch {
        try {
          await ledgerRepository?.voidByBankTransactionId({
            bankTransactionId: transaction.id,
            scope,
            updatedAt: timestamp,
            updatedBy: scope.userId,
          });
        } catch {
          // Best-effort void; the retry uses the deterministic ledger id.
        }

        return {
          ok: false,
          errors: [
            "Banka hareketi durumu güncellenemediği için kasa/banka kaydı tamamlanamadı.",
          ],
        };
      }

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.cash-bank-movement-create",
          entityId: savedTransaction.id,
          entityLabel: `${savedTransaction.description} -> ${cashBankMovement.documentNo}`,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            cashBankMovementDocumentNo: cashBankMovement.documentNo,
            cashBankMovementId: cashBankMovement.id,
            cashBankMovementLabel:
              cashBankMovement.sourceLabel || cashBankMovement.documentNo,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          cashBankMovement,
          transaction: savedTransaction,
        },
      };
    },

    async createPartialCashBankMovementFromTransaction({
      account,
      cashBankMovementId,
      scope,
      transactionId,
    }: {
      account?: CashBankAccountOption;
      cashBankMovementId: string;
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: [
            "Banka hareketinden parçalı kasa/banka kaydı oluşturmak için muhasebe yetkisi gereklidir.",
          ],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      if (!cashBankMovementRepository) {
        return {
          ok: false,
          errors: ["Kasa/banka hareket kaydı bağlantısı bulunamadı."],
        };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "pending",
      );
      const existingCashBankMovements = await cashBankMovementRepository.list({
        scope,
      });
      const existingCashBankMovement = existingCashBankMovements.find(
        (movement) => movement.id === cashBankMovementId,
      );

      if (!transaction || !existingCashBankMovement) {
        return {
          ok: false,
          errors: [
            "Parçalı kayıt için bekleyen banka hareketi veya kasa/banka hareketi bulunamadı.",
          ],
        };
      }

      const partialEvaluation = evaluateManualBankTransactionMatchCandidates({
        candidates: buildManualBankTransactionMatchCandidates([
          existingCashBankMovement,
        ]),
        transaction,
      })[0];

      if (!partialEvaluation || partialEvaluation.canApprove) {
        return {
          ok: false,
          errors: [
            "Parçalı yeni kayıt için aynı yönlü ve farklı tutarlı kasa/banka hareketi seçilmelidir.",
          ],
        };
      }

      const partialSourceId = buildPartialCashBankMovementSourceId({
        cashBankMovementId: existingCashBankMovement.id,
        transactionId: transaction.id,
      });
      const duplicateMovement = existingCashBankMovements.find(
        (movement) =>
          movement.sourceType === "bank-transaction-partial" &&
          movement.sourceId === partialSourceId,
      );

      const timestamp = now();
      let cashBankMovement: CashBankMovementRow;
      if (duplicateMovement) {
        cashBankMovement = duplicateMovement;
      } else {
        try {
          cashBankMovement = await cashBankMovementRepository.create(
            createPartialCashBankMovementFromBankTransaction({
              account,
              existingCashBankMovement,
              remainingAmount: partialEvaluation.differenceAmount,
              scope,
              sourceId: partialSourceId,
              timestamp,
              transaction,
            }),
          );
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            return {
              ok: false,
              errors: ["Parçalı kasa/banka fark kaydı oluşturulamadı."],
            };
          }
          return {
            ok: false,
            errors: [
              "Bu banka hareketi ve kasa/banka hareketi için parçalı fark kaydı zaten oluşturulmuş.",
            ],
          };
        }
      }

      const ledgerEntries = [
        createBankLedgerEntry({
          cashBankMovement: existingCashBankMovement,
          scope,
          timestamp,
          transaction,
        }),
        createBankLedgerEntry({
          cashBankMovement,
          scope,
          timestamp,
          transaction,
        }),
      ];

      try {
        for (const entry of ledgerEntries) {
          await ledgerRepository?.upsertEntry({ entry, scope });
        }
      } catch {
        try {
          await ledgerRepository?.voidByBankTransactionId({
            bankTransactionId: transaction.id,
            scope,
            updatedAt: timestamp,
            updatedBy: scope.userId,
          });
        } catch {
          // Best-effort cleanup; retry uses deterministic ledger ids.
        }
        try {
          await auditLogRepository?.record(
            createAuditLogEntry(scope, {
              action: "bank-integration.partial-cash-bank-ledger-write-failed",
              entityId: transaction.id,
              entityLabel: `${transaction.description} -> ${cashBankMovement.documentNo}`,
              entityType: "bank-transaction",
              metadata: {
                bankTransactionId: transaction.id,
                cashBankMovementId: cashBankMovement.id,
                existingCashBankMovementId: existingCashBankMovement.id,
                ledgerEntryIds: ledgerEntries.map((entry) => entry.id),
                recovered: false,
                retryable: true,
                reusedExistingMovement: Boolean(duplicateMovement),
                statusFrom: transaction.status,
                statusTo: transaction.status,
              },
              occurredAt: timestamp,
            }),
          );
        } catch {
          // Audit failure must not hide the retryable pending state.
        }

        return {
          ok: false,
          errors: [
            "Parçalı banka hareketi ledger kayıtları oluşturulamadığı için işlem tamamlanamadı.",
          ],
        };
      }

      let savedTransaction: BankTransactionRow;
      try {
        [savedTransaction] = await repository.upsertTransactions({
          scope,
          transactions: [
            {
              ...transaction,
              status: "matched",
              updatedAt: timestamp,
            },
          ],
        });
      } catch {
        try {
          await ledgerRepository?.voidByBankTransactionId({
            bankTransactionId: transaction.id,
            scope,
            updatedAt: timestamp,
            updatedBy: scope.userId,
          });
        } catch {
          // Best-effort cleanup; retry uses deterministic ledger ids.
        }

        return {
          ok: false,
          errors: [
            "Parçalı banka hareketi durumu güncellenemediği için işlem tamamlanamadı.",
          ],
        };
      }

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.partial-cash-bank-movement-create",
          entityId: savedTransaction.id,
          entityLabel: `${savedTransaction.description} -> ${cashBankMovement.documentNo}`,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            cashBankMovementDocumentNo: cashBankMovement.documentNo,
            cashBankMovementId: cashBankMovement.id,
            cashBankMovementLabel:
              cashBankMovement.sourceLabel || cashBankMovement.documentNo,
            existingCashBankMovementDocumentNo:
              existingCashBankMovement.documentNo,
            existingCashBankMovementId: existingCashBankMovement.id,
            existingCashBankMovementLabel:
              existingCashBankMovement.sourceLabel ||
              existingCashBankMovement.documentNo,
            remainingAmount: partialEvaluation.differenceAmount,
            reusedExistingMovement: Boolean(duplicateMovement),
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );
      return {
        ok: true,
        data: {
          cashBankMovement,
          transaction: savedTransaction,
        },
      };
    },

    async ignoreBankTransaction({
      scope,
      transactionId,
    }: {
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: ["Banka hareketi yoksayma için muhasebe yetkisi gereklidir."],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "pending",
      );

      if (!transaction) {
        return {
          ok: false,
          errors: ["Yoksayılabilir bekleyen banka hareketi bulunamadı."],
        };
      }

      const timestamp = now();
      const [savedTransaction] = await repository.upsertTransactions({
        scope,
        transactions: [
          {
            ...transaction,
            status: "ignored",
            updatedAt: timestamp,
          },
        ],
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.transaction-ignore",
          entityId: savedTransaction.id,
          entityLabel: savedTransaction.description,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          transaction: savedTransaction,
        },
      };
    },
    async reopenIgnoredBankTransaction({
      scope,
      transactionId,
    }: {
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: ["Banka hareketi yoksayma geri alma için muhasebe yetkisi gereklidir."],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "ignored",
      );

      if (!transaction) {
        return {
          ok: false,
          errors: ["Geri alınabilir yoksayılmış banka hareketi bulunamadı."],
        };
      }

      const timestamp = now();
      const [savedTransaction] = await repository.upsertTransactions({
        scope,
        transactions: [
          {
            ...transaction,
            status: "pending",
            updatedAt: timestamp,
          },
        ],
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.transaction-ignore-reopen",
          entityId: savedTransaction.id,
          entityLabel: savedTransaction.description,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          transaction: savedTransaction,
        },
      };
    },
    async reopenMatchApproval({
      scope,
      transactionId,
    }: {
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: ["Banka eşleştirme geri alma için muhasebe yetkisi gereklidir."],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "matched",
      );

      if (!transaction) {
        return {
          ok: false,
          errors: ["Geri alınabilir eşleşmiş banka hareketi bulunamadı."],
        };
      }

      const timestamp = now();
      const [savedTransaction] = await repository.upsertTransactions({
        scope,
        transactions: [
          {
            ...transaction,
            status: "pending",
            updatedAt: timestamp,
          },
        ],
      });

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.match-reopen",
          entityId: savedTransaction.id,
          entityLabel: savedTransaction.description,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );
      await ledgerRepository?.voidByBankTransactionId({
        bankTransactionId: savedTransaction.id,
        scope,
        updatedAt: timestamp,
        updatedBy: scope.userId,
      });

      return {
        ok: true,
        data: {
          transaction: savedTransaction,
        },
      };
    },

    async approveManualMatch({
      cashBankMovementId,
      cashBankMovements,
      scope,
      transactionId,
    }: {
      cashBankMovementId: string;
      cashBankMovements: CashBankMovementRow[];
      scope: TenantScope;
      transactionId: string;
    }): Promise<
      BankIntegrationResult<{
        cashBankMovement: CashBankMovementRow;
        transaction: BankTransactionRow;
      }>
    > {
      if (!canApproveBankTransactionMatches(scope)) {
        return {
          ok: false,
          errors: ["Banka manuel eşleştirme için muhasebe yetkisi gereklidir."],
        };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const transactions = await repository.listTransactions({ scope });
      const transaction = transactions.find(
        (row) => row.id === transactionId && row.status === "pending",
      );
      const cashBankMovement = cashBankMovements.find(
        (movement) => movement.id === cashBankMovementId,
      );

      if (!transaction || !cashBankMovement) {
        return {
          ok: false,
          errors: [
            "Manuel eşleştirilebilir banka hareketi veya kasa/banka hareketi bulunamadı.",
          ],
        };
      }

      const manualMatchEvaluation = evaluateManualBankTransactionMatchCandidates({
        candidates: buildManualBankTransactionMatchCandidates([cashBankMovement]),
        transaction,
      })[0];

      if (!manualMatchEvaluation) {
        return {
          ok: false,
          errors: ["Manuel eşleştirme için tutar ve yön uyumlu olmalıdır."],
        };
      }

      if (!manualMatchEvaluation.canApprove) {
        return {
          ok: false,
          errors: [
            `Kısmi mutabakat onayı henüz açılmadı; fark ${formatCurrencyAmount(
              manualMatchEvaluation.differenceAmount,
            )} olarak taslakta izlenir.`,
          ],
        };
      }

      const activeLedgerConflictError = await getActiveLedgerConflictError({
        cashBankMovementId: cashBankMovement.id,
        ledgerRepository,
        scope,
        transactionId: transaction.id,
      });

      if (activeLedgerConflictError) {
        return { ok: false, errors: [activeLedgerConflictError] };
      }

      const timestamp = now();
      const matchPersistence = await persistMatchedTransactionWithLedger({
        auditLogRepository,
        cashBankMovement,
        ledgerRepository,
        repository,
        scope,
        timestamp,
        transaction,
      });

      if (!matchPersistence.ok) return matchPersistence;

      const { transaction: savedTransaction } = matchPersistence.data;

      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.manual-match-approve",
          entityId: savedTransaction.id,
          entityLabel: `${savedTransaction.description} -> ${cashBankMovement.documentNo}`,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: savedTransaction.id,
            cashBankMovementDocumentNo: cashBankMovement.documentNo,
            cashBankMovementId: cashBankMovement.id,
            cashBankMovementLabel:
              cashBankMovement.sourceLabel || cashBankMovement.documentNo,
            statusFrom: transaction.status,
            statusTo: savedTransaction.status,
          },
          occurredAt: timestamp,
        }),
      );

      return {
        ok: true,
        data: {
          cashBankMovement,
          transaction: savedTransaction,
        },
      };
    },
  };
}

async function persistMatchedTransactionWithLedger({
  auditLogRepository,
  cashBankMovement,
  ledgerRepository,
  repository,
  scope,
  timestamp,
  transaction,
}: {
  auditLogRepository?: AuditLogRepository;
  cashBankMovement: CashBankMovementRow;
  ledgerRepository?: BankLedgerEntryRepository;
  repository: BankIntegrationRepository;
  scope: TenantScope;
  timestamp: string;
  transaction: BankTransactionRow;
}): Promise<BankIntegrationResult<{ transaction: BankTransactionRow }>> {
  const [savedTransaction] = await repository.upsertTransactions({
    scope,
    transactions: [
      {
        ...transaction,
        status: "matched",
        updatedAt: timestamp,
      },
    ],
  });
  const ledgerEntry = createBankLedgerEntry({
    cashBankMovement,
    scope,
    timestamp,
    transaction: savedTransaction,
  });

  try {
    await ledgerRepository?.upsertEntry({
      entry: ledgerEntry,
      scope,
    });
  } catch {
    await repository.upsertTransactions({
      scope,
      transactions: [
        {
          ...transaction,
          status: "pending",
          updatedAt: timestamp,
        },
      ],
    });
    try {
      await auditLogRepository?.record(
        createAuditLogEntry(scope, {
          action: "bank-integration.ledger-write-failed",
          entityId: transaction.id,
          entityLabel: `${transaction.description} -> ${cashBankMovement.documentNo}`,
          entityType: "bank-transaction",
          metadata: {
            bankTransactionId: transaction.id,
            cashBankMovementId: cashBankMovement.id,
            ledgerEntryId: ledgerEntry.id,
            recovered: true,
            retryable: true,
            statusFrom: transaction.status,
            statusTo: "pending",
          },
          occurredAt: timestamp,
        }),
      );
    } catch {
      // Audit failure must not hide the already recovered pending state.
    }

    return {
      ok: false,
      errors: [
        "Banka eşleştirmesi ledger kaydı oluşturulamadığı için geri alındı.",
      ],
    };
  }

  return { ok: true, data: { transaction: savedTransaction } };
}

export function getSupportedBankIntegrations(): BankIntegrationSupportedBank[] {
  return supportedBanks.map((bank) => ({ ...bank }));
}

export function buildBankIntegrationOverview({
  ledgerFailureAudits,
  ledgerEntries,
  manualMatchCandidates = [],
  rows,
  supportedBanks,
  transactions = [],
}: {
  ledgerFailureAudits?: BankLedgerFailureAuditView[];
  ledgerEntries?: BankLedgerEntryRow[];
  manualMatchCandidates?: BankTransactionManualMatchCandidate[];
  rows: BankIntegrationConnectionRow[];
  supportedBanks: BankIntegrationSupportedBank[];
  transactions?: BankTransactionRow[];
}): BankIntegrationOverview {
  const overview: BankIntegrationOverview = {
    connections: rows.map(connectionToView),
    manualMatchCandidates,
    matchSuggestions: [],
    recentTransactions: transactions.map(transactionToView),
    supportedBanks: supportedBanks.map((bank) => ({ ...bank })),
  };

  if (ledgerEntries) {
    overview.ledgerEntries = ledgerEntries.map((entry) => ({ ...entry }));
  }

  if (ledgerFailureAudits) {
    overview.ledgerFailureAudits = ledgerFailureAudits.map((audit) => ({
      ...audit,
    }));
  }

  return overview;
}

export function buildManualBankTransactionMatchCandidates(
  cashBankMovements: CashBankMovementRow[],
): BankTransactionManualMatchCandidate[] {
  return cashBankMovements
    .map((movement) => ({
      amount: movement.amount,
      cashBankMovementDocumentNo: movement.documentNo,
      cashBankMovementId: movement.id,
      cashBankMovementLabel: movement.sourceLabel || movement.documentNo,
      direction: movement.direction,
      matchedDate: movement.movementDate,
      sourceId: movement.sourceId,
      sourceType: movement.sourceType,
    }))
    .sort((left, right) => right.matchedDate.localeCompare(left.matchedDate));
}

export function buildBankTransactionCashBankMovementDrafts({
  transactions,
}: {
  transactions: Array<
    Pick<
      BankTransactionRow | BankTransactionView,
      "amount" | "description" | "direction" | "id" | "occurredAt" | "status"
    >
  >;
}): BankTransactionCashBankMovementDraft[] {
  const seenTransactionIds = new Set<string>();

  return transactions.flatMap((transaction) => {
    if (transaction.status !== "pending" || seenTransactionIds.has(transaction.id)) {
      return [];
    }

    seenTransactionIds.add(transaction.id);
    const isInflow = transaction.direction === "inflow";
    const movementType = isInflow ? "Tahsilat" : "Ödeme";
    const directionLabel = isInflow ? "Giriş" : "Çıkış";

    return [
      {
        amount: Math.abs(transaction.amount),
        bankTransactionDescription: transaction.description,
        bankTransactionId: transaction.id,
        directionLabel,
        movementDate: transaction.occurredAt.slice(0, 10),
        movementType,
        statusLabel: "Kayıt Taslağı" as const,
        suggestedDescription: `Banka hareketinden ${movementType.toLocaleLowerCase("tr-TR")}: ${transaction.description}`,
      },
    ];
  });
}
export function buildBankTransactionPartialReconciliationDrafts({
  candidates,
  transactions,
}: {
  candidates: BankTransactionManualMatchCandidate[];
  transactions: Array<
    Pick<
      BankTransactionRow | BankTransactionView,
      "amount" | "description" | "direction" | "id" | "status"
    >
  >;
}): BankTransactionPartialReconciliationDraft[] {
  const completedPartialSourceIds = buildCompletedPartialCashBankMovementSourceIds(candidates);

  return transactions.flatMap((transaction) => {
    if (transaction.status !== "pending") {
      return [];
    }

    return evaluateManualBankTransactionMatchCandidates({
      candidates,
      transaction,
    })
      .filter((candidate) =>
        shouldShowPartialBankTransactionDraft({
          candidate,
          completedPartialSourceIds,
          transactionId: transaction.id,
        }),
      )
      .map((candidate) => ({
        bankTransactionAmount: transaction.amount,
        bankTransactionDescription: transaction.description,
        bankTransactionId: transaction.id,
        cashBankMovementAmount: candidate.amount,
        cashBankMovementDocumentNo: candidate.cashBankMovementDocumentNo,
        cashBankMovementId: candidate.cashBankMovementId,
        cashBankMovementLabel: candidate.cashBankMovementLabel,
        differenceAmount: candidate.differenceAmount,
        matchedDate: candidate.matchedDate,
        statusLabel: "Kısmi Taslak" as const,
      }));
  });
}

export function buildBankTransactionPartialCashBankMovementDrafts({
  candidates,
  transactions,
}: {
  candidates: BankTransactionManualMatchCandidate[];
  transactions: Array<
    Pick<
      BankTransactionRow | BankTransactionView,
      "amount" | "description" | "direction" | "id" | "occurredAt" | "status"
    >
  >;
}): BankTransactionPartialCashBankMovementDraft[] {
  const completedPartialSourceIds = buildCompletedPartialCashBankMovementSourceIds(candidates);

  return transactions.flatMap((transaction) => {
    if (transaction.status !== "pending") {
      return [];
    }

    const isInflow = transaction.direction === "inflow";
    const movementType = isInflow ? "Tahsilat" : "Ödeme";

    return evaluateManualBankTransactionMatchCandidates({
      candidates,
      transaction,
    })
      .filter((candidate) =>
        shouldShowPartialBankTransactionDraft({
          candidate,
          completedPartialSourceIds,
          transactionId: transaction.id,
        }),
      )
      .map((candidate) => ({
        bankTransactionAmount: transaction.amount,
        bankTransactionDescription: transaction.description,
        bankTransactionId: transaction.id,
        cashBankMovementAmount: candidate.amount,
        cashBankMovementDocumentNo: candidate.cashBankMovementDocumentNo,
        cashBankMovementId: candidate.cashBankMovementId,
        cashBankMovementLabel: candidate.cashBankMovementLabel,
        directionLabel: candidate.direction,
        movementDate: transaction.occurredAt.slice(0, 10),
        movementType,
        remainingAmount: candidate.differenceAmount,
        statusLabel: "Parçalı Kayıt Taslağı" as const,
        suggestedDescription: `Banka hareketinden parçalı ${movementType.toLocaleLowerCase("tr-TR")} farkı: ${transaction.description}`,
      }));
  });
}

function buildCompletedPartialCashBankMovementSourceIds(
  candidates: BankTransactionManualMatchCandidate[],
) {
  return new Set(
    candidates
      .filter(
        (candidate) =>
          candidate.sourceType === "bank-transaction-partial" &&
          Boolean(candidate.sourceId),
      )
      .map((candidate) => candidate.sourceId as string),
  );
}

export function isPartialCashBankMovementForTransaction(
  candidate: BankTransactionManualMatchCandidate,
  transactionId: string,
) {
  return (
    candidate.sourceType === "bank-transaction-partial" &&
    candidate.sourceId ===
      buildPartialCashBankMovementSourceId({
        cashBankMovementId: candidate.cashBankMovementId,
        transactionId,
      })
  );
}

function shouldShowPartialBankTransactionDraft({
  candidate,
  completedPartialSourceIds,
  transactionId,
}: {
  candidate: BankTransactionManualMatchCandidateEvaluation;
  completedPartialSourceIds: Set<string>;
  transactionId: string;
}) {
  if (candidate.matchKind !== "partial") {
    return false;
  }

  if (candidate.sourceType === "bank-transaction-partial") {
    return false;
  }

  return !completedPartialSourceIds.has(
    buildPartialCashBankMovementSourceId({
      cashBankMovementId: candidate.cashBankMovementId,
      transactionId,
    }),
  );
}
export function evaluateManualBankTransactionMatchCandidates({
  candidates,
  transaction,
}: {
  candidates: BankTransactionManualMatchCandidate[];
  transaction: Pick<BankTransactionRow | BankTransactionView, "amount" | "direction">;
}): BankTransactionManualMatchCandidateEvaluation[] {
  const expectedDirection = transaction.direction === "inflow" ? "Giriş" : "Çıkış";

  return candidates
    .filter((candidate) => candidate.direction === expectedDirection)
    .map((candidate) => {
      const differenceAmount = Math.abs(
        Math.abs(candidate.amount) - Math.abs(transaction.amount),
      );
      const matchKind: BankTransactionManualMatchCandidateEvaluation["matchKind"] =
        differenceAmount === 0 ? "exact" : "partial";

      return {
        ...candidate,
        canApprove: matchKind === "exact",
        differenceAmount,
        matchKind,
      };
    })
    .sort((left, right) => {
      if (left.canApprove !== right.canApprove) {
        return left.canApprove ? -1 : 1;
      }

      if (left.differenceAmount !== right.differenceAmount) {
        return left.differenceAmount - right.differenceAmount;
      }

      return right.matchedDate.localeCompare(left.matchedDate);
    });
}

export function buildBankTransactionMatchSuggestions({
  cashBankMovements,
  transactions,
}: {
  cashBankMovements: CashBankMovementRow[];
  transactions: Array<
    Pick<
      BankTransactionRow | BankTransactionView,
      "amount" | "description" | "direction" | "id" | "occurredAt" | "status"
    >
  >;
}): BankTransactionMatchSuggestion[] {
  return transactions.flatMap((transaction) => {
    if (transaction.status !== "pending") {
      return [];
    }

    const transactionDate = transaction.occurredAt.slice(0, 10);
    const expectedDirection =
      transaction.direction === "inflow" ? "Giriş" : "Çıkış";
    const match = cashBankMovements.find(
      (movement) =>
        movement.movementDate === transactionDate &&
        movement.direction === expectedDirection &&
        Math.abs(movement.amount) === Math.abs(transaction.amount),
    );

    if (!match) {
      return [];
    }

    return [
      {
        bankTransactionAmount: transaction.amount,
        bankTransactionDescription: transaction.description,
        bankTransactionId: transaction.id,
        cashBankMovementDocumentNo: match.documentNo,
        cashBankMovementId: match.id,
        cashBankMovementLabel: match.sourceLabel || match.documentNo,
        matchedAmount: match.amount,
        matchedDate: match.movementDate,
        score: calculateMatchScore(transaction.description, match.description),
        statusLabel: "Öneri",
      },
    ];
  });
}

export function createSeededBankIntegrationMemoryRepository({
  connections = [],
  transactions = [],
}: {
  connections?: BankIntegrationConnectionRow[];
  transactions?: BankTransactionRow[];
} = {}): BankIntegrationRepository {
  const connectionRows = [...connections];
  const transactionRows = [...transactions];

  return {
    async listConnections({ scope }) {
      return connectionRows
        .filter(
          (row) =>
            row.tenantId === scope.tenantId &&
            row.companyId === scope.companyId &&
            row.periodId === scope.periodId,
        )
        .sort((left, right) => left.bankName.localeCompare(right.bankName, "tr"));
    },

    async listTransactions({ scope }) {
      return transactionRows
        .filter(
          (row) =>
            row.tenantId === scope.tenantId &&
            row.companyId === scope.companyId &&
            row.periodId === scope.periodId,
        )
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .slice(0, 20);
    },

    async upsertConnection({ connection }) {
      const index = connectionRows.findIndex((row) => row.id === connection.id);

      if (index === -1) {
        connectionRows.push(connection);

        return connection;
      }

      connectionRows[index] = {
        ...connectionRows[index],
        bankName: connection.bankName,
        consentId: connection.consentId,
        lastTestedAt: connection.lastTestedAt,
        lastTestMessage: connection.lastTestMessage,
        lastTestStatus: connection.lastTestStatus,
        status: connection.status,
        updatedAt: connection.updatedAt,
        updatedBy: connection.updatedBy,
      };

      return connectionRows[index];
    },

    async upsertTransactions({
      preserveExistingStatus = false,
      transactions: incomingTransactions,
    }) {
      return incomingTransactions.map((transaction) => {
        const index = transactionRows.findIndex((row) => row.id === transaction.id);

        if (index === -1) {
          transactionRows.push(transaction);

          return transaction;
        }

        transactionRows[index] = {
          ...transactionRows[index],
          amount: transaction.amount,
          bankName: transaction.bankName,
          currency: transaction.currency,
          description: transaction.description,
          direction: transaction.direction,
          occurredAt: transaction.occurredAt,
          status: preserveExistingStatus
            ? transactionRows[index].status
            : transaction.status,
          updatedAt: transaction.updatedAt,
        };

        return transactionRows[index];
      });
    },
  };
}

function connectionToView(
  row: BankIntegrationConnectionRow,
): BankIntegrationConnectionView {
  return {
    bankCode: row.bankCode,
    bankName: row.bankName,
    consentId: row.consentId,
    environmentLabel: "Sandbox",
    id: row.id,
    lastTestedAt: row.lastTestedAt,
    lastTestMessage: row.lastTestMessage,
    lastTestStatus: row.lastTestStatus,
    status: row.status,
    statusLabel: row.status === "connected" ? "Bağlı" : "Hatalı",
  };
}

function transactionToView(row: BankTransactionRow): BankTransactionView {
  return {
    amount: row.amount,
    bankName: row.bankName,
    currency: row.currency,
    description: row.description,
    direction: row.direction,
    id: row.id,
    occurredAt: row.occurredAt,
    status: row.status,
    statusLabel: formatBankTransactionStatus(row.status),
  };
}

function createSandboxBankAdapter(): BankAdapter {
  return {
    syncTransactions: ({ connection, dateFrom, dateTo, timestamp }) =>
      filterBankTransactionsByDateRange({
        dateFrom,
        dateTo,
        transactions: createSandboxTransactions({
          connection,
          timestamp,
        }),
      }),
  };
}

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "P2002" ||
    (typeof candidate.message === "string" &&
      /unique constraint|duplicate key/i.test(candidate.message))
  );
}

function filterBankTransactionsByDateRange({
  dateFrom,
  dateTo,
  transactions,
}: {
  dateFrom?: string;
  dateTo?: string;
  transactions: BankTransactionRow[];
}) {
  return transactions.filter((transaction) => {
    const occurredDate = transaction.occurredAt.slice(0, 10);

    if (dateFrom && occurredDate < dateFrom) {
      return false;
    }

    if (dateTo && occurredDate > dateTo) {
      return false;
    }

    return true;
  });
}

function validateBankAdapterTransactions({
  connection,
  transactions,
}: {
  connection: BankIntegrationConnectionRow;
  transactions: BankTransactionRow[];
}) {
  const hasOutOfScopeTransaction = transactions.some(
    (transaction) =>
      transaction.bankConnectionId !== connection.id ||
      transaction.companyId !== connection.companyId ||
      transaction.periodId !== connection.periodId ||
      transaction.tenantId !== connection.tenantId,
  );

  if (hasOutOfScopeTransaction) {
    return [
      "Banka adaptörü aktif tenant/firma/dönem dışında hareket döndürdü.",
    ];
  }

  const hasMismatchedBankName = transactions.some(
    (transaction) => transaction.bankName !== connection.bankName,
  );

  if (hasMismatchedBankName) {
    return ["Banka adaptörü bağlantı bankası dışında hareket döndürdü."];
  }

  const hasBlankExternalId = transactions.some(
    (transaction) => !transaction.externalId.trim(),
  );

  if (hasBlankExternalId) {
    return ["Banka adaptörü boş externalId döndürdü."];
  }

  const hasUntrimmedExternalId = transactions.some(
    (transaction) => transaction.externalId !== transaction.externalId.trim(),
  );

  if (hasUntrimmedExternalId) {
    return ["Banka adaptörü kırpılmamış externalId döndürdü."];
  }

  const hasBlankTransactionId = transactions.some(
    (transaction) => !transaction.id.trim(),
  );

  if (hasBlankTransactionId) {
    return ["Banka adaptörü boş hareket kimliği döndürdü."];
  }

  const hasUntrimmedTransactionId = transactions.some(
    (transaction) => transaction.id !== transaction.id.trim(),
  );

  if (hasUntrimmedTransactionId) {
    return ["Banka adaptörü kırpılmamış hareket kimliği döndürdü."];
  }

  const hasBlankDescription = transactions.some(
    (transaction) => !transaction.description.trim(),
  );

  if (hasBlankDescription) {
    return ["Banka adaptörü boş hareket açıklaması döndürdü."];
  }

  const hasUntrimmedDescription = transactions.some(
    (transaction) => transaction.description !== transaction.description.trim(),
  );

  if (hasUntrimmedDescription) {
    return ["Banka adaptörü kırpılmamış hareket açıklaması döndürdü."];
  }

  const transactionIds = new Set<string>();
  const hasDuplicateTransactionId = transactions.some((transaction) => {
    if (transactionIds.has(transaction.id)) {
      return true;
    }

    transactionIds.add(transaction.id);

    return false;
  });

  if (hasDuplicateTransactionId) {
    return [
      "Banka adaptörü aynı senkronizasyonda tekrar eden hareket kimliği döndürdü.",
    ];
  }

  const externalIds = new Set<string>();
  const hasDuplicateExternalId = transactions.some((transaction) => {
    if (externalIds.has(transaction.externalId)) {
      return true;
    }

    externalIds.add(transaction.externalId);

    return false;
  });

  if (hasDuplicateExternalId) {
    return [
      "Banka adaptörü aynı senkronizasyonda tekrar eden externalId döndürdü.",
    ];
  }

  const hasInvalidOccurredAt = transactions.some(
    (transaction) => !isBankTransactionOccurredAtValue(transaction.occurredAt),
  );

  if (hasInvalidOccurredAt) {
    return ["Banka adaptörü geçersiz hareket tarihi döndürdü."];
  }

  const hasInvalidUpdatedAt = transactions.some(
    (transaction) => !isBankTransactionOccurredAtValue(transaction.updatedAt),
  );

  if (hasInvalidUpdatedAt) {
    return ["Banka adaptörü geçersiz güncelleme tarihi döndürdü."];
  }

  const hasUpdatedAtBeforeOccurredAt = transactions.some(
    (transaction) =>
      Date.parse(transaction.updatedAt) < Date.parse(transaction.occurredAt),
  );

  if (hasUpdatedAtBeforeOccurredAt) {
    return [
      "Banka adaptörü hareket güncelleme tarihini işlem tarihinden önce döndürdü.",
    ];
  }

  const hasNonPendingStatus = transactions.some(
    (transaction) => transaction.status !== "pending",
  );

  if (hasNonPendingStatus) {
    return ["Banka adaptörü bekleyen dışında hareket durumu döndürdü."];
  }

  const hasNonTryCurrency = transactions.some(
    (transaction) => transaction.currency !== "TRY",
  );

  if (hasNonTryCurrency) {
    return ["Banka adaptörü TRY dışında para birimi döndürdü."];
  }

  const hasNonFiniteAmount = transactions.some(
    (transaction) => !Number.isFinite(transaction.amount),
  );

  if (hasNonFiniteAmount) {
    return ["Banka adaptörü geçersiz hareket tutarı döndürdü."];
  }

  const hasInvalidDirection = transactions.some(
    (transaction) =>
      transaction.direction !== "inflow" && transaction.direction !== "outflow",
  );

  if (hasInvalidDirection) {
    return ["Banka adaptörü geçersiz hareket yönü döndürdü."];
  }

  const hasDirectionAmountMismatch = transactions.some((transaction) => {
    if (transaction.direction === "inflow") {
      return transaction.amount <= 0;
    }

    return transaction.amount >= 0;
  });

  if (hasDirectionAmountMismatch) {
    return ["Banka adaptörü yön/tutar uyumsuz hareket döndürdü."];
  }

  return [];
}

function validateBankTransactionSyncDateRange({
  dateFrom,
  dateTo,
}: BankTransactionSyncDateRange) {
  const hasInvalidDateFormat = [dateFrom, dateTo].some(
    (value) => value && !isBankSyncDateValue(value),
  );

  if (hasInvalidDateFormat) {
    return ["Banka hareketi tarih aralığı YYYY-AA-GG formatında olmalıdır."];
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return ["Banka hareketi başlangıç tarihi bitiş tarihinden sonra olamaz."];
  }

  return [];
}

function isBankSyncDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isBankTransactionOccurredAtValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }

  const occurredDate = value.slice(0, 10);

  return isBankSyncDateValue(occurredDate) && Number.isFinite(Date.parse(value));
}

function countPreservedTransactionStatuses({
  incomingTransactions,
  syncedTransactions,
}: {
  incomingTransactions: BankTransactionRow[];
  syncedTransactions: BankTransactionRow[];
}) {
  const incomingStatusById = new Map(
    incomingTransactions.map((transaction) => [
      transaction.id,
      transaction.status,
    ]),
  );

  return syncedTransactions.filter((transaction) => {
    const incomingStatus = incomingStatusById.get(transaction.id);

    return Boolean(incomingStatus && incomingStatus !== transaction.status);
  }).length;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function createSandboxTransactions({
  connection,
  timestamp,
}: {
  connection: BankIntegrationConnectionRow;
  timestamp: string;
}): BankTransactionRow[] {
  const date = timestamp.slice(0, 10);

  return [
    createSandboxTransaction({
      amount: 125000,
      connection,
      description: "Sandbox hakediş tahsilatı",
      direction: "inflow",
      externalId: `${connection.bankCode}-sandbox-${date}-inflow`,
      occurredAt: `${date}T09:00:00.000Z`,
      timestamp,
    }),
    createSandboxTransaction({
      amount: -48500,
      connection,
      description: "Sandbox tedarikçi ödemesi",
      direction: "outflow",
      externalId: `${connection.bankCode}-sandbox-${date}-outflow`,
      occurredAt: `${date}T09:05:00.000Z`,
      timestamp,
    }),
  ];
}

function createSandboxTransaction({
  amount,
  connection,
  description,
  direction,
  externalId,
  occurredAt,
  timestamp,
}: {
  amount: number;
  connection: BankIntegrationConnectionRow;
  description: string;
  direction: BankTransactionRow["direction"];
  externalId: string;
  occurredAt: string;
  timestamp: string;
}): BankTransactionRow {
  return {
    amount,
    bankConnectionId: connection.id,
    bankName: connection.bankName,
    companyId: connection.companyId,
    currency: "TRY",
    description,
    direction,
    externalId,
    id: `${connection.id}::transaction::${externalId}`,
    occurredAt,
    periodId: connection.periodId,
    status: "pending",
    tenantId: connection.tenantId,
    updatedAt: timestamp,
  };
}

function formatBankTransactionStatus(status: BankTransactionRow["status"]) {
  if (status === "matched") {
    return "Eşleştirildi";
  }

  if (status === "ignored") {
    return "Yoksayıldı";
  }

  return "Bekliyor";
}

function canApproveBankTransactionMatches(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

function formatCurrencyAmount(amount: number) {
  const formattedAmount = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);

  return `${formattedAmount} TL`;
}

async function getActiveLedgerConflictError({
  cashBankMovementId,
  ledgerRepository,
  scope,
  transactionId,
}: {
  cashBankMovementId: string;
  ledgerRepository?: BankLedgerEntryRepository;
  scope: TenantScope;
  transactionId: string;
}) {
  const activeEntry = await ledgerRepository?.findActiveByCashBankMovementId({
    cashBankMovementId,
    scope,
  });

  if (activeEntry && activeEntry.bankTransactionId !== transactionId) {
    return "Bu kasa/banka hareketi aktif başka bir banka eşleşmesine bağlıdır.";
  }

  return undefined;
}

function createBankLedgerEntry({
  cashBankMovement,
  scope,
  timestamp,
  transaction,
}: {
  cashBankMovement: CashBankMovementRow;
  scope: TenantScope;
  timestamp: string;
  transaction: BankTransactionRow;
}): BankLedgerEntryRow {
  return {
    amount: Math.abs(cashBankMovement.amount),
    bankTransactionId: transaction.id,
    cashBankAccountCode: cashBankMovement.accountCode,
    cashBankAccountName: cashBankMovement.accountName,
    cashBankMovementId: cashBankMovement.id,
    companyId: scope.companyId,
    createdAt: timestamp,
    createdBy: scope.userId,
    currency: transaction.currency,
    description: `${transaction.description} -> ${cashBankMovement.documentNo}`,
    documentNo: cashBankMovement.documentNo,
    entryDate: cashBankMovement.movementDate,
    id: `${transaction.id}::ledger::${cashBankMovement.id}`,
    ledgerDirection: transaction.direction === "inflow" ? "debit" : "credit",
    periodId: scope.periodId,
    status: "active",
    tenantId: scope.tenantId,
    updatedAt: timestamp,
    updatedBy: scope.userId,
  };
}

function createCashBankMovementFromBankTransaction({
  account,
  scope,
  timestamp,
  transaction,
}: {
  account?: CashBankAccountOption;
  scope: TenantScope;
  timestamp: string;
  transaction: BankTransactionRow;
}): CashBankMovementRow {
  const isInflow = transaction.direction === "inflow";
  const movementType = isInflow ? "Tahsilat" : "Ödeme";
  const movementDate = transaction.occurredAt.slice(0, 10);
  const directionSuffix = isInflow ? "INFLOW" : "OUTFLOW";
  const documentNo = [
    "BNK",
    movementDate.replace(/-/g, ""),
    directionSuffix,
    createStableDocumentSuffix(transaction.externalId || transaction.id),
  ].join("-");
  const resolvedAccount = account ?? {
    code: "102.01",
    name: `${transaction.bankName} TL`,
  };

  return {
    accountCode: resolvedAccount.code,
    accountName: resolvedAccount.name,
    amount: Math.abs(transaction.amount),
    companyId: scope.companyId,
    counterpartyName: "Banka Hareketi",
    createdAt: timestamp,
    createdBy: scope.userId,
    currency: "TL",
    description: `Banka hareketinden ${movementType.toLocaleLowerCase("tr-TR")}: ${transaction.description}`,
    direction: isInflow ? "Giriş" : "Çıkış",
    documentNo,
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::bank-transaction::${normalizeBankTransactionIdentifier(
      transaction.id,
    )}::${movementType}`,
    movementDate,
    movementType,
    periodId: scope.periodId,
    sourceId: transaction.id,
    sourceLabel: transaction.externalId,
    sourceType: "bank-transaction",
    tenantId: scope.tenantId,
    updatedAt: timestamp,
    updatedBy: scope.userId,
  };
}

function createPartialCashBankMovementFromBankTransaction({
  account,
  existingCashBankMovement,
  remainingAmount,
  scope,
  sourceId,
  timestamp,
  transaction,
}: {
  account?: CashBankAccountOption;
  existingCashBankMovement: CashBankMovementRow;
  remainingAmount: number;
  scope: TenantScope;
  sourceId: string;
  timestamp: string;
  transaction: BankTransactionRow;
}): CashBankMovementRow {
  const isInflow = transaction.direction === "inflow";
  const movementType = isInflow ? "Tahsilat" : "Ödeme";
  const movementDate = transaction.occurredAt.slice(0, 10);
  const directionSuffix = isInflow ? "INFLOW" : "OUTFLOW";
  const documentNo = [
    "BNK",
    movementDate.replace(/-/g, ""),
    directionSuffix,
    createStableDocumentSuffix(transaction.externalId || transaction.id),
    "PART",
    createStableDocumentSuffix(existingCashBankMovement.id),
  ].join("-");
  const resolvedAccount = account ?? {
    code: existingCashBankMovement.accountCode,
    name: existingCashBankMovement.accountName,
  };

  return {
    accountCode: resolvedAccount.code,
    accountName: resolvedAccount.name,
    amount: remainingAmount,
    companyId: scope.companyId,
    counterpartyName: "Banka Hareketi",
    createdAt: timestamp,
    createdBy: scope.userId,
    currency: "TL",
    description: `Banka hareketinden parçalı ${movementType.toLocaleLowerCase("tr-TR")} farkı: ${transaction.description}`,
    direction: isInflow ? "Giriş" : "Çıkış",
    documentNo,
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::bank-transaction-partial::${normalizeBankTransactionIdentifier(
      transaction.id,
    )}::${normalizeBankTransactionIdentifier(existingCashBankMovement.id)}`,
    movementDate,
    movementType,
    periodId: scope.periodId,
    sourceId,
    sourceLabel: `${transaction.externalId} -> ${existingCashBankMovement.documentNo}`,
    sourceType: "bank-transaction-partial",
    tenantId: scope.tenantId,
    updatedAt: timestamp,
    updatedBy: scope.userId,
  };
}

function buildPartialCashBankMovementSourceId({
  cashBankMovementId,
  transactionId,
}: {
  cashBankMovementId: string;
  transactionId: string;
}) {
  return `${transactionId}::${cashBankMovementId}`;
}

function calculateMatchScore(
  bankDescription: string,
  movementDescription: string,
) {
  const bankTokens = tokenizeDescription(bankDescription);
  const movementTokens = tokenizeDescription(movementDescription);
  const hasSharedToken = bankTokens.some((token) => movementTokens.includes(token));

  return hasSharedToken ? 95 : 90;
}

function tokenizeDescription(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]+/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

function normalizeTestValues(
  values: BankIntegrationTestValues,
): BankIntegrationTestValues {
  return {
    bankCode: values.bankCode.trim(),
    consentId: values.consentId.trim(),
  };
}

function validateTestValues(values: BankIntegrationTestValues) {
  const errors: string[] = [];
  const bank = getSupportedBankIntegrations().find(
    (candidate) => candidate.bankCode === values.bankCode,
  );

  if (!bank || bank.status !== "Mevcut") {
    errors.push("Seçilen banka sandbox bağlantısına açık değildir.");
  }

  if (!values.consentId) {
    errors.push("Rıza numarası zorunludur.");
  }

  return errors;
}

function createBankIntegrationConnectionId(scope: TenantScope, bankCode: string) {
  return [
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    "bank-integration",
    bankCode,
    "sandbox",
  ].join("::");
}

function normalizeBankTransactionIdentifier(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function createStableDocumentSuffix(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}







