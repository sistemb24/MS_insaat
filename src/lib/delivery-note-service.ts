import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export type DeliveryNoteStatus = "Taslak" | "Kaydedildi" | "İptal";

export type DeliveryNoteLineDraft = {
  quantity: number;
  stockCode?: string;
  stockName: string;
  unit: string;
  warehouse: string;
};

export type DeliveryNoteDraft = {
  deliveryDate: string;
  description?: string;
  documentNo: string;
  lines: DeliveryNoteLineDraft[];
  linkedPurchaseInvoiceDocumentNo?: string;
  linkedPurchaseInvoiceId?: string;
  siteCode: string;
  siteName: string;
  supplierCode: string;
  supplierName: string;
};

export type DeliveryNoteCreateValues = Partial<Omit<DeliveryNoteDraft, "lines">> & {
  lines?: DeliveryNoteLineDraft[];
};

export type DeliveryNoteRow = DeliveryNoteDraft & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  id: string;
  lineCount: number;
  periodId: string;
  status: DeliveryNoteStatus;
  tenantId: string;
  totalQuantity: number;
  updatedAt: string;
  updatedBy: string;
};

export type DeliveryNoteRepository = {
  create(row: DeliveryNoteRow): Promise<DeliveryNoteRow>;
  list(input: { scope: TenantScope }): Promise<DeliveryNoteRow[]>;
  update(row: DeliveryNoteRow): Promise<DeliveryNoteRow>;
};

export type DeliveryNoteServiceResult<T> =
  | { data: T; errors?: never; ok: true }
  | { data?: never; errors: string[]; ok: false };

export type DeliveryNoteService = {
  cancel(input: { id: string; scope: TenantScope }): Promise<DeliveryNoteServiceResult<DeliveryNoteRow>>;
  create(input: { scope: TenantScope; values: DeliveryNoteCreateValues }): Promise<DeliveryNoteServiceResult<DeliveryNoteRow>>;
  list(input: { scope: TenantScope }): Promise<DeliveryNoteServiceResult<{ rows: DeliveryNoteRow[] }>>;
  post(input: { id: string; scope: TenantScope }): Promise<DeliveryNoteServiceResult<DeliveryNoteRow>>;
  update(input: { id: string; scope: TenantScope; values: DeliveryNoteCreateValues }): Promise<DeliveryNoteServiceResult<DeliveryNoteRow>>;
};

export function createDeliveryNoteService({
  auditLogRepository,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now: () => string;
  repository: DeliveryNoteRepository;
}): DeliveryNoteService {
  async function resolve(scope: TenantScope) {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false as const };
    return { ok: true as const, rows: await repository.list({ scope }) };
  }

  async function mutateStatus(
    scope: TenantScope,
    id: string,
    targetStatus: Extract<DeliveryNoteStatus, "Kaydedildi" | "İptal">,
  ): Promise<DeliveryNoteServiceResult<DeliveryNoteRow>> {
    const permissionErrors = validateMutationPermission(scope);
    if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
    const resolved = await resolve(scope);
    if (!resolved.ok) return resolved;
    const existing = resolved.rows.find((row) => row.id === id);
    if (!existing) return { errors: ["İrsaliye kaydı bulunamadı."], ok: false };
    if (existing.status === targetStatus) return { data: existing, ok: true };
    if (existing.status === "İptal" && targetStatus === "Kaydedildi") {
      return { errors: ["İptal edilmiş irsaliye kesinleştirilemez."], ok: false };
    }
    const updated = await repository.update({
      ...existing,
      status: targetStatus,
      updatedAt: now(),
      updatedBy: scope.userId,
    });
    await recordAudit(auditLogRepository, scope, updated, {
      action: targetStatus === "İptal" ? "delivery-note.cancel" : "delivery-note.post",
      statusFrom: existing.status,
    });
    return { data: updated, ok: true };
  }

  return {
    async cancel({ id, scope }) {
      return mutateStatus(scope, id, "İptal");
    },
    async create({ scope, values }) {
      const permissionErrors = validateMutationPermission(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await resolve(scope);
      if (!resolved.ok) return resolved;
      const draft = normalizeDraft(values);
      const errors = validateDeliveryNoteDraft(draft);
      if (resolved.rows.some((row) => row.documentNo === draft.documentNo)) {
        errors.push(`İrsaliye no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }
      if (errors.length > 0) return { errors, ok: false };
      const timestamp = now();
      const row: DeliveryNoteRow = {
        ...draft,
        companyId: scope.companyId,
        createdAt: timestamp,
        createdBy: scope.userId,
        id: createDeliveryNoteId(scope, draft.documentNo),
        lineCount: draft.lines.length,
        periodId: scope.periodId,
        status: "Taslak",
        tenantId: scope.tenantId,
        totalQuantity: sumQuantity(draft.lines),
        updatedAt: timestamp,
        updatedBy: scope.userId,
      };
      const created = await repository.create(row);
      await recordAudit(auditLogRepository, scope, created, { action: "delivery-note.create" });
      return { data: created, ok: true };
    },
    async list({ scope }) {
      const resolved = await resolve(scope);
      return resolved.ok
        ? { data: { rows: resolved.rows }, ok: true }
        : resolved;
    },
    async post({ id, scope }) {
      return mutateStatus(scope, id, "Kaydedildi");
    },
    async update({ id, scope, values }) {
      const permissionErrors = validateMutationPermission(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await resolve(scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.rows.find((row) => row.id === id);
      if (!existing) return { errors: ["İrsaliye kaydı bulunamadı."], ok: false };
      if (existing.status !== "Taslak") {
        return { errors: ["Yalnız taslak irsaliye düzenlenebilir."], ok: false };
      }
      const draft = normalizeDraft(values);
      const errors = validateDeliveryNoteDraft(draft);
      if (resolved.rows.some((row) => row.id !== id && row.documentNo === draft.documentNo)) {
        errors.push(`İrsaliye no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }
      if (errors.length > 0) return { errors, ok: false };
      const updated = await repository.update({
        ...existing,
        ...draft,
        lineCount: draft.lines.length,
        totalQuantity: sumQuantity(draft.lines),
        updatedAt: now(),
        updatedBy: scope.userId,
      });
      await recordAudit(auditLogRepository, scope, updated, {
        action: "delivery-note.update",
        statusFrom: existing.status,
      });
      return { data: updated, ok: true };
    },
  };
}

export function validateDeliveryNoteDraft(draft: DeliveryNoteDraft) {
  const errors: string[] = [];
  if (!draft.documentNo) errors.push("İrsaliye no zorunludur.");
  if (!draft.deliveryDate) errors.push("İrsaliye tarihi zorunludur.");
  if (!draft.supplierCode || !draft.supplierName) errors.push("Tedarikçi zorunludur.");
  if (!draft.siteCode || !draft.siteName) errors.push("Şantiye zorunludur.");
  if (draft.lines.length === 0) errors.push("En az bir irsaliye satırı zorunludur.");
  draft.lines.forEach((line, index) => {
    if (!line.stockName) errors.push(`${index + 1}. satır stok/hizmet adı zorunludur.`);
    if (!line.warehouse) errors.push(`${index + 1}. satır depo zorunludur.`);
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors.push(`${index + 1}. satır miktarı 0'dan büyük olmalıdır.`);
    }
  });
  return errors;
}

