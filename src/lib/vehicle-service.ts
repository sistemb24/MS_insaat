import { buildTenantScopeKey, type TenantScope } from "./tenant-scope";

export type VehicleCardStatus = "Aktif" | "Pasif";

export type VehicleCardDraft = {
  acquisitionDate?: string;
  arventoDeviceId: string;
  brand: string;
  chassisNumber?: string;
  dispositionDate?: string;
  insuranceEndDate?: string;
  inspectionEndDate?: string;
  maintenanceDueDate?: string;
  registrationDate?: string;
  driverName: string;
  engineNumber?: string;
  entryOdometerKm?: number;
  fuelType?: string;
  modelName: string;
  modelYear: number;
  plate: string;
  siteCode: string;
  siteName: string;
  vehicleType: string;
};

export type VehicleCardRow = VehicleCardDraft & {
  companyId: string;
  createdAt: string;
  createdBy: string;
  id: string;
  periodId: string;
  status: VehicleCardStatus;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
};

export type VehicleRepositoryListInput = {
  scope: TenantScope;
};

export type VehicleRepositorySetStatusInput = {
  id: string;
  nowIso: string;
  scope: TenantScope;
  status: VehicleCardStatus;
};

export type VehicleRepositoryUpdateIfUnchangedInput = {
  expectedUpdatedAt: string;
  row: VehicleCardRow;
};

export type VehicleRepository = {
  list(input: VehicleRepositoryListInput): Promise<VehicleCardRow[]>;
  setStatus(input: VehicleRepositorySetStatusInput): Promise<VehicleCardRow | null>;
  updateIfUnchanged(
    input: VehicleRepositoryUpdateIfUnchangedInput,
  ): Promise<VehicleCardRow | null>;
  upsert(row: VehicleCardRow): Promise<VehicleCardRow>;
};

export type VehicleCardDraftValues = Partial<
  Omit<VehicleCardDraft, "entryOdometerKm" | "modelYear"> & {
    entryOdometerKm: number | string;
    modelYear: number | string;
  }
>;

export type BuildVehicleCardRowInput = {
  draft: VehicleCardDraft;
  nowIso: string;
  scope: TenantScope;
};

export function createVehicleCardDraft(
  values: VehicleCardDraftValues = {},
): VehicleCardDraft {
  return {
    acquisitionDate: normalizeText(values.acquisitionDate),
    arventoDeviceId: normalizeText(values.arventoDeviceId).toLocaleUpperCase("tr-TR"),
    brand: normalizeText(values.brand),
    chassisNumber: normalizeText(values.chassisNumber).toLocaleUpperCase("tr-TR"),
    dispositionDate: normalizeText(values.dispositionDate),
    insuranceEndDate: normalizeText(values.insuranceEndDate),
    inspectionEndDate: normalizeText(values.inspectionEndDate),
    ...(normalizeText(values.maintenanceDueDate)
      ? { maintenanceDueDate: normalizeText(values.maintenanceDueDate) }
      : {}),
    registrationDate: normalizeText(values.registrationDate),
    driverName: normalizeText(values.driverName),
    engineNumber: normalizeText(values.engineNumber).toLocaleUpperCase("tr-TR"),
    entryOdometerKm: Number(values.entryOdometerKm ?? 0),
    fuelType: normalizeText(values.fuelType),
    modelName: normalizeText(values.modelName),
    modelYear: Number(values.modelYear ?? 0),
    plate: normalizeText(values.plate).toLocaleUpperCase("tr-TR"),
    siteCode: normalizeText(values.siteCode),
    siteName: normalizeText(values.siteName),
    vehicleType: normalizeText(values.vehicleType),
  };
}

export function validateVehicleCardDraft(draft: VehicleCardDraft): string[] {
  const errors: string[] = [];

  if (!draft.plate) {
    errors.push("Plaka zorunludur.");
  }

  if (!draft.vehicleType) {
    errors.push("Araç tipi zorunludur.");
  }

  if (!draft.siteName) {
    errors.push("Şantiye adı zorunludur.");
  }

  if (!Number.isFinite(draft.modelYear) || !Number.isInteger(draft.modelYear)) {
    errors.push("Model yılı dört haneli geçerli bir yıl olmalıdır.");
  } else if (
    draft.modelYear > 0 &&
    (draft.modelYear < 1900 || draft.modelYear > 2100)
  ) {
    errors.push("Model yılı 1900 ile 2100 arasında olmalıdır.");
  }

  const entryOdometerKm = draft.entryOdometerKm ?? 0;

  if (
    !Number.isFinite(entryOdometerKm) ||
    !Number.isInteger(entryOdometerKm) ||
    entryOdometerKm < 0
  ) {
    errors.push("Giriş KM negatif olmayan bir tam sayı olmalıdır.");
  }

  if (draft.acquisitionDate && !isValidDateOnly(draft.acquisitionDate)) {
    errors.push("Alındığı/kiralandığı tarih geçerli bir tarih olmalıdır.");
  }

  if (draft.dispositionDate && !isValidDateOnly(draft.dispositionDate)) {
    errors.push("Satıldığı/iade tarihi geçerli bir tarih olmalıdır.");
  } else if (
    draft.acquisitionDate &&
    draft.dispositionDate &&
    isValidDateOnly(draft.acquisitionDate) &&
    draft.dispositionDate < draft.acquisitionDate
  ) {
    errors.push("Satıldığı/iade tarihi alındığı/kiralandığı tarihten önce olamaz.");
  }

  if (draft.insuranceEndDate && !isValidDateOnly(draft.insuranceEndDate)) {
    errors.push("Sigorta bitiş tarihi geçerli bir tarih olmalıdır.");
  }

  if (draft.inspectionEndDate && !isValidDateOnly(draft.inspectionEndDate)) {
    errors.push("Muayene bitiş tarihi geçerli bir tarih olmalıdır.");
  }

  if (draft.maintenanceDueDate && !isValidDateOnly(draft.maintenanceDueDate)) {
    errors.push("Bakım tarihi geçerli bir tarih olmalıdır.");
  }

  if (draft.registrationDate && !isValidDateOnly(draft.registrationDate)) {
    errors.push("Tescil tarihi geçerli bir tarih olmalıdır.");
  }

  return errors;
}

export function buildVehicleCardRow({
  draft,
  nowIso,
  scope,
}: BuildVehicleCardRowInput): VehicleCardRow {
  return {
    ...draft,
    companyId: scope.companyId,
    createdAt: nowIso,
    createdBy: scope.userId,
    id: `${buildTenantScopeKey(scope)}::vehicle::${slugifyPlate(draft.plate)}`,
    periodId: scope.periodId,
    status: "Aktif",
    tenantId: scope.tenantId,
    updatedAt: nowIso,
    updatedBy: scope.userId,
  };
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function slugifyPlate(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

