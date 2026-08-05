import type { TenantScope, TenantUserRole } from "./tenant-scope";

export const companyLocationTypes = [
  "HEADQUARTERS",
  "BRANCH",
  "OFFICE",
] as const;

export type CompanyLocationType = (typeof companyLocationTypes)[number];
export type CompanyLocationStatus = "ACTIVE" | "INACTIVE";

export type CompanyLocationValues = {
  addressLine: string;
  city: string;
  code: string;
  district: string;
  email: string;
  name: string;
  phone: string;
  postalCode: string;
  responsiblePerson: string;
  status: CompanyLocationStatus;
  type: CompanyLocationType;
};

export type CompanyLocationSnapshot = CompanyLocationValues & {
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

export type CompanyLocationSiteSnapshot = {
  code: string;
  name: string;
  responsiblePerson: string;
  status: CompanyLocationStatus;
  updatedAt: string;
};

export type EffectiveCompanyLocationType =
  | CompanyLocationType
  | "SITE";

export type CompanyLocationDirectoryRow = Omit<CompanyLocationValues, "type"> & {
  canManage: boolean;
  href: string | null;
  id: string;
  revisionNo: number;
  source: "company-location" | "site-record";
  type: EffectiveCompanyLocationType;
  updatedAt: string;
};

export type CompanyLocationSaveInput = CompanyLocationValues & {
  expectedRevisionNo: number;
  id?: string;
  requestKey: string;
};

export class CompanyLocationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyLocationDomainError";
  }
}

export function normalizeCompanyLocationValues(
  values: CompanyLocationValues,
): CompanyLocationValues {
  const code = normalizeText(values.code, "Lokasyon kodu", 30, true)
    .toUpperCase();
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)) {
    throw new CompanyLocationDomainError(
      "Lokasyon kodu yalnız büyük harf, rakam ve tek tire içerebilir.",
    );
  }
  if (code.length < 2) {
    throw new CompanyLocationDomainError(
      "Lokasyon kodu en az 2 karakter olmalıdır.",
    );
  }

  const name = normalizeText(values.name, "Lokasyon adı", 160, true);
  if (name.length < 2) {
    throw new CompanyLocationDomainError(
      "Lokasyon adı en az 2 karakter olmalıdır.",
    );
  }
  if (!companyLocationTypes.includes(values.type)) {
    throw new CompanyLocationDomainError("Geçerli bir lokasyon tipi seçin.");
  }
  if (!["ACTIVE", "INACTIVE"].includes(values.status)) {
    throw new CompanyLocationDomainError("Geçerli bir lokasyon durumu seçin.");
  }

  const email = normalizeText(values.email, "E-posta", 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CompanyLocationDomainError("Geçerli bir e-posta adresi girin.");
  }
  const phone = normalizeText(values.phone, "Telefon", 30);
  if (phone && !/^[0-9+().\s-]+$/.test(phone)) {
    throw new CompanyLocationDomainError(
      "Telefon yalnız rakam ve + ( ) . - karakterlerini içerebilir.",
    );
  }

  return {
    addressLine: normalizeText(values.addressLine, "Adres", 300),
    city: normalizeText(values.city, "İl", 100),
    code,
    district: normalizeText(values.district, "İlçe", 100),
    email,
    name,
    phone,
    postalCode: normalizeText(values.postalCode, "Posta kodu", 10),
    responsiblePerson: normalizeText(
      values.responsiblePerson,
      "Sorumlu kişi",
      160,
    ),
    status: values.status,
    type: values.type,
  };
}

export function normalizeCompanyLocationRequestKey(value: unknown) {
  const requestKey = String(value ?? "").trim();
  if (!requestKey) {
    throw new CompanyLocationDomainError("İşlem anahtarı zorunludur.");
  }
  if (requestKey.length > 120) {
    throw new CompanyLocationDomainError(
      "İşlem anahtarı en fazla 120 karakter olabilir.",
    );
  }
  return requestKey;
}

export function getCompanyLocationPermission(role: TenantUserRole) {
  if (role !== "admin") {
    return {
      allowed: false,
      reason: "Şirket lokasyonlarını yalnız yönetici değiştirebilir.",
    } as const;
  }
  return { allowed: true, reason: "" } as const;
}

export function createCompanyLocationId(
  scope: Pick<TenantScope, "companyId" | "tenantId">,
  code: string,
) {
  return `${scope.tenantId}::${scope.companyId}::location::${code}`;
}

export function createCompanyLocationMutationKey(
  scope: Pick<TenantScope, "companyId" | "tenantId" | "userId">,
  requestKey: string,
) {
  return [
    scope.tenantId,
    scope.companyId,
    scope.userId,
    normalizeCompanyLocationRequestKey(requestKey),
  ].join("::");
}

export function buildCompanyLocationDirectory({
  locations,
  scope,
  sites,
}: {
  locations: CompanyLocationSnapshot[];
  scope: TenantScope;
  sites: CompanyLocationSiteSnapshot[];
}): CompanyLocationDirectoryRow[] {
  const canManage = getCompanyLocationPermission(scope.userRole).allowed;
  return [
    ...locations.map((row) => ({
      addressLine: row.addressLine,
      canManage,
      city: row.city,
      code: row.code,
      district: row.district,
      email: row.email,
      href: null,
      id: row.id,
      name: row.name,
      phone: row.phone,
      postalCode: row.postalCode,
      responsiblePerson: row.responsiblePerson,
      revisionNo: row.revisionNo,
      source: "company-location" as const,
      status: row.status,
      type: row.type,
      updatedAt: row.updatedAt,
    })),
    ...sites.map((site) => ({
      addressLine: "",
      canManage: false,
      city: "",
      code: site.code,
      district: "",
      email: "",
      href: "/santiyeler",
      id: `site::${site.code}`,
      name: site.name,
      phone: "",
      postalCode: "",
      responsiblePerson: site.responsiblePerson,
      revisionNo: 0,
      source: "site-record" as const,
      status: site.status,
      type: "SITE" as const,
      updatedAt: site.updatedAt,
    })),
  ].sort((left, right) => left.code.localeCompare(right.code, "tr"));
}

function normalizeText(
  value: unknown,
  label: string,
  maxLength: number,
  required = false,
) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (required && !normalized) {
    throw new CompanyLocationDomainError(`${label} zorunludur.`);
  }
  if (normalized.length > maxLength) {
    throw new CompanyLocationDomainError(
      `${label} en fazla ${maxLength} karakter olabilir.`,
    );
  }
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) {
    throw new CompanyLocationDomainError(
      `${label} güvenli olmayan karakter içeriyor.`,
    );
  }
  return normalized;
}
