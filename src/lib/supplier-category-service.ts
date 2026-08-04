import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  buildEffectiveSupplierCategories,
  createSupplierCategoryMutationKey,
  getSupplierCategoryPermission,
  SupplierCategoryDomainError,
  validateSupplierCategoryValues,
  type EffectiveSupplierCategory,
  type SupplierCategorySaveValues,
  type SupplierCategorySnapshot,
  type SupplierCategoryStatusValues,
  type SupplierCategoryUsage,
} from "./supplier-category";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type SupplierCategoryResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type SupplierCategoryRepository = {
  create(row: SupplierCategorySnapshot): Promise<SupplierCategorySnapshot>;
  findById(scope: Pick<TenantScope, "companyId" | "tenantId">, id: string): Promise<SupplierCategorySnapshot | null>;
  findByNormalizedName(scope: Pick<TenantScope, "companyId" | "tenantId">, normalizedName: string): Promise<SupplierCategorySnapshot | null>;
  listManaged(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<SupplierCategorySnapshot[]>;
  listUsage(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<SupplierCategoryUsage[]>;
  update(input: { expectedRevisionNo: number; row: SupplierCategorySnapshot }): Promise<SupplierCategorySnapshot>;
};

export class SupplierCategoryRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierCategoryRepositoryError";
  }
}

export function createSupplierCategoryService({
  auditLogRepository,
  createId = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: () => string;
  now?: () => string;
  repository: SupplierCategoryRepository;
}) {
  async function list(scope: TenantScope) {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false } as const;
    const [managed, usage] = await Promise.all([
      repository.listManaged(scope),
      repository.listUsage(scope),
    ]);
    return {
      data: {
        categories: buildEffectiveSupplierCategories({
          managed,
          role: scope.userRole,
          usage,
        }),
      },
      ok: true,
    } as const;
  }

  async function save(input: {
    scope: TenantScope;
    values: SupplierCategorySaveValues;
  }): Promise<SupplierCategoryResult<{ category: EffectiveSupplierCategory; idempotent: boolean }>> {
    const scopeErrors = validateTenantScope(input.scope);
    if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
    const permission = getSupplierCategoryPermission(input.scope.userRole);
    if (!permission.allowed) return { errors: [permission.reason], ok: false };
    try {
      const values = validateSupplierCategoryValues(input.values);
      const mutationKey = createSupplierCategoryMutationKey(input.scope, input.values.requestKey);
      const existing = input.values.id
        ? await repository.findById(input.scope, input.values.id)
        : null;
      const duplicate = await repository.findByNormalizedName(input.scope, values.normalizedName);
      if (input.values.id && !existing) {
        return { errors: ["Tedarikçi kategorisi bulunamadı."], ok: false };
      }
      if (existing?.lastMutationKey === mutationKey) {
        return { data: { category: toManagedEffective(existing, input.scope.userRole, 0), idempotent: true }, ok: true };
      }
      if (!existing && duplicate?.lastMutationKey === mutationKey) {
        return { data: { category: toManagedEffective(duplicate, input.scope.userRole, 0), idempotent: true }, ok: true };
      }
      const currentRevision = existing?.revisionNo ?? 0;
      if (!Number.isInteger(input.values.expectedRevisionNo) || input.values.expectedRevisionNo !== currentRevision) {
        return { errors: ["Tedarikçi kategorisi başka bir işlemle güncellendi; listeyi yenileyin."], ok: false };
      }
      if (duplicate && duplicate.id !== existing?.id) {
        return { errors: ["Aynı adlı tedarikçi kategorisi zaten bulunuyor."], ok: false };
      }
      const timestamp = now();
      const next: SupplierCategorySnapshot = {
        companyId: input.scope.companyId,
        createdAt: existing?.createdAt ?? timestamp,
        createdBy: existing?.createdBy ?? input.scope.userId,
        description: values.description,
        id: existing?.id ?? createId(),
        lastMutationKey: mutationKey,
        name: values.name,
        normalizedName: values.normalizedName,
        revisionNo: currentRevision + 1,
        status: existing?.status ?? "ACTIVE",
        tenantId: input.scope.tenantId,
        updatedAt: timestamp,
        updatedBy: input.scope.userId,
      };
      const saved = existing
        ? await repository.update({ expectedRevisionNo: currentRevision, row: next })
        : await repository.create(next);
      await recordAudit(auditLogRepository, input.scope, {
        action: existing ? "supplier-category.update" : "supplier-category.create",
        currentRevision,
        next: saved,
        occurredAt: timestamp,
        statusFrom: existing?.status ?? null,
      });
      return {
        data: { category: toManagedEffective(saved, input.scope.userRole, 0), idempotent: false },
        ok: true,
      };
    } catch (error) {
      if (error instanceof SupplierCategoryDomainError || error instanceof SupplierCategoryRepositoryError) {
        return { errors: [error.message], ok: false };
      }
      return { errors: ["Tedarikçi kategorisi kaydedilemedi."], ok: false };
    }
  }

  async function changeStatus(input: {
    scope: TenantScope;
    values: SupplierCategoryStatusValues;
  }): Promise<SupplierCategoryResult<{ category: EffectiveSupplierCategory; idempotent: boolean }>> {
    const scopeErrors = validateTenantScope(input.scope);
    if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
    const permission = getSupplierCategoryPermission(input.scope.userRole);
    if (!permission.allowed) return { errors: [permission.reason], ok: false };
    try {
      const mutationKey = createSupplierCategoryMutationKey(input.scope, input.values.requestKey);
      const existing = await repository.findById(input.scope, input.values.id);
      if (!existing) return { errors: ["Tedarikçi kategorisi bulunamadı."], ok: false };
      if (existing.lastMutationKey === mutationKey) {
        return { data: { category: toManagedEffective(existing, input.scope.userRole, 0), idempotent: true }, ok: true };
      }
      if (existing.revisionNo !== input.values.expectedRevisionNo) {
        return { errors: ["Tedarikçi kategorisi başka bir işlemle güncellendi; listeyi yenileyin."], ok: false };
      }
      if (existing.status === input.values.status) {
        return { errors: ["Tedarikçi kategorisi zaten seçilen durumda."], ok: false };
      }
      const timestamp = now();
      const saved = await repository.update({
        expectedRevisionNo: existing.revisionNo,
        row: {
          ...existing,
          lastMutationKey: mutationKey,
          revisionNo: existing.revisionNo + 1,
          status: input.values.status,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        },
      });
      await recordAudit(auditLogRepository, input.scope, {
        action: "supplier-category.status-change",
        currentRevision: existing.revisionNo,
        next: saved,
        occurredAt: timestamp,
        statusFrom: existing.status,
      });
      return {
        data: { category: toManagedEffective(saved, input.scope.userRole, 0), idempotent: false },
        ok: true,
      };
    } catch (error) {
      if (error instanceof SupplierCategoryDomainError || error instanceof SupplierCategoryRepositoryError) {
        return { errors: [error.message], ok: false };
      }
      return { errors: ["Tedarikçi kategori durumu değiştirilemedi."], ok: false };
    }
  }

  return { changeStatus, list: ({ scope }: { scope: TenantScope }) => list(scope), save };
}

