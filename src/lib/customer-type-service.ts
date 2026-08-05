import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  buildEffectiveCustomerTypes,
  createCustomerTypeMutationKey,
  CustomerTypeDomainError,
  getCustomerTypePermission,
  validateCustomerTypeValues,
  type CustomerTypeSaveValues,
  type CustomerTypeSnapshot,
  type CustomerTypeStatusValues,
  type CustomerTypeUsage,
  type EffectiveCustomerType,
} from "./customer-type";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type CustomerTypeResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type CustomerTypeRepository = {
  create(row: CustomerTypeSnapshot): Promise<CustomerTypeSnapshot>;
  findById(scope: Pick<TenantScope, "companyId" | "tenantId">, id: string): Promise<CustomerTypeSnapshot | null>;
  findByNormalizedName(scope: Pick<TenantScope, "companyId" | "tenantId">, normalizedName: string): Promise<CustomerTypeSnapshot | null>;
  listManaged(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<CustomerTypeSnapshot[]>;
  listUsage(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<CustomerTypeUsage[]>;
  update(input: { expectedRevisionNo: number; row: CustomerTypeSnapshot }): Promise<CustomerTypeSnapshot>;
};

export class CustomerTypeRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerTypeRepositoryError";
  }
}

export function createCustomerTypeService({
  auditLogRepository,
  createId = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: () => string;
  now?: () => string;
  repository: CustomerTypeRepository;
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
        customerTypes: buildEffectiveCustomerTypes({
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
    values: CustomerTypeSaveValues;
  }): Promise<CustomerTypeResult<{
    customerType: EffectiveCustomerType;
    idempotent: boolean;
  }>> {
    const scopeErrors = validateTenantScope(input.scope);
    if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
    const permission = getCustomerTypePermission(input.scope.userRole);
    if (!permission.allowed) return { errors: [permission.reason], ok: false };
    try {
      const values = validateCustomerTypeValues(input.values);
      const mutationKey = createCustomerTypeMutationKey(
        input.scope,
        input.values.requestKey,
      );
      const existing = input.values.id
        ? await repository.findById(input.scope, input.values.id)
        : null;
      const duplicate = await repository.findByNormalizedName(
        input.scope,
        values.normalizedName,
      );
      if (input.values.id && !existing) {
        return { errors: ["Müşteri tipi bulunamadı."], ok: false };
      }
      if (existing?.lastMutationKey === mutationKey) {
        return {
          data: {
            customerType: toManagedEffective(existing, input.scope.userRole),
            idempotent: true,
          },
          ok: true,
        };
      }
      if (!existing && duplicate?.lastMutationKey === mutationKey) {
        return {
          data: {
            customerType: toManagedEffective(duplicate, input.scope.userRole),
            idempotent: true,
          },
          ok: true,
        };
      }
      const currentRevision = existing?.revisionNo ?? 0;
      if (
        !Number.isInteger(input.values.expectedRevisionNo) ||
        input.values.expectedRevisionNo !== currentRevision
      ) {
        return {
          errors: ["Müşteri tipi başka bir işlemle güncellendi; listeyi yenileyin."],
          ok: false,
        };
      }
      if (duplicate && duplicate.id !== existing?.id) {
        return { errors: ["Aynı adlı müşteri tipi zaten bulunuyor."], ok: false };
      }
      const timestamp = now();
      const next: CustomerTypeSnapshot = {
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
        action: existing ? "customer-type.update" : "customer-type.create",
        currentRevision,
        next: saved,
        occurredAt: timestamp,
        statusFrom: existing?.status ?? null,
      });
      return {
        data: {
          customerType: toManagedEffective(saved, input.scope.userRole),
          idempotent: false,
        },
        ok: true,
      };
    } catch (error) {
      if (
        error instanceof CustomerTypeDomainError ||
        error instanceof CustomerTypeRepositoryError
      ) {
        return { errors: [error.message], ok: false };
      }
      return { errors: ["Müşteri tipi kaydedilemedi."], ok: false };
    }
  }

  async function changeStatus(input: {
    scope: TenantScope;
    values: CustomerTypeStatusValues;
  }): Promise<CustomerTypeResult<{
    customerType: EffectiveCustomerType;
    idempotent: boolean;
  }>> {
    const scopeErrors = validateTenantScope(input.scope);
    if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
    const permission = getCustomerTypePermission(input.scope.userRole);
    if (!permission.allowed) return { errors: [permission.reason], ok: false };
    try {
      const mutationKey = createCustomerTypeMutationKey(
        input.scope,
        input.values.requestKey,
      );
      const existing = await repository.findById(input.scope, input.values.id);
      if (!existing) return { errors: ["Müşteri tipi bulunamadı."], ok: false };
      if (existing.lastMutationKey === mutationKey) {
        return {
          data: {
            customerType: toManagedEffective(existing, input.scope.userRole),
            idempotent: true,
          },
          ok: true,
        };
      }
      if (existing.revisionNo !== input.values.expectedRevisionNo) {
        return {
          errors: ["Müşteri tipi başka bir işlemle güncellendi; listeyi yenileyin."],
          ok: false,
        };
      }
      if (existing.status === input.values.status) {
        return { errors: ["Müşteri tipi zaten seçilen durumda."], ok: false };
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
        action: "customer-type.status-change",
        currentRevision: existing.revisionNo,
        next: saved,
        occurredAt: timestamp,
        statusFrom: existing.status,
      });
      return {
        data: {
          customerType: toManagedEffective(saved, input.scope.userRole),
          idempotent: false,
        },
        ok: true,
      };
    } catch (error) {
      if (
        error instanceof CustomerTypeDomainError ||
        error instanceof CustomerTypeRepositoryError
      ) {
        return { errors: [error.message], ok: false };
      }
      return { errors: ["Müşteri tipi durumu değiştirilemedi."], ok: false };
    }
  }

  return {
    changeStatus,
    list: ({ scope }: { scope: TenantScope }) => list(scope),
    save,
  };
}

