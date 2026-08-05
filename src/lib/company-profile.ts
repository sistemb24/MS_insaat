import type { TenantScope, TenantUserRole } from "./tenant-scope";

export type CompanyProfileValues = {
  addressLine: string;
  city: string;
  district: string;
  email: string;
  legalName: string;
  mersisNumber: string;
  phone: string;
  postalCode: string;
  taxNumber: string;
  taxOffice: string;
};

export type CompanyProfileSnapshot = CompanyProfileValues & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  id: string;
  lastMutationKey: string | null;
  revisionNo: number;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type EffectiveCompanyProfile = CompanyProfileValues & {
  canManage: boolean;
  revisionNo: number;
  source: "fallback" | "persisted";
  updatedAt: string | null;
  updatedBy: string | null;
};

export type CompanyProfileSaveInput = CompanyProfileValues & {
  expectedRevisionNo: number;
  requestKey: string;
};

export class CompanyProfileDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyProfileDomainError";
  }
}

export function createCompanyProfileFallback(
  companyName: string,
): CompanyProfileValues {
  return {
    addressLine: "",
    city: "",
    district: "",
    email: "",
    legalName: companyName.trim(),
    mersisNumber: "",
    phone: "",
    postalCode: "",
    taxNumber: "",
    taxOffice: "",
  };
}

export function normalizeCompanyProfileValues(
  values: CompanyProfileValues,
): CompanyProfileValues {
  const normalized = {
    addressLine: normalizeText(values.addressLine, "Adres", 300),
    city: normalizeText(values.city, "İl", 100),
    district: normalizeText(values.district, "İlçe", 100),
    email: normalizeText(values.email, "E-posta", 254).toLowerCase(),
    legalName: normalizeText(values.legalName, "Hukuki unvan", 200, true),
    mersisNumber: normalizeText(values.mersisNumber, "MERSİS numarası", 16),
    phone: normalizeText(values.phone, "Telefon", 30),
    postalCode: normalizeText(values.postalCode, "Posta kodu", 10),
    taxNumber: normalizeText(values.taxNumber, "Vergi numarası", 11),
    taxOffice: normalizeText(values.taxOffice, "Vergi dairesi", 100),
  };

  if (normalized.legalName.length < 2) {
    throw new CompanyProfileDomainError(
      "Hukuki unvan en az 2 karakter olmalıdır.",
    );
  }
  if (
    normalized.taxNumber &&
    !/^(?:\d{10}|\d{11})$/.test(normalized.taxNumber)
  ) {
    throw new CompanyProfileDomainError(
      "Vergi numarası 10 veya 11 rakam olmalıdır.",
    );
  }
  if (normalized.mersisNumber && !/^\d{16}$/.test(normalized.mersisNumber)) {
    throw new CompanyProfileDomainError(
      "MERSİS numarası 16 rakam olmalıdır.",
    );
  }
  if (
    normalized.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    throw new CompanyProfileDomainError("Geçerli bir e-posta adresi girin.");
  }
  if (
    normalized.phone &&
    !/^[0-9+().\s-]+$/.test(normalized.phone)
  ) {
    throw new CompanyProfileDomainError(
      "Telefon yalnız rakam ve + ( ) . - karakterlerini içerebilir.",
    );
  }

  return normalized;
}

export function normalizeCompanyProfileRequestKey(value: unknown) {
  const requestKey = String(value ?? "").trim();
  if (!requestKey) {
    throw new CompanyProfileDomainError("İşlem anahtarı zorunludur.");
  }
  if (requestKey.length > 120) {
    throw new CompanyProfileDomainError(
      "İşlem anahtarı en fazla 120 karakter olabilir.",
    );
  }
  return requestKey;
}

export function getCompanyProfilePermission(role: TenantUserRole) {
  if (role !== "admin") {
    return {
      allowed: false,
      reason: "Firma profilini yalnız yönetici değiştirebilir.",
    } as const;
  }
  return { allowed: true, reason: "" } as const;
}

export function buildEffectiveCompanyProfile(
  row: CompanyProfileSnapshot | null,
  scope: TenantScope,
): EffectiveCompanyProfile {
  const canManage = getCompanyProfilePermission(scope.userRole).allowed;
  if (!row) {
    return {
      ...createCompanyProfileFallback(scope.companyName),
      canManage,
      revisionNo: 0,
      source: "fallback",
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    addressLine: row.addressLine,
    canManage,
    city: row.city,
    district: row.district,
    email: row.email,
    legalName: row.legalName,
    mersisNumber: row.mersisNumber,
    phone: row.phone,
    postalCode: row.postalCode,
    revisionNo: row.revisionNo,
    source: "persisted",
    taxNumber: row.taxNumber,
    taxOffice: row.taxOffice,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function createCompanyProfileId(
  scope: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return `${scope.tenantId}::${scope.companyId}::company-profile`;
}

export function createCompanyProfileMutationKey(
  scope: Pick<TenantScope, "companyId" | "tenantId" | "userId">,
  requestKey: string,
) {
  return [
    scope.tenantId,
    scope.companyId,
    scope.userId,
    normalizeCompanyProfileRequestKey(requestKey),
  ].join("::");
}

function normalizeText(
  value: unknown,
  label: string,
  maxLength: number,
  required = false,
) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (required && !normalized) {
    throw new CompanyProfileDomainError(`${label} zorunludur.`);
  }
  if (normalized.length > maxLength) {
    throw new CompanyProfileDomainError(
      `${label} en fazla ${maxLength} karakter olabilir.`,
    );
  }
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) {
    throw new CompanyProfileDomainError(`${label} güvenli olmayan karakter içeriyor.`);
  }
  return normalized;
}
