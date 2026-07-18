import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";
import type { LedgerRepository } from "./ledger-service";
import type { ProgressPaymentLedgerPostingService } from "./progress-payment-ledger-posting-service";

export type ProgressPaymentStatus = "Taslak" | "Kaydedildi" | "İptal";

export type ProgressPaymentType =
  | "Şantiye Geliri"
  | "Taşeron Hakedişi"
  | "Tedarikçi Hakedişi";

export type ProgressPaymentLineDraft = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type ProgressPaymentDraft = {
  counterpartyCode: string;
  counterpartyName: string;
  currency: "TL" | "USD" | "EUR";
  description?: string;
  documentNo: string;
  issueDate: string;
  lines: ProgressPaymentLineDraft[];
  paymentType: ProgressPaymentType;
  retentionRate: number;
  siteCode: string;
  siteName: string;
};

export type ProgressPaymentLineTotals = {
  grossTotal: number;
  lineNo: number;
  vatTotal: number;
};

export type ProgressPaymentTotals = {
  grossTotal: number;
  grandTotal: number;
  lines: ProgressPaymentLineTotals[];
  netTotal: number;
  retentionTotal: number;
  vatTotal: number;
};

export type ProgressPaymentRow = ProgressPaymentDraft &
  Omit<ProgressPaymentTotals, "lines"> & {
    id: string;
    tenantId: string;
    companyId: string;
    periodId: string;
    status: ProgressPaymentStatus;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
    ledgerDocumentNo?: string;
  };

export type ProgressPaymentCreateValues = Partial<
  Omit<ProgressPaymentDraft, "lines">
> & {
  lines?: ProgressPaymentLineDraft[];
};

export type ProgressPaymentRepositoryListInput = {
  scope: TenantScope;
};

export type ProgressPaymentRepository = {
  create(input: ProgressPaymentRow): Promise<ProgressPaymentRow>;
  list(input: ProgressPaymentRepositoryListInput): Promise<ProgressPaymentRow[]>;
  update(input: ProgressPaymentRow): Promise<ProgressPaymentRow>;
};

export type ProgressPaymentServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type ProgressPaymentListData = {
  rows: ProgressPaymentRow[];
};

export type ProgressPaymentService = {
  cancel(
    input: ProgressPaymentStatusInput,
  ): Promise<ProgressPaymentServiceResult<ProgressPaymentRow>>;
  create(
    input: ProgressPaymentCreateInput,
  ): Promise<ProgressPaymentServiceResult<ProgressPaymentRow>>;
  list(
    input: ProgressPaymentListInput,
  ): Promise<ProgressPaymentServiceResult<ProgressPaymentListData>>;
  post(
    input: ProgressPaymentStatusInput,
  ): Promise<ProgressPaymentServiceResult<ProgressPaymentRow>>;
};

export type ProgressPaymentListInput = {
  scope: TenantScope;
};

export type ProgressPaymentCreateInput = ProgressPaymentListInput & {
  values: ProgressPaymentCreateValues;
};

export type ProgressPaymentStatusInput = ProgressPaymentListInput & {
  id: string;
};

export type ProgressPaymentServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  ledgerPostingService?: ProgressPaymentLedgerPostingService;
  ledgerRepository?: Pick<LedgerRepository, "list">;
  now: () => string;
  repository: ProgressPaymentRepository;
};

const progressPaymentMutationPermissionError =
  "Hakediş işlemi için muhasebe yetkisi gereklidir.";

export function createProgressPaymentDraft(
  input: ProgressPaymentCreateValues,
): ProgressPaymentDraft {
  return {
    counterpartyCode: input.counterpartyCode?.trim() ?? "",
    counterpartyName: input.counterpartyName?.trim() ?? "",
    currency: getP0BaseCurrencyTransactionValue(),
    description: input.description?.trim() ?? "",
    documentNo: input.documentNo?.trim() ?? "",
    issueDate: input.issueDate?.trim() ?? "",
    lines: input.lines?.map(normalizeLine) ?? [],
    paymentType: input.paymentType ?? "Taşeron Hakedişi",
    retentionRate: normalizeRate(input.retentionRate),
    siteCode: input.siteCode?.trim() ?? "",
    siteName: input.siteName?.trim() ?? "",
  };
}