function toManagedEffective(
  row: CustomerTypeSnapshot,
  role: TenantScope["userRole"],
): EffectiveCustomerType {
  return buildEffectiveCustomerTypes({ managed: [row], role, usage: [] })[0]!;
}

async function recordAudit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  input: {
    action: "customer-type.create" | "customer-type.status-change" | "customer-type.update";
    currentRevision: number;
    next: CustomerTypeSnapshot;
    occurredAt: string;
    statusFrom: CustomerTypeSnapshot["status"] | null;
  },
) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action: input.action,
    entityId: input.next.id,
    entityLabel: "Müşteri Tipi",
    entityType: "customer-type",
    metadata: {
      revisionFrom: input.currentRevision,
      revisionTo: input.next.revisionNo,
      statusFrom: input.statusFrom,
      statusTo: input.next.status,
    },
    occurredAt: input.occurredAt,
  }));
}

export function createCustomerTypeMemoryRepository(
  initial: CustomerTypeSnapshot[] = [],
  usage: CustomerTypeUsage[] = [],
): CustomerTypeRepository {
  const rows = initial.map((row) => ({ ...row }));
  return {
    async create(row) {
      if (
        rows.some(
          (item) =>
            item.id === row.id || item.normalizedName === row.normalizedName,
        )
      ) {
        throw new CustomerTypeRepositoryError("Müşteri tipi zaten bulunuyor.");
      }
      rows.push({ ...row });
      return { ...row };
    },
    async findById(scope, id) {
      return rows.find((row) => inScope(row, scope) && row.id === id) ?? null;
    },
    async findByNormalizedName(scope, normalizedName) {
      return rows.find(
        (row) => inScope(row, scope) && row.normalizedName === normalizedName,
      ) ?? null;
    },
    async listManaged(scope) {
      return rows.filter((row) => inScope(row, scope)).map((row) => ({ ...row }));
    },
    async listUsage() {
      return usage.map((row) => ({ ...row }));
    },
    async update({ expectedRevisionNo, row }) {
      const index = rows.findIndex(
        (item) => item.id === row.id && inScope(item, row),
      );
      if (index < 0 || rows[index]?.revisionNo !== expectedRevisionNo) {
        throw new CustomerTypeRepositoryError(
          "Müşteri tipi beklenen revizyonda bulunamadı.",
        );
      }
      rows[index] = { ...row };
      return { ...row };
    },
  };
}

function inScope(
  row: Pick<CustomerTypeSnapshot, "companyId" | "tenantId">,
  scope: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return row.tenantId === scope.tenantId && row.companyId === scope.companyId;
}