export function validateDeliveryNoteStockCodes(
  values: DeliveryNoteCreateValues,
  activeStockCodes: Iterable<string>,
) {
  const active = new Set(activeStockCodes);
  const invalid = [...new Set((values.lines ?? []).map((line) => line.stockCode?.trim()).filter((code): code is string => Boolean(code)))].filter((code) => !active.has(code));
  return invalid.length > 0 ? [`Aktif stok kartı bulunamadı: ${invalid.join(", ")}`] : [];
}

export function canMutateDeliveryNotes(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededDeliveryNoteMemoryRepository(): DeliveryNoteRepository {
  const store = new Map<string, DeliveryNoteRow[]>();
  return {
    async create(row) {
      const key = scopeKeyFromRow(row);
      const persisted = cloneRow(row);
      store.set(key, [...(store.get(key) ?? []), persisted]);
      return persisted;
    },
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map(cloneRow);
    },
    async update(row) {
      const key = scopeKeyFromRow(row);
      const persisted = cloneRow(row);
      store.set(key, (store.get(key) ?? []).map((item) => item.id === row.id ? persisted : item));
      return persisted;
    },
  };
}

function normalizeDraft(values: DeliveryNoteCreateValues): DeliveryNoteDraft {
  return {
    deliveryDate: values.deliveryDate?.trim() ?? "",
    description: values.description?.trim() ?? "",
    documentNo: values.documentNo?.trim() ?? "",
    lines: (values.lines ?? []).map((line) => ({
      quantity: Number(line.quantity),
      stockCode: line.stockCode?.trim() ?? "",
      stockName: line.stockName.trim(),
      unit: line.unit.trim() || "Adet",
      warehouse: line.warehouse.trim(),
    })),
    linkedPurchaseInvoiceDocumentNo: values.linkedPurchaseInvoiceDocumentNo?.trim() ?? "",
    linkedPurchaseInvoiceId: values.linkedPurchaseInvoiceId?.trim() ?? "",
    siteCode: values.siteCode?.trim() ?? "",
    siteName: values.siteName?.trim() ?? "",
    supplierCode: values.supplierCode?.trim() ?? "",
    supplierName: values.supplierName?.trim() ?? "",
  };
}

async function recordAudit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  row: DeliveryNoteRow,
  input: {
    action: "delivery-note.cancel" | "delivery-note.create" | "delivery-note.post" | "delivery-note.update";
    statusFrom?: DeliveryNoteStatus;
  },
) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action: input.action,
    entityId: row.id,
    entityLabel: row.documentNo,
    entityType: "delivery-note",
    metadata: {
      lineCount: row.lineCount,
      linkedPurchaseInvoiceId: row.linkedPurchaseInvoiceId,
      siteCode: row.siteCode,
      statusFrom: input.statusFrom,
      statusTo: row.status,
      supplierCode: row.supplierCode,
      totalQuantity: row.totalQuantity,
    },
    occurredAt: row.updatedAt,
  }));
}

function validateMutationPermission(scope: TenantScope) {
  return canMutateDeliveryNotes(scope) ? [] : ["İrsaliye işlemi için muhasebe yetkisi gereklidir."];
}

function sumQuantity(lines: DeliveryNoteLineDraft[]) {
  return Math.round(lines.reduce((sum, line) => sum + line.quantity, 0) * 10000) / 10000;
}

function createDeliveryNoteId(scope: TenantScope, documentNo: string) {
  const suffix = documentNo.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${buildTenantScopeKey(scope)}::delivery-note::${suffix}`;
}

function scopeKeyFromRow(row: DeliveryNoteRow) {
  return `${row.tenantId}::${row.companyId}::${row.periodId}`;
}

function cloneRow(row: DeliveryNoteRow): DeliveryNoteRow {
  return { ...row, lines: row.lines.map((line) => ({ ...line })) };
}