export function validateProgressPaymentDraft(
  draft: ProgressPaymentDraft,
): string[] {
  const errors: string[] = [];

  if (!draft.documentNo) {
    errors.push("Evrak no zorunludur.");
  }

  if (!draft.issueDate) {
    errors.push("Hakediş tarihi zorunludur.");
  }

  if (!draft.counterpartyCode || !draft.counterpartyName) {
    errors.push("Cari zorunludur.");
  }

  if (!draft.siteCode || !draft.siteName) {
    errors.push("Şantiye zorunludur.");
  }

  if (!draft.lines.some((line) => line.description)) {
    errors.push("En az bir hakediş satırı açıklama içermelidir.");
  }

  if (draft.retentionRate < 0 || draft.retentionRate > 100) {
    errors.push("Kesinti oranı 0 ile 100 arasında olmalıdır.");
  }

  draft.lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (line.quantity <= 0) {
      errors.push(`${lineNo}. satır miktarı 0'dan büyük olmalıdır.`);
    }

    if (line.unitPrice < 0) {
      errors.push(`${lineNo}. satır birim fiyatı negatif olamaz.`);
    }

    if (line.vatRate < 0 || line.vatRate > 100) {
      errors.push(`${lineNo}. satır KDV oranı 0 ile 100 arasında olmalıdır.`);
    }
  });

  return errors;
}

export function calculateProgressPaymentTotals(
  draft: ProgressPaymentDraft,
): ProgressPaymentTotals {
  const lines = draft.lines.map((line, index) => ({
    grossTotal: roundMoney(line.quantity * line.unitPrice),
    lineNo: index + 1,
    vatTotal: roundMoney(line.quantity * line.unitPrice * percent(line.vatRate)),
  }));
  const grossTotal = sum(lines.map((line) => line.grossTotal));
  const retentionTotal = roundMoney(grossTotal * percent(draft.retentionRate));
  const netTotal = roundMoney(grossTotal - retentionTotal);
  const vatTotal = roundMoney(netTotal * averageVatRate(draft.lines));

  return {
    grossTotal,
    grandTotal: roundMoney(netTotal + vatTotal),
    lines,
    netTotal,
    retentionTotal,
    vatTotal,
  };
}

