import type { TenantScope, TenantUserRole } from "./tenant-scope";

export type CustomerTypeStatus = "ACTIVE" | "INACTIVE";
export type CustomerTypeSource = "existing-record" | "managed";

export type CustomerTypeSnapshot = {
  companyId: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  lastMutationKey: string | null;
  name: string;
  normalizedName: string;
  revisionNo: number;
  status: CustomerTypeStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type CustomerTypeUsage = {
  name: string;
  normalizedName: string;
  usageCount: number;
};

export type EffectiveCustomerType = {
  canManage: boolean;
  description: string;
  id: string;
  name: string;
  normalizedName: string;
  revisionNo: number;
  source: CustomerTypeSource;
  status: CustomerTypeStatus;
  updatedAt: string | null;
  updatedBy: string | null;
  usageCount: number;
};

export type CustomerTypeSaveValues = {
  description: string;
  expectedRevisionNo: number;
  id?: string;
  name: string;
  requestKey: string;
};

export type CustomerTypeStatusValues = {
  expectedRevisionNo: number;
  id: string;
  requestKey: string;
  status: CustomerTypeStatus;
};

export class CustomerTypeDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerTypeDomainError";
  }
}

export function normalizeCustomerTypeName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export function validateCustomerTypeValues(values: {
  description: string;
  name: string;
}) {
  const name = values.name.normalize("NFKC").trim().replace(/\s+/g, " ");
  const description = values.description.normalize("NFKC").trim().replace(/\s+/g, " ");
  const errors: string[] = [];
  if (name.length < 2 || name.length > 80) {
    errors.push("Müşteri tipi adı 2 ile 80 karakter arasında olmalıdır.");
  }
  if (name && !/[\p{L}\p{N}]/u.test(name)) {
    errors.push("Müşteri tipi adı en az bir harf veya rakam içermelidir.");
  }
  if (description.length > 240) {
    errors.push("Müşteri tipi açıklaması en fazla 240 karakter olabilir.");
  }
  if (errors.length > 0) throw new CustomerTypeDomainError(errors.join(" "));
  return { description, name, normalizedName: normalizeCustomerTypeName(name) };
}

export function getCustomerTypePermission(role: TenantUserRole) {
  if (role !== "admin") {
    return {
      allowed: false,
      reason: "Müşteri tiplerini yalnız yönetici değiştirebilir.",
    } as const;
  }
  return { allowed: true, reason: "" } as const;
}

export function createCustomerTypeMutationKey(
  scope: Pick<TenantScope, "companyId" | "tenantId" | "userId">,
  requestKey: string,
) {
  const normalized = requestKey.trim();
  if (!normalized || normalized.length > 120) {
    throw new CustomerTypeDomainError("Geçerli bir işlem anahtarı zorunludur.");
  }
  return [scope.tenantId, scope.companyId, scope.userId, normalized].join("::");
}

export function buildEffectiveCustomerTypes(input: {
  managed: CustomerTypeSnapshot[];
  role: TenantUserRole;
  usage: CustomerTypeUsage[];
}): EffectiveCustomerType[] {
  const canManage = getCustomerTypePermission(input.role).allowed;
  const usageByName = new Map(input.usage.map((row) => [row.normalizedName, row]));
  const effective = input.managed.map<EffectiveCustomerType>((row) => ({
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

export function validateCustomerTypeAssignment(input: {
  customerTypes: EffectiveCustomerType[];
  currentValue?: string;
  value: string;
}) {
  const value = input.value.trim();
  if (!value) return [];
  const normalized = normalizeCustomerTypeName(value);
  const currentNormalized = normalizeCustomerTypeName(input.currentValue ?? "");
  if (normalized === currentNormalized && currentNormalized) return [];
  const customerType = input.customerTypes.find(
    (row) => row.normalizedName === normalized,
  );
  return customerType?.status === "ACTIVE"
    ? []
    : [`Müşteri tipi aktif sözlükte bulunamadı: ${value}`];
}
