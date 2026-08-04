import type { TenantScope, TenantUserRole } from "./tenant-scope";

export const FINANCE_SETTINGS_FALLBACK = {
  defaultVatRate: 20,
  showVatBreakdown: true,
} as const;

export type FinanceSettingsValues = {
  defaultVatRate: number;
  showVatBreakdown: boolean;
};

export type FinanceSettingsSnapshot = FinanceSettingsValues & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  id: string;
  lastMutationKey: string | null;
  periodId: string;
  revisionNo: number;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type EffectiveFinanceSettings = FinanceSettingsValues & {
  canManage: boolean;
  revisionNo: number;
  source: "fallback" | "persisted";
  updatedAt: string | null;
  updatedBy: string | null;
};

export type FinanceSettingsSaveInput = FinanceSettingsValues & {
  expectedRevisionNo: number;
  requestKey: string;
};

export class FinanceSettingsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceSettingsDomainError";
  }
}

export function normalizeFinanceSettingsValues(
  values: FinanceSettingsValues,
): FinanceSettingsValues {
  const defaultVatRate = Number(values.defaultVatRate);

  if (!Number.isFinite(defaultVatRate)) {
    throw new FinanceSettingsDomainError("Varsayılan KDV oranı sayısal olmalıdır.");
  }

  if (defaultVatRate < 0 || defaultVatRate > 100) {
    throw new FinanceSettingsDomainError(
      "Varsayılan KDV oranı 0 ile 100 arasında olmalıdır.",
    );
  }

  if (Math.round(defaultVatRate * 100) !== defaultVatRate * 100) {
    throw new FinanceSettingsDomainError(
      "Varsayılan KDV oranı en fazla 2 ondalık basamak içerebilir.",
    );
  }

  return {
    defaultVatRate,
    showVatBreakdown: Boolean(values.showVatBreakdown),
  };
}

export function normalizeFinanceSettingsRequestKey(value: unknown) {
  const requestKey = String(value ?? "").trim();

  if (!requestKey) {
    throw new FinanceSettingsDomainError("İşlem anahtarı zorunludur.");
  }

  if (requestKey.length > 120) {
    throw new FinanceSettingsDomainError("İşlem anahtarı en fazla 120 karakter olabilir.");
  }

  return requestKey;
}

export function getFinanceSettingsPermission(input: {
  periodClosed?: boolean;
  role: TenantUserRole;
}) {
  if (input.role !== "admin") {
    return {
      allowed: false,
      reason: "Finans ayarlarını yalnız yönetici değiştirebilir.",
    } as const;
  }

  if (input.periodClosed) {
    return {
      allowed: false,
      reason: "Kapalı dönemde finans ayarları değiştirilemez.",
    } as const;
  }

  return { allowed: true, reason: "" } as const;
}

export function buildEffectiveFinanceSettings(
  row: FinanceSettingsSnapshot | null,
  scope: TenantScope,
): EffectiveFinanceSettings {
  const canManage = getFinanceSettingsPermission({
    periodClosed: scope.periodClosed,
    role: scope.userRole,
  }).allowed;

  if (!row) {
    return {
      ...FINANCE_SETTINGS_FALLBACK,
      canManage,
      revisionNo: 0,
      source: "fallback",
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    canManage,
    defaultVatRate: row.defaultVatRate,
    revisionNo: row.revisionNo,
    showVatBreakdown: row.showVatBreakdown,
    source: "persisted",
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function createFinanceSettingsId(scope: TenantScope) {
  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}::finance-settings`;
}

export function createFinanceSettingsMutationKey(
  scope: TenantScope,
  requestKey: string,
) {
  return [
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    scope.userId,
    normalizeFinanceSettingsRequestKey(requestKey),
  ].join("::");
}
