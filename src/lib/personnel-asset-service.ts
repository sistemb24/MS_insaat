import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

export type PersonnelAssetStatus = "Zimmetli" | "İade Edildi" | "Kayıp" | "Kullanılamaz";

export type PersonnelAssetCreateValues = {
  assetCategory?: string;
  assetCode?: string;
  assetName?: string;
  assignedAt?: string;
  dueAt?: string;
  notes?: string;
  personnelCode?: string;
  personnelName?: string;
  quantity?: number;
  serialNo?: string;
  siteCode?: string;
  siteName?: string;
};

export type PersonnelAssetRow = Required<Omit<PersonnelAssetCreateValues, "dueAt" | "notes" | "serialNo" | "siteCode" | "siteName">> & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  dueAt?: string;
  id: string;
  notes?: string;
  periodId: string;
  returnedAt?: string;
  serialNo?: string;
  siteCode?: string;
  siteName?: string;
  status: PersonnelAssetStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type PersonnelAssetRepository = {
  create(row: PersonnelAssetRow): Promise<PersonnelAssetRow>;
  list(input: { scope: TenantScope }): Promise<PersonnelAssetRow[]>;
  update(row: PersonnelAssetRow): Promise<PersonnelAssetRow>;
};

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export function createPersonnelAssetService({
  auditLogRepository,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now: () => string;
  repository: PersonnelAssetRepository;
}) {
  async function resolve(scope: TenantScope) {
    const errors = validateTenantScope(scope);
    return errors.length > 0
      ? { errors, ok: false as const }
      : { ok: true as const, rows: await repository.list({ scope }) };
  }

  async function transition(
    scope: TenantScope,
    id: string,
    status: Exclude<PersonnelAssetStatus, "Zimmetli">,
  ): Promise<Result<PersonnelAssetRow>> {
    const permissionErrors = mutationErrors(scope);
    if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
    const resolved = await resolve(scope);
    if (!resolved.ok) return resolved;
    const existing = resolved.rows.find((row) => row.id === id);
    if (!existing) return { errors: ["Zimmet kaydı bulunamadı."], ok: false };
    if (existing.status === status) return { data: existing, ok: true };
    if (existing.status !== "Zimmetli") {
      return { errors: ["Yalnız aktif zimmet kaydının durumu değiştirilebilir."], ok: false };
    }
    const updated = await repository.update({
      ...existing,
      returnedAt: status === "İade Edildi" ? now().slice(0, 10) : existing.returnedAt,
      status,
      updatedAt: now(),
      updatedBy: scope.userId,
    });
    await recordAudit(auditLogRepository, scope, updated, status === "İade Edildi" ? "personnel-asset.return" : status === "Kayıp" ? "personnel-asset.lost" : "personnel-asset.unusable", existing.status);
    return { data: updated, ok: true };
  }

  return {
    async create({ scope, values }: { scope: TenantScope; values: PersonnelAssetCreateValues }): Promise<Result<PersonnelAssetRow>> {
      const permissionErrors = mutationErrors(scope);
      if (permissionErrors.length > 0) return { errors: permissionErrors, ok: false };
      const resolved = await resolve(scope);
      if (!resolved.ok) return resolved;
      const normalized = normalize(values);
      const errors = validatePersonnelAssetValues(normalized);
      const assetIdentity = `${normalized.assetCode}::${normalized.serialNo ?? ""}`;
      if (resolved.rows.some((row) => row.status === "Zimmetli" && `${row.assetCode}::${row.serialNo ?? ""}` === assetIdentity)) {
        errors.push(`Varlık zaten aktif olarak zimmetli: ${normalized.assetCode}${normalized.serialNo ? ` / ${normalized.serialNo}` : ""}`);
      }
      if (errors.length > 0) return { errors, ok: false };
      const timestamp = now();
      const row: PersonnelAssetRow = {
        ...normalized,
        companyId: scope.companyId,
        createdAt: timestamp,
        createdBy: scope.userId,
        id: createId(scope, normalized.assetCode, normalized.serialNo),
        periodId: scope.periodId,
        status: "Zimmetli",
        tenantId: scope.tenantId,
        updatedAt: timestamp,
        updatedBy: scope.userId,
      };
      const created = await repository.create(row);
      await recordAudit(auditLogRepository, scope, created, "personnel-asset.assign");
      return { data: created, ok: true };
    },
    async list({ scope }: { scope: TenantScope }) {
      const resolved = await resolve(scope);
      return resolved.ok ? { data: { rows: resolved.rows }, ok: true as const } : resolved;
    },
    async markLost({ id, scope }: { id: string; scope: TenantScope }) {
      return transition(scope, id, "Kayıp");
    },
    async markUnusable({ id, scope }: { id: string; scope: TenantScope }) {
      return transition(scope, id, "Kullanılamaz");
    },
    async returnAsset({ id, scope }: { id: string; scope: TenantScope }) {
      return transition(scope, id, "İade Edildi");
    },
  };
}