export function createProgressPaymentService({
  auditLogRepository,
  ledgerPostingService,
  ledgerRepository,
  now,
  repository,
}: ProgressPaymentServiceOptions): ProgressPaymentService {
  async function hydrateLedgerReferences(
    rows: ProgressPaymentRow[],
    scope: TenantScope,
  ) {
    if (!ledgerRepository) {
      return rows;
    }

    const ledgerRows = await ledgerRepository.list({ scope });
    const sourceEntries = new Map(
      ledgerRows
        .filter(
          (entry) =>
            entry.sourceType === "progress-payment" &&
            entry.sourceId,
        )
        .map((entry) => [entry.sourceId as string, entry]),
    );

    return rows.map((row) => ({
      ...row,
      ...(sourceEntries.get(row.id)
        ? { ledgerDocumentNo: sourceEntries.get(row.id)?.documentNo }
        : {}),
    }));
  }

  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    return {
      ok: true as const,
      rows: await hydrateLedgerReferences(await repository.list({ scope }), scope),
    };
  }

  return {
    async list({ scope }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        data: {
          rows: resolved.rows,
        },
      };
    },

    async create({ scope, values }) {
      const permissionErrors = validateProgressPaymentMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = createProgressPaymentDraft(values);
      const errors = validateProgressPaymentDraft(draft);
      const duplicateDocument = resolved.rows.find(
        (row) => row.documentNo === draft.documentNo,
      );

      if (duplicateDocument) {
        errors.push(`Evrak no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const totals = calculateProgressPaymentTotals(draft);
      const row: ProgressPaymentRow = {
        ...draft,
        id: createProgressPaymentId(scope, draft.documentNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        status: "Taslak",
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
        grossTotal: totals.grossTotal,
        retentionTotal: totals.retentionTotal,
        netTotal: totals.netTotal,
        vatTotal: totals.vatTotal,
        grandTotal: totals.grandTotal,
        lineCount: draft.lines.length,
      };

      const created = await repository.create(row);

      await recordProgressPaymentAudit(auditLogRepository, {
        action: "progress-payment.create",
        occurredAt: created.updatedAt,
        row: created,
        scope,
        statusTo: created.status,
      });

      return {
        ok: true,
        data: created,
      };
    },

    async cancel({ scope, id }) {
      const permissionErrors = validateProgressPaymentMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Hakediş kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: true, data: existing };
      }

      const cancelled = await repository.update({
        ...existing,
        status: "İptal",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordProgressPaymentAudit(auditLogRepository, {
        action: "progress-payment.cancel",
        occurredAt: cancelled.updatedAt,
        row: cancelled,
        scope,
        statusFrom: existing.status,
        statusTo: cancelled.status,
      });

      return {
        ok: true,
        data: cancelled,
      };
    },

    async post({ scope, id }) {
      const permissionErrors = validateProgressPaymentMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Hakediş kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: false, errors: ["İptal edilmiş hakediş kesinleştirilemez."] };
      }

      if (existing.status === "Kaydedildi") {
        return { ok: true, data: existing };
      }

      if (ledgerPostingService) {
        const ledgerResult = await ledgerPostingService.post({
          progressPayment: existing,
          scope,
        });

        if (!ledgerResult.ok) {
          return { ok: false, errors: ledgerResult.errors };
        }

        return {
          ok: true,
          data: ledgerResult.data.progressPayment,
        };
      }

      const posted = await repository.update({
        ...existing,
        status: "Kaydedildi",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordProgressPaymentAudit(auditLogRepository, {
        action: "progress-payment.post",
        occurredAt: posted.updatedAt,
        row: posted,
        scope,
        statusFrom: existing.status,
        statusTo: posted.status,
      });

      return {
        ok: true,
        data: posted,
      };
    },
  };
}

type ProgressPaymentAuditInput = {
  action:
    | "progress-payment.cancel"
    | "progress-payment.create"
    | "progress-payment.post";
  occurredAt: string;
  row: ProgressPaymentRow;
  scope: TenantScope;
  statusFrom?: ProgressPaymentStatus;
  statusTo: ProgressPaymentStatus;
};

async function recordProgressPaymentAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: ProgressPaymentAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityType: "progress-payment",
      entityId: input.row.id,
      entityLabel: input.row.documentNo,
      occurredAt: input.occurredAt,
      metadata: {
        counterpartyCode: input.row.counterpartyCode,
        counterpartyName: input.row.counterpartyName,
        documentNo: input.row.documentNo,
        grandTotal: input.row.grandTotal,
        lineCount: input.row.lineCount,
        paymentType: input.row.paymentType,
        siteCode: input.row.siteCode,
        siteName: input.row.siteName,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
      },
    }),
  );
}

export function canMutateProgressPayments(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededProgressPaymentMemoryRepository(): ProgressPaymentRepository {
  const store = new Map<string, ProgressPaymentRow[]>();

  return {
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map(cloneRow);
    },

    async create(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneRow(row);

      store.set(key, [persisted, ...rows]);

      return persisted;
    },

    async update(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneRow(row);

      store.set(
        key,
        rows.map((current) => (current.id === row.id ? persisted : current)),
      );

      return persisted;
    },
  };
}

function validateProgressPaymentMutationPermission(scope: TenantScope) {
  return canMutateProgressPayments(scope)
    ? []
    : [progressPaymentMutationPermissionError];
}

export function createProgressPaymentId(scope: TenantScope, documentNo: string) {
  const normalizedDocumentNo = documentNo
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${buildTenantScopeKey(scope)}::progress-payment::${normalizedDocumentNo}`;
}

function cloneRow(row: ProgressPaymentRow): ProgressPaymentRow {
  return {
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function normalizeLine(line: ProgressPaymentLineDraft): ProgressPaymentLineDraft {
  return {
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unit: line.unit.trim(),
    unitPrice: Number(line.unitPrice),
    vatRate: Number(line.vatRate),
  };
}

function normalizeRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value);
}

function averageVatRate(lines: ProgressPaymentLineDraft[]) {
  const grossTotal = sum(lines.map((line) => line.quantity * line.unitPrice));

  if (grossTotal === 0) {
    return 0;
  }

  const weightedVatTotal = sum(
    lines.map((line) => line.quantity * line.unitPrice * percent(line.vatRate)),
  );

  return weightedVatTotal / grossTotal;
}

function percent(value: number | undefined) {
  return normalizeRate(value) / 100;
}

function sum(values: number[]) {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
