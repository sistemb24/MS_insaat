import type { TenantUserRole } from "./tenant-scope";

export const VEHICLE_TIRE_MAX_POSITION_LENGTH = 100;
export const VEHICLE_TIRE_MAX_TEXT_LENGTH = 200;

export type VehicleTireOperation = "create" | "list" | "transition";
export type VehicleTireSeason = "SUMMER" | "WINTER" | "ALL_SEASON";
export type VehicleTireStatus = "ACTIVE" | "REMOVED";

export type VehicleTireMountDraftInput = {
  brandModel: string;
  mountedOdometerKm: number;
  mountedOn: string;
  season: VehicleTireSeason;
  tirePosition: string;
  treadWearPercent: number;
  vehicleId: string;
};

export type VehicleTireMountDraft = {
  brandModel: string;
  key: string;
  mountedOdometerKm: number;
  mountedOn: string;
  season: VehicleTireSeason;
  status: "ACTIVE";
  tirePosition: string;
  treadWearPercent: number;
  vehicleId: string;
};

export type VehicleTireRemovalDraftInput = {
  mountedOdometerKm: number;
  mountedOn: string;
  removedOdometerKm: number;
  removedOn: string;
  tireRecordId: string;
};

export type VehicleTireRemovalDraft = {
  removedOdometerKm: number;
  removedOn: string;
  status: "REMOVED";
  tireRecordId: string;
};

export class VehicleTireDomainError extends Error {
  constructor(
    public readonly code:
      | "ACTIVE_POSITION_EXISTS"
      | "INVALID_DATE"
      | "INVALID_INPUT"
      | "INVALID_ODOMETER"
      | "INVALID_TRANSITION"
      | "INVALID_WEAR_PERCENTAGE"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "VehicleTireDomainError";
  }
}

