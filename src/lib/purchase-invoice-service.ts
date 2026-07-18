import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  calculateInvoiceTotals,
  createPurchaseInvoiceDraft,
  type PurchaseInvoiceDraft,
  type PurchaseInvoiceLineDraft,
  type PurchaseInvoiceTotals,
  validatePurchaseInvoiceDraft,
} from "./invoices";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";
import type { PurchaseInvoiceLedgerPostingService } from "./purchase-invoice-ledger-posting-service";
import type { InvoiceLedgerReversalService } from "./invoice-ledger-reversal-service";
import type { LedgerRepository } from "./ledger-service";

export type PurchaseInvoiceStatus = "Taslak" | "Kaydedildi" | "İptal";

export type PurchaseInvoiceRow = PurchaseInvoiceDraft &
  Omit<PurchaseInvoiceTotals, "lines"> & {
    id: string;
    tenantId: string;
    companyId: string;
    periodId: string;
    status: PurchaseInvoiceStatus;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
    lineCount: number;
    ledgerEntryId?: string;
    ledgerDocumentNo?: string;
    ledgerReversalDocumentNo?: string;
  };

export type PurchaseInvoiceCreateValues = Partial<
  Omit<PurchaseInvoiceDraft, "lines">
> & {
  lines?: PurchaseInvoiceLineDraft[];
};

export function validatePurchaseInvoiceStockCodes(
  values: PurchaseInvoiceCreateValues,
  activeStockCodes: Iterable<string>,
) {
  const stockCodes = (values.lines ?? [])
    .map((line) => line.stockCode?.trim())
    .filter((code): code is string => Boolean(code));
  const activeCodes = new Set(activeStockCodes);
  const invalidCodes = [...new Set(stockCodes)].filter((code) => !activeCodes.has(code));
  return invalidCodes.length > 0
    ? [`Aktif stok kartı bulunamadı: ${invalidCodes.join(", ")}`]
    : [];
}

export type PurchaseInvoiceRepository = {
  list(input: PurchaseInvoiceRepositoryListInput): Promise<PurchaseInvoiceRow[]>;
  create(input: PurchaseInvoiceRow): Promise<PurchaseInvoiceRow>;
  update(input: PurchaseInvoiceRow): Promise<PurchaseInvoiceRow>;
};

export type PurchaseInvoiceRepositoryListInput = {
  scope: TenantScope;
};

export type PurchaseInvoiceService = {
  list(
    input: PurchaseInvoiceListInput,
  ): Promise<PurchaseInvoiceServiceResult<PurchaseInvoiceListData>>;
  create(
    input: PurchaseInvoiceCreateInput,
  ): Promise<PurchaseInvoiceServiceResult<PurchaseInvoiceRow>>;
  update(
    input: PurchaseInvoiceUpdateInput,
  ): Promise<PurchaseInvoiceServiceResult<PurchaseInvoiceRow>>;
  cancel(
    input: PurchaseInvoiceCancelInput,
  ): Promise<PurchaseInvoiceServiceResult<PurchaseInvoiceRow>>;
  post(
    input: PurchaseInvoicePostInput,
  ): Promise<PurchaseInvoiceServiceResult<PurchaseInvoiceRow>>;
};

export type PurchaseInvoiceListInput = {
  scope: TenantScope;
};

export type PurchaseInvoiceCreateInput = PurchaseInvoiceListInput & {
  values: PurchaseInvoiceCreateValues;
};

export type PurchaseInvoiceUpdateInput = PurchaseInvoiceCreateInput & {
  id: string;
};

export type PurchaseInvoiceCancelInput = PurchaseInvoiceListInput & {
  id: string;
};

export type PurchaseInvoicePostInput = PurchaseInvoiceCancelInput;

export type PurchaseInvoiceListData = {
  rows: PurchaseInvoiceRow[];
};

export type PurchaseInvoiceServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type PurchaseInvoiceServiceOptions = {
  repository: PurchaseInvoiceRepository;
  now: () => string;
  auditLogRepository?: AuditLogRepository;
  ledgerPostingService?: PurchaseInvoiceLedgerPostingService;
  ledgerReversalService?: InvoiceLedgerReversalService;
  ledgerRepository?: Pick<LedgerRepository, "list">;
};

export type InvoiceServiceConfiguration = {
  auditActionPrefix: "purchase-invoice" | "sales-invoice";
  auditEntityType: "purchase-invoice" | "sales-invoice";
  idSegment: "purchase-invoice" | "sales-invoice";
  enforceLedgerLifecycle?: boolean;
  ledgerPostingService?: PurchaseInvoiceLedgerPostingService;
  ledgerReversalService?: InvoiceLedgerReversalService;
  ledgerRepository?: Pick<LedgerRepository, "list">;
  invoiceNoun?: "alış" | "satış";
  unknownInvoiceLabel?: string;
  validateDraft: (draft: PurchaseInvoiceDraft) => string[];
};