export function validatePersonnelAssetValues(values: ReturnType<typeof normalize>) {
  const errors: string[] = [];
  if (!values.personnelCode || !values.personnelName) errors.push("Personel zorunludur.");
  if (!values.assetCategory) errors.push("Varlık kategorisi zorunludur.");
  if (!values.assetCode) errors.push("Varlık kodu zorunludur.");
  if (!values.assetName) errors.push("Varlık adı zorunludur.");
  if (!values.assignedAt) errors.push("Zimmet tarihi zorunludur.");
  if (!Number.isFinite(values.quantity) || values.quantity <= 0) errors.push("Miktar 0'dan büyük olmalıdır.");
  if (values.dueAt && values.assignedAt && values.dueAt < values.assignedAt) errors.push("İade hedef tarihi zimmet tarihinden önce olamaz.");
  return errors;
}

export function canMutatePersonnelAssets(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededPersonnelAssetMemoryRepository(): PersonnelAssetRepository {
  const store = new Map<string, PersonnelAssetRow[]>();
  return {
    async create(row) {
      const key = keyFromRow(row);
      store.set(key, [...(store.get(key) ?? []), { ...row }]);
      return { ...row };
    },
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map((row) => ({ ...row }));
    },
    async update(row) {
      const key = keyFromRow(row);
      store.set(key, (store.get(key) ?? []).map((item) => item.id === row.id ? { ...row } : item));
      return { ...row };
    },
  };
}

function normalize(values: PersonnelAssetCreateValues) {
  return {
    assetCategory: values.assetCategory?.trim() ?? "",
    assetCode: values.assetCode?.trim() ?? "",
    assetName: values.assetName?.trim() ?? "",
    assignedAt: values.assignedAt?.trim() ?? "",
    dueAt: values.dueAt?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    personnelCode: values.personnelCode?.trim() ?? "",
    personnelName: values.personnelName?.trim() ?? "",
    quantity: Number(values.quantity),
    serialNo: values.serialNo?.trim() || undefined,
    siteCode: values.siteCode?.trim() || undefined,
    siteName: values.siteName?.trim() || undefined,
  };
}

async function recordAudit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  row: PersonnelAssetRow,
  action: "personnel-asset.assign" | "personnel-asset.lost" | "personnel-asset.return" | "personnel-asset.unusable",
  statusFrom?: PersonnelAssetStatus,
) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action,
    entityId: row.id,
    entityLabel: `${row.assetCode} - ${row.personnelName}`,
    entityType: "personnel-asset",
    metadata: { assetCode: row.assetCode, personnelCode: row.personnelCode, quantity: row.quantity, statusFrom, statusTo: row.status },
    occurredAt: row.updatedAt,
  }));
}

function mutationErrors(scope: TenantScope) {
  return canMutatePersonnelAssets(scope) ? [] : ["Zimmet işlemi için muhasebe veya yönetici yetkisi gereklidir."];
}

function createId(scope: TenantScope, assetCode: string, serialNo?: string) {
  const suffix = `${assetCode}-${serialNo ?? Date.now()}`.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${buildTenantScopeKey(scope)}::personnel-asset::${suffix}`;
}

function keyFromRow(row: PersonnelAssetRow) {
  return `${row.tenantId}::${row.companyId}::${row.periodId}`;
}