function toManagedEffective(
  row: SupplierCategorySnapshot,
  role: TenantScope["userRole"],
  usageCount: number,
): EffectiveSupplierCategory {
  return buildEffectiveSupplierCategories({ managed: [row], role, usage: [] })
    .map((category) => ({ ...category, usageCount }))[0]!;
}

async function recordAudit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  input: {
    action: "supplier-category.create" | "supplier-category.status-change" | "supplier-category.update";
    currentRevision: number;
    next: SupplierCategorySnapshot;
    occurredAt: string;
    statusFrom: SupplierCategorySnapshot["status"] | null;
  },
) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action: input.action,
    entityId: input.next.id,
    entityLabel: "Tedarikçi Kategorisi",
    entityType: "supplier-category",
    metadata: {
      revisionFrom: input.currentRevision,
      revisionTo: input.next.revisionNo,
      statusFrom: input.statusFrom,
      statusTo: input.next.status,
    },
    occurredAt: input.occurredAt,
  }));
}

export function createSupplierCategoryMemoryRepository(
  initial: SupplierCategorySnapshot[] = [],
  usage: SupplierCategoryUsage[] = [],
): SupplierCategoryRepository {
  const rows = initial.map((row) => ({ ...row }));
  return {
    async create(row) {
      if (rows.some((item) => item.id === row.id || item.normalizedName === row.normalizedName)) {
        throw new SupplierCategoryRepositoryError("Tedarikçi kategorisi zaten bulunuyor.");
      }
      rows.push({ ...row });
      return { ...row };
    },
    async findById(scope, id) {
      return rows.find((row) => inScope(row, scope) && row.id === id) ?? null;
    },
    async findByNormalizedName(scope, normalizedName) {
      return rows.find((row) => inScope(row, scope) && row.normalizedName === normalizedName) ?? null;
    },
    async listManaged(scope) {
      return rows.filter((row) => inScope(row, scope)).map((row) => ({ ...row }));
    },
    async listUsage() {
      return usage.map((row) => ({ ...row }));
    },
    async update({ expectedRevisionNo, row }) {
      const index = rows.findIndex((item) => item.id === row.id && inScope(item, row));
      if (index < 0 || rows[index]?.revisionNo !== expectedRevisionNo) {
        throw new SupplierCategoryRepositoryError("Tedarikçi kategorisi beklenen revizyonda bulunamadı.");
      }
      rows[index] = { ...row };
      return { ...row };
    },
  };
}

function inScope(
  row: Pick<SupplierCategorySnapshot, "companyId" | "tenantId">,
  scope: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return row.tenantId === scope.tenantId && row.companyId === scope.companyId;
}