const invoiceMutationPermissionError =
  "Fatura işlemi için muhasebe yetkisi gereklidir.";

export function createPurchaseInvoiceService({
  repository,
  now,
  auditLogRepository,
  ledgerPostingService,
  ledgerReversalService,
  ledgerRepository,
}: PurchaseInvoiceServiceOptions): PurchaseInvoiceService {
  return createInvoiceService(
    { repository, now, auditLogRepository, ledgerRepository },
    {
      auditActionPrefix: "purchase-invoice",
      auditEntityType: "purchase-invoice",
      enforceLedgerLifecycle: true,
      invoiceNoun: "alış",
      unknownInvoiceLabel: "Bilinmeyen alış faturası",
      idSegment: "purchase-invoice",
      ledgerPostingService,
      ledgerReversalService,
      ledgerRepository,
      validateDraft: validatePurchaseInvoiceDraft,
    },
  );
}

export function createInvoiceService(
  { repository, now, auditLogRepository, ledgerRepository }: PurchaseInvoiceServiceOptions,
  configuration: InvoiceServiceConfiguration,
): PurchaseInvoiceService {
  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    const rows = await repository.list({ scope });

    if (!ledgerRepository) {
      return { ok: true as const, rows };
    }

    const ledgerEntries = await ledgerRepository.list({ scope });
    const sourceEntries = new Map(
      ledgerEntries
        .filter((entry) => entry.sourceType === configuration.auditEntityType && entry.sourceId)
        .map((entry) => [entry.sourceId!, entry]),
    );
    const reversalEntries = new Map(
      ledgerEntries
        .filter((entry) => entry.sourceType === `${configuration.auditEntityType}-reversal` && entry.sourceId)
        .map((entry) => [entry.sourceId!, entry]),
    );

    return {
      ok: true as const,
      rows: rows.map((row) => ({
        ...row,
        ...(sourceEntries.has(row.id)
          ? {
              ledgerEntryId: sourceEntries.get(row.id)?.id,
              ledgerDocumentNo: sourceEntries.get(row.id)?.documentNo,
            }
          : {}),
        ...(reversalEntries.has(row.id)
          ? { ledgerReversalDocumentNo: reversalEntries.get(row.id)?.documentNo }
          : {}),
      })),
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
      const permissionErrors = validateInvoiceMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = createPurchaseInvoiceDraft(values);
      const errors = configuration.validateDraft(draft);
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
      const totals = calculateInvoiceTotals(draft);
      const row: PurchaseInvoiceRow = {
        ...draft,
        id: createInvoiceId(scope, draft.documentNo, configuration.idSegment),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        status: "Taslak",
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        netTotal: totals.netTotal,
        vatTotal: totals.vatTotal,
        withholdingTotal: totals.withholdingTotal,
        grandTotal: totals.grandTotal,
        lineCount: draft.lines.length,
      };

      const created = await repository.create(row);

      await recordInvoiceAudit(auditLogRepository, {
        scope,
        row: created,
        action: `${configuration.auditActionPrefix}.create`,
        entityType: configuration.auditEntityType,
        occurredAt: created.updatedAt,
        statusTo: created.status,
      });

      return {
        ok: true,
        data: created,
      };
    },

    async update({ scope, id, values }) {
      const permissionErrors = validateInvoiceMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Fatura kaydı bulunamadı."] };
      }

      if (configuration.enforceLedgerLifecycle && existing.status !== "Taslak") {
        return {
          ok: false,
          errors: [`Yalnız taslak ${configuration.invoiceNoun ?? "alış"} faturası güncellenebilir.`],
        };
      }

      const draft = createPurchaseInvoiceDraft(values);
      const errors = configuration.validateDraft(draft);
      const duplicateDocument = resolved.rows.find(
        (row) => row.id !== id && row.documentNo === draft.documentNo,
      );

      if (duplicateDocument) {
        errors.push(`Evrak no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const totals = calculateInvoiceTotals(draft);
      const row: PurchaseInvoiceRow = {
        ...draft,
        id: existing.id,
        tenantId: existing.tenantId,
        companyId: existing.companyId,
        periodId: existing.periodId,
        status: existing.status,
        createdBy: existing.createdBy,
        updatedBy: scope.userId,
        createdAt: existing.createdAt,
        updatedAt: now(),
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        netTotal: totals.netTotal,
        vatTotal: totals.vatTotal,
        withholdingTotal: totals.withholdingTotal,
        grandTotal: totals.grandTotal,
        lineCount: draft.lines.length,
      };

      const updated = await repository.update(row);

      await recordInvoiceAudit(auditLogRepository, {
        scope,
        row: updated,
        action: `${configuration.auditActionPrefix}.update`,
        entityType: configuration.auditEntityType,
        occurredAt: updated.updatedAt,
        statusFrom: existing.status,
        statusTo: updated.status,
      });

      return {
        ok: true,
        data: updated,
      };
    },

    async cancel({ scope, id }) {
      const permissionErrors = validateInvoiceMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      if (scope.periodClosed) {
        return { ok: false, errors: ["Kapalı dönemde fatura iptal edilemez."] };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Fatura kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: true, data: existing };
      }

      let ledgerReversalDocumentNo: string | undefined;
      if (configuration.enforceLedgerLifecycle && existing.status === "Kaydedildi") {
        if (configuration.ledgerReversalService) {
          const reversalResult = await configuration.ledgerReversalService.reverse({ invoice: existing, scope });
          if (!reversalResult.ok) {
            const errors = reversalResult.errors;
            await safeRecordInvoiceRejectionAudit(auditLogRepository, {
              action: `${configuration.auditActionPrefix}.cancel-rejected`,
              errors,
              occurredAt: now(),
              reasonCode: "ledger-reversal-failed",
              row: existing,
              scope,
              entityType: configuration.auditEntityType,
            });
            return { ok: false, errors };
          }
          ledgerReversalDocumentNo = reversalResult.data.ledgerEntry.documentNo;
        } else {
        const errors = [
          `Kesinleşmiş ${configuration.invoiceNoun ?? "alış"} faturası ters kayıt akışı uygulanmadan iptal edilemez.`,
        ];
        await safeRecordInvoiceRejectionAudit(auditLogRepository, {
          action: `${configuration.auditActionPrefix}.cancel-rejected`,
          errors,
          occurredAt: now(),
          reasonCode: "ledger-reversal-required",
          row: existing,
          scope,
          entityType: configuration.auditEntityType,
        });
        return { ok: false, errors };
        }
      }

      const cancelled = await repository.update({
        ...existing,
        status: "İptal",
        updatedBy: scope.userId,
        updatedAt: now(),
        ...(ledgerReversalDocumentNo ? { ledgerReversalDocumentNo } : {}),
      });

      await recordInvoiceAudit(auditLogRepository, {
        scope,
        row: cancelled,
        action: `${configuration.auditActionPrefix}.cancel`,
        entityType: configuration.auditEntityType,
        occurredAt: cancelled.updatedAt,
        statusFrom: existing.status,
        statusTo: cancelled.status,
      });

      return {
        ok: true,
        data: cancelled,
      };
    },

    async post({ scope, id }) {
      const permissionErrors = validateInvoiceMutationPermission(scope);

      if (permissionErrors.length > 0) {
        if (configuration.ledgerPostingService) {
          await safeRecordInvoiceRejectionAudit(auditLogRepository, {
            action: `${configuration.auditActionPrefix}.ledger-post-rejected`,
            entityId: id,
            errors: permissionErrors,
            occurredAt: now(),
            reasonCode: "permission-denied",
            scope,
            entityType: configuration.auditEntityType,
          });
        }
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        if (configuration.ledgerPostingService) {
          await safeRecordInvoiceRejectionAudit(auditLogRepository, {
            action: `${configuration.auditActionPrefix}.ledger-post-rejected`,
            entityId: id,
            errors: resolved.errors,
            occurredAt: now(),
            reasonCode: "scope-invalid",
            scope,
            entityType: configuration.auditEntityType,
          });
        }
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        const errors = ["Fatura kaydı bulunamadı."];
        if (configuration.ledgerPostingService) {
          await safeRecordInvoiceRejectionAudit(auditLogRepository, {
            action: `${configuration.auditActionPrefix}.ledger-post-rejected`,
            entityId: id,
            errors,
            occurredAt: now(),
            reasonCode: "invoice-not-found",
            scope,
            entityType: configuration.auditEntityType,
          });
        }
        return { ok: false, errors };
      }

      if (existing.status === "İptal") {
        const errors = ["İptal edilmiş fatura kesinleştirilemez."];
        if (configuration.ledgerPostingService) {
          await safeRecordInvoiceRejectionAudit(auditLogRepository, {
            action: `${configuration.auditActionPrefix}.ledger-post-rejected`,
            errors,
            occurredAt: now(),
            reasonCode: "invalid-status",
            row: existing,
            scope,
            entityType: configuration.auditEntityType,
          });
        }
        return { ok: false, errors };
      }

      if (existing.status === "Kaydedildi") {
        return { ok: true, data: existing };
      }

      if (configuration.ledgerPostingService) {
        let postingResult: Awaited<
          ReturnType<PurchaseInvoiceLedgerPostingService["post"]>
        >;
        try {
          postingResult = await configuration.ledgerPostingService.post({
            invoice: existing,
            scope,
          });
        } catch {
          postingResult = {
            ok: false,
          errors: [`${configuration.invoiceNoun === "satış" ? "Satış" : "Alış"} faturası muhasebe fişi oluşturulamadı.`],
            reasonCode: "persistence-failed",
          };
        }

        if (!postingResult.ok) {
          await safeRecordInvoiceRejectionAudit(auditLogRepository, {
            action: `${configuration.auditActionPrefix}.ledger-post-rejected`,
            errors: postingResult.errors,
            occurredAt: now(),
            reasonCode: postingResult.reasonCode,
            row: existing,
            scope,
            entityType: configuration.auditEntityType,
          });
          return { ok: false, errors: postingResult.errors };
        }

        return {
          ok: true,
          data: {
            ...postingResult.data.invoice,
            ledgerEntryId: postingResult.data.ledgerEntry.id,
            ledgerDocumentNo: postingResult.data.ledgerEntry.documentNo,
          },
        };
      }

      const posted = await repository.update({
        ...existing,
        status: "Kaydedildi",
        updatedBy: scope.userId,
        updatedAt: now(),
      });

      await recordInvoiceAudit(auditLogRepository, {
        scope,
        row: posted,
        action: `${configuration.auditActionPrefix}.post`,
        entityType: configuration.auditEntityType,
        occurredAt: posted.updatedAt,
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


type InvoiceAuditInput = {
  scope: TenantScope;
  row: PurchaseInvoiceRow;
  action: `${"purchase-invoice" | "sales-invoice"}.${
    | "create"
    | "update"
    | "cancel"
    | "cancel-rejected"
    | "ledger-post-rejected"
    | "post"}`;
  entityType: "purchase-invoice" | "sales-invoice";
  occurredAt: string;
  statusFrom?: PurchaseInvoiceStatus;
  statusTo: PurchaseInvoiceStatus;
};

type InvoiceRejectionAuditInput = {
  action: `${"purchase-invoice" | "sales-invoice"}.${
    | "cancel-rejected"
    | "ledger-post-rejected"}`;
  errors: string[];
  occurredAt: string;
  reasonCode: string;
  row?: PurchaseInvoiceRow;
  entityId?: string;
  scope: TenantScope;
  entityType?: "purchase-invoice" | "sales-invoice";
};

async function recordInvoiceAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: InvoiceAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityType: input.entityType,
      entityId: input.row.id,
      entityLabel: input.row.documentNo,
      occurredAt: input.occurredAt,
      metadata: {
        documentNo: input.row.documentNo,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
        counterpartyCode: input.row.counterpartyCode,
        counterpartyName: input.row.counterpartyName,
        siteCode: input.row.siteCode,
        siteName: input.row.siteName,
        grandTotal: input.row.grandTotal,
        lineCount: input.row.lineCount,
      },
    }),
  );
}

async function safeRecordInvoiceRejectionAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: InvoiceRejectionAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  try {
    await auditLogRepository.record(
      createAuditLogEntry(input.scope, {
        action: input.action,
        entityType: input.entityType ?? "purchase-invoice",
        entityId: input.row?.id ?? input.entityId ?? "unknown",
        entityLabel: input.row?.documentNo ?? input.entityId ?? "Bilinmeyen fatura",
        occurredAt: input.occurredAt,
        metadata: {
          ...(input.row
            ? {
                documentNo: input.row.documentNo,
                grandTotal: input.row.grandTotal,
                statusFrom: input.row.status,
                statusTo: input.row.status,
              }
            : {}),
          errors: [...input.errors],
          reasonCode: input.reasonCode,
        },
      }),
    );
  } catch {
    // A rejected financial mutation must remain controlled if audit persistence is unavailable.
  }
}
function validateInvoiceMutationPermission(scope: TenantScope) {
  if (canMutatePurchaseInvoices(scope)) {
    return [];
  }

  return [invoiceMutationPermissionError];
}

export function canMutatePurchaseInvoices(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededPurchaseInvoiceMemoryRepository(): PurchaseInvoiceRepository {
  const store = new Map<string, PurchaseInvoiceRow[]>();

  return {
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map((row) => ({
        ...row,
        lines: row.lines.map((line) => ({ ...line })),
      }));
    },

    async create(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneInvoiceRow(row);

      store.set(key, [...rows, persisted]);

      return persisted;
    },

    async update(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneInvoiceRow(row);

      store.set(
        key,
        rows.map((current) => (current.id === row.id ? persisted : current)),
      );

      return persisted;
    },
  };
}

function cloneInvoiceRow(row: PurchaseInvoiceRow): PurchaseInvoiceRow {
  return {
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function createInvoiceId(
  scope: TenantScope,
  documentNo: string,
  idSegment: "purchase-invoice" | "sales-invoice",
) {
  const normalizedDocumentNo = documentNo
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${buildTenantScopeKey(scope)}::${idSegment}::${normalizedDocumentNo}`;
}


