import type { TenantScope, TenantUserRole } from "./tenant-scope";

export type SupplierCategoryStatus = "ACTIVE" | "INACTIVE";
export type SupplierCategorySource = "existing-record" | "managed";

export type SupplierCategorySnapshot = {
  companyId: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  lastMutationKey: string | null;
  name: string;
  normalizedName: string;
  revisionNo: number;
  status: SupplierCategoryStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type SupplierCategoryUsage = {
  name: string;
  normalizedName: string;
  usageCount: number;
};

export type EffectiveSupplierCategory = {
  canManage: boolean;
  description: string;
  id: string;
  name: string;
  normalizedName: string;
  revisionNo: number;
  source: SupplierCategorySource;
  status: SupplierCategoryStatus;
  updatedAt: string | null;
  updatedBy: string | null;
  usageCount: number;
};

export type SupplierCategorySaveValues = {
  description: string;
  expectedRevisionNo: number;
  id?: string;
  name: string;
  requestKey: string;
};

export type SupplierCategoryStatusValues = {
  expectedRevisionNo: number;
  id: string;
  requestKey: string;
  status: SupplierCategoryStatus;
};

export class SupplierCategoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierCategoryDomainError";
  }
}

export function normalizeSupplierCategoryName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export function validateSupplierCategoryValues(values: {
  description: string;
  name: string;
}) {
  const name = values.name.normalize("NFKC").trim().replace(/\s+/g, " ");
  const description = values.description.normalize("NFKC").trim().replace(/\s+/g, " ");
  const errors: string[] = [];
  if (name.length < 2 || name.length > 80) {
    errors.push("Kategori adı 2 ile 80 karakter arasında olmalıdır.");
  }
  if (name && !/[\p{L}\p{N}]/u.test(name)) {
    errors.push("Kategori adı en az bir harf veya rakam içermelidir.");
  }
  if (description.length > 240) {
    errors.push("Kategori açıklaması en fazla 240 karakter olabilir.");
  }
  if (errors.length > 0) throw new SupplierCategoryDomainError(errors.join(" "));
  return {
    description,
    name,
    normalizedName: normalizeSupplierCategoryName(name),
  };
}

export function getSupplierCategoryPermission(role: TenantUserRole) {
  if (role !== "admin") {
    return {
      allowed: false,
      reason: "Tedarikçi kategorilerini yalnız yönetici değiştirebilir.",
    } as const;
  }
  return { allowed: true, reason: "" } as const;
}

export function createSupplierCategoryMutationKey(
  scope: Pick<TenantScope, "companyId" | "tenantId" | "userId">,
  requestKey: string,
) {
  const normalized = requestKey.trim();
  if (!normalized || normalized.length > 120) {
    throw new SupplierCategoryDomainError("Geçerli bir işlem anahtarı zorunludur.");
  }
  return [scope.tenantId, scope.companyId, scope.userId, normalized].join("::");
}

export function buildEffectiveSupplierCategories(input: {
  managed: SupplierCategorySnapshot[];
  role: TenantUserRole;
  usage: SupplierCategoryUsage[];
}): EffectiveSupplierCategory[] {
  const canManage = getSupplierCategoryPermission(input.role).allowed;
  const usageByName = new Map(input.usage.map((row) => [row.normalizedName, row]));
  const effective = input.managed.map<EffectiveSupplierCategory>((row) => ({
    canManage,
    description: row.description,
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    revisionNo: row.revisionNo,
    source: "managed",
    status: row.status,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    usageCount: usageByName.get(row.normalizedName)?.usageCount ?? 0,
  }));
  const managedNames = new Set(input.managed.map((row) => row.normalizedName));
  for (const row of input.usage) {
    if (managedNames.has(row.normalizedName)) continue;
    effective.push({
      canManage: false,
      description: "",
      id: `existing:${encodeURIComponent(row.normalizedName)}`,
      name: row.name,
      normalizedName: row.normalizedName,
      revisionNo: 0,
      source: "existing-record",
      status: "ACTIVE",
      updatedAt: null,
      updatedBy: null,
      usageCount: row.usageCount,
    });
  }
  return effective.sort((left, right) => left.name.localeCompare(right.name, "tr-TR"));
}

export function validateSupplierCategoryAssignment(input: {
  categories: EffectiveSupplierCategory[];
  currentValue?: string;
  value: string;
}) {
  const value = input.value.trim();
  if (!value) return [];
  const normalized = normalizeSupplierCategoryName(value);
  const currentNormalized = normalizeSupplierCategoryName(input.currentValue ?? "");
  if (normalized === currentNormalized && currentNormalized) return [];
  const category = input.categories.find((row) => row.normalizedName === normalized);
  return category?.status === "ACTIVE"
    ? []
    : [`Tedarikçi kategorisi aktif sözlükte bulunamadı: ${value}`];
}
