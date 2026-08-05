import type { TenantScope, TenantUserRole } from "./tenant-scope";

export const accessProfilePermissionCodes = [
  "document.view",
  "document.file.create",
  "document.file.rename",
  "document.file.trash_restore",
  "document.folder.manage",
] as const;

export type AccessProfilePermissionCode =
  (typeof accessProfilePermissionCodes)[number];
export type AccessProfileStatus = "ACTIVE" | "INACTIVE";

export const accessProfilePermissionLabels: Record<
  AccessProfilePermissionCode,
  string
> = {
  "document.view": "Dokümanları görüntüleme ve indirme",
  "document.file.create": "Dosya yükleme",
  "document.file.rename": "Dosya yeniden adlandırma",
  "document.file.trash_restore": "Dosyayı çöpe taşıma ve geri yükleme",
  "document.folder.manage": "Klasör oluşturma, adlandırma ve silme",
};

export type AccessProfileSnapshot = {
  companyId: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  lastMutationKey: string;
  name: string;
  normalizedName: string;
  permissions: AccessProfilePermissionCode[];
  revisionNo: number;
  status: AccessProfileStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type AccessProfileAssignmentSnapshot = {
  companyId: string;
  createdAt: string;
  createdBy: string;
  id: string;
  lastMutationKey: string;
  periodId: string;
  profileId: string;
  revisionNo: number;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
  userId: string;
};

export type AccessProfileUserRow = {
  assignment: AccessProfileAssignmentSnapshot | null;
  email: string | null;
  name: string;
  userId: string;
};

export type AccessProfileOverview = {
  canManage: boolean;
  permissions: Array<{
    code: AccessProfilePermissionCode;
    label: string;
  }>;
  profiles: AccessProfileSnapshot[];
  users: AccessProfileUserRow[];
};

export type AccessProfileSaveValues = {
  description: string;
  expectedRevisionNo: number;
  id?: string;
  name: string;
  permissions: AccessProfilePermissionCode[];
  requestKey: string;
};

export type AccessProfileStatusValues = {
  expectedRevisionNo: number;
  id: string;
  requestKey: string;
  status: AccessProfileStatus;
};

export type AccessProfileAssignmentValues = {
  expectedRevisionNo: number;
  profileId: string | null;
  requestKey: string;
  userId: string;
};

export type EffectiveDocumentAccess = {
  assigned: boolean;
  permissions: AccessProfilePermissionCode[];
  profileId: string | null;
  profileStatus: AccessProfileStatus | null;
};

export class AccessProfileDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessProfileDomainError";
  }
}

export function normalizeAccessProfileName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export function validateAccessProfileValues(values: AccessProfileSaveValues) {
  const name = values.name.trim().replace(/\s+/g, " ");
  const description = values.description.trim();
  if (name.length < 2 || name.length > 80) {
    throw new AccessProfileDomainError(
      "Yetki profili adı 2 ile 80 karakter arasında olmalıdır.",
    );
  }
  if (description.length > 240) {
    throw new AccessProfileDomainError(
      "Yetki profili açıklaması en fazla 240 karakter olabilir.",
    );
  }
  if (!values.requestKey.trim()) {
    throw new AccessProfileDomainError("İşlem anahtarı zorunludur.");
  }
  const permissions = [...new Set(values.permissions)];
  if (
    permissions.some(
      (code) => !accessProfilePermissionCodes.includes(code),
    )
  ) {
    throw new AccessProfileDomainError("Geçersiz yetki kodu seçildi.");
  }
  return {
    description,
    name,
    normalizedName: normalizeAccessProfileName(name),
    permissions,
  };
}

export function getAccessProfileManagementPermission(role: TenantUserRole) {
  return role === "admin"
    ? { allowed: true as const, reason: "" }
    : {
        allowed: false as const,
        reason: "Özel yetki profillerini yalnızca admin yönetebilir.",
      };
}

export function createAccessProfileMutationKey(
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId" | "userId">,
  requestKey: string,
) {
  const normalized = requestKey.trim();
  if (!normalized) {
    throw new AccessProfileDomainError("İşlem anahtarı zorunludur.");
  }
  return [
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    scope.userId,
    normalized,
  ].join("::");
}

export function canUseDocumentPermission(
  role: TenantUserRole,
  access: EffectiveDocumentAccess | undefined,
  permission: AccessProfilePermissionCode,
) {
  if (role === "admin") return true;
  if (access?.assigned) {
    return (
      access.profileStatus === "ACTIVE" &&
      access.permissions.includes(permission)
    );
  }
  if (permission === "document.view") return true;
  return role === "accounting";
}

export function createLegacyDocumentAccess(): EffectiveDocumentAccess {
  return {
    assigned: false,
    permissions: [],
    profileId: null,
    profileStatus: null,
  };
}