export function getVehicleTireOperationPermission(input: {
  operation: VehicleTireOperation;
  periodClosed?: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list") return { allowed: true as const };
  if (input.role === "viewer") {
    return { allowed: false as const, reason: "Lastik operasyon kaydı için muhasebe veya yönetici yetkisi gereklidir." };
  }
  if (input.periodClosed) {
    return { allowed: false as const, reason: "Kapalı dönemde lastik operasyon kaydı değiştirilemez." };
  }
  return { allowed: true as const };
}

export function createVehicleTireMountDraft(
  input: VehicleTireMountDraftInput,
): VehicleTireMountDraft {
  const vehicleId = normalizeRequiredIdentifier(input.vehicleId, "Araç");
  const tirePosition = normalizeTirePosition(input.tirePosition);
  const mountedOn = normalizeVehicleTireDate(input.mountedOn, "Montaj tarihi");
  const mountedOdometerKm = normalizeOdometer(input.mountedOdometerKm, "Montaj kilometresi");
  const season = normalizeVehicleTireSeason(input.season);
  const brandModel = normalizeRequiredText(input.brandModel, "Marka/model");
  const treadWearPercent = normalizeWearPercent(input.treadWearPercent);
  return {
    brandModel,
    key: getVehicleTireMountKey({ brandModel, mountedOn, tirePosition, vehicleId }),
    mountedOdometerKm,
    mountedOn,
    season,
    status: "ACTIVE",
    tirePosition,
    treadWearPercent,
    vehicleId,
  };
}

export function createVehicleTireRemovalDraft(
  input: VehicleTireRemovalDraftInput,
): VehicleTireRemovalDraft {
  const mountedOn = normalizeVehicleTireDate(input.mountedOn, "Montaj tarihi");
  const removedOn = normalizeVehicleTireDate(input.removedOn, "Söküm tarihi");
  const mountedOdometerKm = normalizeOdometer(input.mountedOdometerKm, "Montaj kilometresi");
  const removedOdometerKm = normalizeOdometer(input.removedOdometerKm, "Söküm kilometresi");
  if (removedOn < mountedOn) {
    throw new VehicleTireDomainError("INVALID_DATE", "Söküm tarihi montaj tarihinden önce olamaz.");
  }
  if (removedOdometerKm < mountedOdometerKm) {
    throw new VehicleTireDomainError("INVALID_ODOMETER", "Söküm kilometresi montaj kilometresinden düşük olamaz.");
  }
  return {
    removedOdometerKm,
    removedOn,
    status: "REMOVED",
    tireRecordId: normalizeRequiredIdentifier(input.tireRecordId, "Lastik kaydı"),
  };
}

export function getVehicleTireMountKey(input: Pick<VehicleTireMountDraft, "brandModel" | "mountedOn" | "tirePosition" | "vehicleId">) {
  return [
    normalizeRequiredIdentifier(input.vehicleId, "Araç"),
    normalizeTirePosition(input.tirePosition).toLocaleLowerCase("tr-TR"),
    normalizeVehicleTireDate(input.mountedOn, "Montaj tarihi"),
    normalizeRequiredText(input.brandModel, "Marka/model").toLocaleLowerCase("tr-TR"),
  ].join("::");
}

export function assertVehicleTirePositionAvailable(input: {
  activeTireRecordId?: string | null;
  tirePosition: string;
  vehicleId: string;
}) {
  const activeTireRecordId = normalizeOptionalIdentifier(input.activeTireRecordId);
  if (activeTireRecordId) {
    throw new VehicleTireDomainError(
      "ACTIVE_POSITION_EXISTS",
      "Bu araç konumunda aktif bir lastik montajı zaten bulunmaktadır.",
    );
  }
  return {
    tirePosition: normalizeTirePosition(input.tirePosition),
    vehicleId: normalizeRequiredIdentifier(input.vehicleId, "Araç"),
  };
}

export function assertVehicleTireOdometerNotRegressed(input: {
  entryOdometerKm?: number | null;
  lastPositionOdometerKm?: number | null;
  nextOdometerKm: number;
}) {
  const minimum = Math.max(
    normalizeOptionalOdometer(input.entryOdometerKm, "Araç giriş kilometresi") ?? 0,
    normalizeOptionalOdometer(input.lastPositionOdometerKm, "Son lastik işlem kilometresi") ?? 0,
  );
  const nextOdometerKm = normalizeOdometer(input.nextOdometerKm, "Yeni kilometre");
  if (nextOdometerKm < minimum) {
    throw new VehicleTireDomainError("INVALID_ODOMETER", "Araç kilometresi önceki lastik işleminden geri olamaz.");
  }
  return nextOdometerKm;
}

export function canTransitionVehicleTireStatus(from: VehicleTireStatus, to: VehicleTireStatus) {
  return from === "ACTIVE" && to === "REMOVED";
}

export function assertVehicleTireTransition(allowed: boolean) {
  if (!allowed) {
    throw new VehicleTireDomainError("INVALID_TRANSITION", "Lastik kaydı için istenen durum geçişi geçersiz.");
  }
}

export function normalizeVehicleTireDate(value: string, label: string) {
  const normalized = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    throw new VehicleTireDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new VehicleTireDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  return normalized;
}

export function normalizeVehicleTireText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeRequiredIdentifier(value: unknown, label: string) {
  const normalized = normalizeVehicleTireText(value);
  if (!normalized) throw new VehicleTireDomainError("INVALID_INPUT", `${label} zorunludur.`);
  return normalized;
}

function normalizeOptionalIdentifier(value: unknown) {
  return normalizeVehicleTireText(value) || null;
}

function normalizeRequiredText(value: unknown, label: string) {
  const normalized = normalizeVehicleTireText(value);
  if (!normalized) throw new VehicleTireDomainError("INVALID_INPUT", `${label} zorunludur.`);
  if (normalized.length > VEHICLE_TIRE_MAX_TEXT_LENGTH) {
    throw new VehicleTireDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${VEHICLE_TIRE_MAX_TEXT_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeTirePosition(value: unknown) {
  const normalized = normalizeVehicleTireText(value);
  if (!normalized) throw new VehicleTireDomainError("INVALID_INPUT", "Lastik konumu zorunludur.");
  if (normalized.length > VEHICLE_TIRE_MAX_POSITION_LENGTH) {
    throw new VehicleTireDomainError("TEXT_LIMIT_EXCEEDED", `Lastik konumu en fazla ${VEHICLE_TIRE_MAX_POSITION_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeVehicleTireSeason(value: unknown): VehicleTireSeason {
  if (value === "SUMMER" || value === "WINTER" || value === "ALL_SEASON") return value;
  throw new VehicleTireDomainError("INVALID_INPUT", "Lastik sezonu yaz, kış veya dört mevsim olmalıdır.");
}

function normalizeWearPercent(value: unknown) {
  const percentage = Number(value);
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new VehicleTireDomainError("INVALID_WEAR_PERCENTAGE", "Aşınma yüzdesi 0 ile 100 arasında tam sayı olmalıdır.");
  }
  return percentage;
}

function normalizeOdometer(value: unknown, label: string) {
  const odometer = Number(value);
  if (!Number.isInteger(odometer) || odometer < 0) {
    throw new VehicleTireDomainError("INVALID_ODOMETER", `${label} negatif olmayan tam sayı olmalıdır.`);
  }
  return odometer;
}

function normalizeOptionalOdometer(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeOdometer(value, label);
}
