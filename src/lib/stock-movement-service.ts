import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

export type StockMovementType = "Depo Transferi" | "Şantiye Çıkışı";
export type StockMovementStatus = "Taslak" | "Kaydedildi" | "İptal";

export type StockMovementCreateValues = {
  description?: string;
  documentNo?: string;
  movementDate?: string;
  movementType?: StockMovementType;
  quantity?: number;
  siteCode?: string;
  siteName?: string;
  sourceWarehouse?: string;
  stockCode?: string;
  stockName?: string;
  targetWarehouse?: string;
  unit?: string;
  unitCost?: number;
};

export type StockMovementRow = Required<Omit<StockMovementCreateValues, "description" | "siteCode" | "siteName" | "targetWarehouse">> & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  description?: string;
  id: string;
  periodId: string;
  siteCode?: string;
  siteName?: string;
  status: StockMovementStatus;
  targetWarehouse?: string;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type StockMovementRepository = {
  create(row: StockMovementRow): Promise<StockMovementRow>;
  list(input: { scope: TenantScope }): Promise<StockMovementRow[]>;
  update(row: StockMovementRow): Promise<StockMovementRow>;
};

export type StockAvailabilityResolver = (input: {
  excludeMovementId?: string;
  scope: TenantScope;
  stockCode: string;
  stockName: string;
  warehouse: string;
}) => Promise<number>;

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export function createStockMovementService({
  auditLogRepository,
  availability,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  availability?: StockAvailabilityResolver;
  now: () => string;
  repository: StockMovementRepository;
}) {
  async function resolve(scope: TenantScope) {
    const errors = validateTenantScope(scope);
    return errors.length > 0
      ? { errors, ok: false as const }
      : { ok: true as const, rows: await repository.list({ scope }) };
  }

  async function getRow(scope: TenantScope, id: string) {
    const resolved = await resolve(scope);
    if (!resolved.ok) return resolved;
    const row = resolved.rows.find((item) => item.id === id);
    return row ? { ok: true as const, row } : { errors: ["Stok hareketi bulunamadı."], ok: false as const };
  }

  return {
    async cancel({ id, scope }: { id: string; scope: TenantScope }): Promise<Result<StockMovementRow>> {
      const permissionErrors = mutationErrors(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await getRow(scope, id);
      if (!resolved.ok) return resolved;
      if (resolved.row.status === "İptal") return { data: resolved.row, ok: true };
      if (resolved.row.status === "Kaydedildi" && resolved.row.movementType === "Depo Transferi" && availability) {
        const targetAvailable = await availability({
          excludeMovementId: resolved.row.id,
          scope,
          stockCode: resolved.row.stockCode,
          stockName: resolved.row.stockName,
          warehouse: resolved.row.targetWarehouse ?? "",
        });
        if (targetAvailable < resolved.row.quantity) {
          return { errors: [`Transfer iptal edilemez; hedef depoda ${formatQuantity(resolved.row.quantity)} yerine ${formatQuantity(targetAvailable)} ${resolved.row.unit} kullanılabilir.`], ok: false };
        }
      }
      const cancelled = await repository.update({ ...resolved.row, status: "İptal", updatedAt: now(), updatedBy: scope.userId });
      await recordAudit(auditLogRepository, scope, cancelled, "stock-movement.cancel", resolved.row.status);
      return { data: cancelled, ok: true };
    },

    async create({ scope, values }: { scope: TenantScope; values: StockMovementCreateValues }): Promise<Result<StockMovementRow>> {
      const permissionErrors = mutationErrors(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await resolve(scope);
      if (!resolved.ok) return resolved;
      const normalized = normalize(values);
      const errors = validateStockMovementValues(normalized);
      if (resolved.rows.some((row) => row.documentNo === normalized.documentNo)) errors.push(`Hareket no bu dönem için zaten kullanılıyor: ${normalized.documentNo}`);
      if (errors.length > 0) return { errors, ok: false };
      const timestamp = now();
      const row: StockMovementRow = {
        ...normalized,
        companyId: scope.companyId,
        createdAt: timestamp,
        createdBy: scope.userId,
        id: createId(scope, normalized.documentNo),
        periodId: scope.periodId,
        status: "Taslak",
        tenantId: scope.tenantId,
        updatedAt: timestamp,
        updatedBy: scope.userId,
      };
      const created = await repository.create(row);
      await recordAudit(auditLogRepository, scope, created, "stock-movement.create");
      return { data: created, ok: true };
    },

    async list({ scope }: { scope: TenantScope }) {
      const resolved = await resolve(scope);
      return resolved.ok ? { data: { rows: resolved.rows }, ok: true as const } : resolved;
    },

    async post({ id, scope }: { id: string; scope: TenantScope }): Promise<Result<StockMovementRow>> {
      const permissionErrors = mutationErrors(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await getRow(scope, id);
      if (!resolved.ok) return resolved;
      if (resolved.row.status === "Kaydedildi") return { data: resolved.row, ok: true };
      if (resolved.row.status === "İptal") return { errors: ["İptal edilmiş stok hareketi kesinleştirilemez."], ok: false };
      if (availability) {
        const sourceAvailable = await availability({
          excludeMovementId: resolved.row.id,
          scope,
          stockCode: resolved.row.stockCode,
          stockName: resolved.row.stockName,
          warehouse: resolved.row.sourceWarehouse,
        });
        if (sourceAvailable < resolved.row.quantity) {
          return { errors: [`Yetersiz stok: ${resolved.row.sourceWarehouse} deposunda ${formatQuantity(sourceAvailable)} ${resolved.row.unit} kullanılabilir.`], ok: false };
        }
      }
      const posted = await repository.update({ ...resolved.row, status: "Kaydedildi", updatedAt: now(), updatedBy: scope.userId });
      await recordAudit(auditLogRepository, scope, posted, "stock-movement.post", resolved.row.status);
      return { data: posted, ok: true };
    },
  };
}

export function validateStockMovementValues(values: ReturnType<typeof normalize>) {
  const errors: string[] = [];
  if (!values.documentNo) errors.push("Hareket no zorunludur.");
  if (!values.movementDate) errors.push("Hareket tarihi zorunludur.");
  if (!values.stockName) errors.push("Stok adı zorunludur.");
  if (!values.sourceWarehouse) errors.push("Kaynak depo zorunludur.");
  if (!values.unit) errors.push("Birim zorunludur.");
  if (!Number.isFinite(values.quantity) || values.quantity <= 0) errors.push("Miktar 0'dan büyük olmalıdır.");
  if (!Number.isFinite(values.unitCost) || values.unitCost < 0) errors.push("Birim maliyet negatif olamaz.");
  if (values.movementType === "Depo Transferi") {
    if (!values.targetWarehouse) errors.push("Hedef depo zorunludur.");
    if (values.targetWarehouse && values.targetWarehouse === values.sourceWarehouse) errors.push("Kaynak ve hedef depo farklı olmalıdır.");
  }
  if (values.movementType === "Şantiye Çıkışı" && (!values.siteCode || !values.siteName)) errors.push("Şantiye çıkışı için şantiye zorunludur.");
  return errors;
}

export function canMutateStockMovements(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededStockMovementMemoryRepository(): StockMovementRepository {
  const store = new Map<string, StockMovementRow[]>();
  return {
    async create(row) { const key = keyFromRow(row); store.set(key, [...(store.get(key) ?? []), { ...row }]); return { ...row }; },
    async list({ scope }) { return (store.get(buildTenantScopeKey(scope)) ?? []).map((row) => ({ ...row })); },
    async update(row) { const key = keyFromRow(row); store.set(key, (store.get(key) ?? []).map((item) => item.id === row.id ? { ...row } : item)); return { ...row }; },
  };
}

function normalize(values: StockMovementCreateValues) {
  return {
    description: values.description?.trim() || undefined,
    documentNo: values.documentNo?.trim() ?? "",
    movementDate: values.movementDate?.trim() ?? "",
    movementType: values.movementType === "Şantiye Çıkışı" ? "Şantiye Çıkışı" as const : "Depo Transferi" as const,
    quantity: Number(values.quantity),
    siteCode: values.siteCode?.trim() || undefined,
    siteName: values.siteName?.trim() || undefined,
    sourceWarehouse: values.sourceWarehouse?.trim() ?? "",
    stockCode: values.stockCode?.trim() ?? "",
    stockName: values.stockName?.trim() ?? "",
    targetWarehouse: values.targetWarehouse?.trim() || undefined,
    unit: values.unit?.trim() || "Adet",
    unitCost: Number(values.unitCost),
  };
}

async function recordAudit(repository: AuditLogRepository | undefined, scope: TenantScope, row: StockMovementRow, action: "stock-movement.cancel" | "stock-movement.create" | "stock-movement.post", statusFrom?: StockMovementStatus) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action,
    entityId: row.id,
    entityLabel: row.documentNo,
    entityType: "stock-movement",
    metadata: { movementType: row.movementType, quantity: row.quantity, sourceWarehouse: row.sourceWarehouse, statusFrom, statusTo: row.status, stockCode: row.stockCode, targetWarehouse: row.targetWarehouse },
    occurredAt: row.updatedAt,
  }));
}

function mutationErrors(scope: TenantScope) { return canMutateStockMovements(scope) ? [] : ["Stok hareketi için muhasebe veya yönetici yetkisi gereklidir."]; }
function createId(scope: TenantScope, documentNo: string) { const suffix = documentNo.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return `${buildTenantScopeKey(scope)}::stock-movement::${suffix}`; }
function keyFromRow(row: StockMovementRow) { return `${row.tenantId}::${row.companyId}::${row.periodId}`; }
function formatQuantity(value: number) { return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value); }
