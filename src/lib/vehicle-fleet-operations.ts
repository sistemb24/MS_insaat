import type { TenantUserRole } from "./tenant-scope";

export const VEHICLE_FLEET_MAX_TEXT_LENGTH = 500;
export const VEHICLE_FLEET_MAX_NOTE_LENGTH = 2_000;

export type VehicleFleetOperation = "create" | "list" | "transition";
export type VehicleAssignmentStatus = "ACTIVE" | "COMPLETED" | "TRANSFERRED";
export type VehicleFuelRecordStatus = "RECORDED" | "CANCELLED";
export type VehicleMaintenancePlanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type VehicleMaintenanceRecordStatus = "DRAFT" | "COMPLETED";

export type VehicleAssignmentDraftInput = {
  assignedOn: string;
  assignmentNote?: string | null;
  driverPersonnelId?: string | null;
  projectId?: string | null;
  vehicleId: string;
};

export type VehicleAssignmentDraft = {
  assignedOn: string;
  assignmentNote: string | null;
  driverPersonnelId: string | null;
  projectId: string | null;
  status: "ACTIVE";
  vehicleId: string;
};

export type VehicleFuelRecordDraftInput = {
  fueledOn: string;
  liters: number;
  odometerKm: number;
  stationName?: string | null;
  unitPrice: number;
  vehicleId: string;
};

export type VehicleFuelRecordDraft = {
  fueledOn: string;
  key: string;
  liters: number;
  odometerKm: number;
  stationName: string | null;
  status: "RECORDED";
  totalAmount: number;
  unitPrice: number;
  vehicleId: string;
};

export type VehicleMaintenancePlanDraftInput = {
  intervalDays?: number | null;
  intervalKm?: number | null;
  maintenanceType: string;
  nextDueKm?: number | null;
  nextDueOn?: string | null;
  vehicleId: string;
};

export type VehicleMaintenancePlanDraft = {
  intervalDays: number | null;
  intervalKm: number | null;
  maintenanceType: string;
  nextDueKm: number | null;
  nextDueOn: string | null;
  status: "ACTIVE";
  vehicleId: string;
};

export type VehicleMaintenanceRecordDraftInput = {
  costAmount: number;
  maintenanceOn: string;
  maintenanceType: string;
  note?: string | null;
  odometerKm: number;
  planId?: string | null;
  providerName?: string | null;
  vehicleId: string;
};

export type VehicleMaintenanceRecordDraft = {
  costAmount: number;
  maintenanceOn: string;
  maintenanceType: string;
  note: string | null;
  odometerKm: number;
  planId: string | null;
  providerName: string | null;
  status: "DRAFT";
  vehicleId: string;
};

export class VehicleFleetDomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_AMOUNT"
      | "INVALID_DATE"
      | "INVALID_INPUT"
      | "INVALID_ODOMETER"
      | "INVALID_SCHEDULE"
      | "INVALID_TRANSITION"
      | "TEXT_LIMIT_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "VehicleFleetDomainError";
  }
}

export function getVehicleFleetOperationPermission(input: {
  operation: VehicleFleetOperation;
  periodClosed?: boolean;
  role: TenantUserRole;
}) {
  if (input.operation === "list") return { allowed: true as const };
  if (input.role === "viewer") {
    return { allowed: false as const, reason: "Araç operasyon kaydı için muhasebe veya yönetici yetkisi gereklidir." };
  }
  if (input.periodClosed) {
    return { allowed: false as const, reason: "Kapalı dönemde araç operasyon kaydı değiştirilemez." };
  }
  return { allowed: true as const };
}

export function createVehicleAssignmentDraft(
  input: VehicleAssignmentDraftInput,
): VehicleAssignmentDraft {
  const projectId = normalizeOptionalIdentifier(input.projectId);
  const driverPersonnelId = normalizeOptionalIdentifier(input.driverPersonnelId);
  if (!projectId && !driverPersonnelId) {
    throw new VehicleFleetDomainError("INVALID_INPUT", "Araç ataması için proje veya sürücü zorunludur.");
  }
  return {
    assignedOn: normalizeVehicleFleetDate(input.assignedOn, "Atama tarihi"),
    assignmentNote: normalizeOptionalNote(input.assignmentNote, "Atama notu"),
    driverPersonnelId,
    projectId,
    status: "ACTIVE",
    vehicleId: normalizeRequiredIdentifier(input.vehicleId, "Araç"),
  };
}

export function createVehicleFuelRecordDraft(
  input: VehicleFuelRecordDraftInput,
): VehicleFuelRecordDraft {
  const vehicleId = normalizeRequiredIdentifier(input.vehicleId, "Araç");
  const fueledOn = normalizeVehicleFleetDate(input.fueledOn, "Yakıt tarihi");
  const liters = normalizePositiveAmount(input.liters, "Yakıt litresi");
  const unitPrice = normalizePositiveAmount(input.unitPrice, "Birim fiyat");
  const odometerKm = normalizeOdometer(input.odometerKm, "Yakıt kilometresi");
  const stationName = normalizeOptionalText(input.stationName, "İstasyon");
  return {
    fueledOn,
    key: getVehicleFuelRecordKey({ fueledOn, odometerKm, stationName, vehicleId }),
    liters,
    odometerKm,
    stationName,
    status: "RECORDED",
    totalAmount: roundCurrency(liters * unitPrice),
    unitPrice,
    vehicleId,
  };
}

export function createVehicleMaintenancePlanDraft(
  input: VehicleMaintenancePlanDraftInput,
): VehicleMaintenancePlanDraft {
  const intervalKm = normalizeOptionalPositiveInteger(input.intervalKm, "Bakım kilometre aralığı");
  const intervalDays = normalizeOptionalPositiveInteger(input.intervalDays, "Bakım gün aralığı");
  const nextDueKm = normalizeOptionalOdometer(input.nextDueKm, "Sonraki bakım kilometresi");
  const nextDueOn = normalizeOptionalDate(input.nextDueOn, "Sonraki bakım tarihi");
  if (!nextDueKm && !nextDueOn) {
    throw new VehicleFleetDomainError("INVALID_SCHEDULE", "Bakım planında kilometre veya tarih hedefi zorunludur.");
  }
  return {
    intervalDays,
    intervalKm,
    maintenanceType: normalizeRequiredText(input.maintenanceType, "Bakım türü"),
    nextDueKm,
    nextDueOn,
    status: "ACTIVE",
    vehicleId: normalizeRequiredIdentifier(input.vehicleId, "Araç"),
  };
}

export function createVehicleMaintenanceRecordDraft(
  input: VehicleMaintenanceRecordDraftInput,
): VehicleMaintenanceRecordDraft {
  return {
    costAmount: normalizeNonNegativeAmount(input.costAmount, "Bakım maliyeti"),
    maintenanceOn: normalizeVehicleFleetDate(input.maintenanceOn, "Bakım tarihi"),
    maintenanceType: normalizeRequiredText(input.maintenanceType, "Bakım türü"),
    note: normalizeOptionalNote(input.note, "Bakım notu"),
    odometerKm: normalizeOdometer(input.odometerKm, "Bakım kilometresi"),
    planId: normalizeOptionalIdentifier(input.planId),
    providerName: normalizeOptionalText(input.providerName, "Servis"),
    status: "DRAFT",
    vehicleId: normalizeRequiredIdentifier(input.vehicleId, "Araç"),
  };
}

export function getVehicleAssignmentKey(input: Pick<VehicleAssignmentDraft, "assignedOn" | "vehicleId">) {
  return `${normalizeRequiredIdentifier(input.vehicleId, "Araç")}::${normalizeVehicleFleetDate(input.assignedOn, "Atama tarihi")}`;
}

export function getVehicleFuelRecordKey(input: Pick<VehicleFuelRecordDraft, "fueledOn" | "odometerKm" | "stationName" | "vehicleId">) {
  const station = normalizeOptionalText(input.stationName, "İstasyon")?.toLocaleLowerCase("tr-TR") ?? "manual";
  return `${normalizeRequiredIdentifier(input.vehicleId, "Araç")}::${normalizeVehicleFleetDate(input.fueledOn, "Yakıt tarihi")}::${normalizeOdometer(input.odometerKm, "Yakıt kilometresi")}::${station}`;
}

export function assertVehicleOdometerNotRegressed(input: {
  entryOdometerKm?: number | null;
  lastRecordedOdometerKm?: number | null;
  nextOdometerKm: number;
}) {
  const minimum = Math.max(
    normalizeOptionalOdometer(input.entryOdometerKm, "Araç giriş kilometresi") ?? 0,
    normalizeOptionalOdometer(input.lastRecordedOdometerKm, "Son kayıt kilometresi") ?? 0,
  );
  const nextOdometerKm = normalizeOdometer(input.nextOdometerKm, "Yeni kilometre");
  if (nextOdometerKm < minimum) {
    throw new VehicleFleetDomainError("INVALID_ODOMETER", "Araç kilometresi önceki kayıttan geri olamaz.");
  }
  return nextOdometerKm;
}

export function canTransitionVehicleAssignmentStatus(from: VehicleAssignmentStatus, to: VehicleAssignmentStatus) {
  return from === "ACTIVE" && (to === "COMPLETED" || to === "TRANSFERRED");
}

export function canTransitionVehicleFuelRecordStatus(from: VehicleFuelRecordStatus, to: VehicleFuelRecordStatus) {
  return from === "RECORDED" && to === "CANCELLED";
}

export function canTransitionVehicleMaintenancePlanStatus(
  from: VehicleMaintenancePlanStatus,
  to: VehicleMaintenancePlanStatus,
) {
  return from === "ACTIVE" && (to === "COMPLETED" || to === "CANCELLED");
}

export function canTransitionVehicleMaintenanceRecordStatus(
  from: VehicleMaintenanceRecordStatus,
  to: VehicleMaintenanceRecordStatus,
) {
  return from === "DRAFT" && to === "COMPLETED";
}

export function assertVehicleFleetTransition(allowed: boolean, label: string) {
  if (!allowed) {
    throw new VehicleFleetDomainError("INVALID_TRANSITION", `${label} için istenen durum geçişi geçersiz.`);
  }
}

export function normalizeVehicleFleetDate(value: string, label: string) {
  const normalized = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) {
    throw new VehicleFleetDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new VehicleFleetDomainError("INVALID_DATE", `${label} geçerli bir takvim tarihi olmalıdır.`);
  }
  return normalized;
}

export function normalizeVehicleFleetText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeRequiredIdentifier(value: unknown, label: string) {
  const normalized = normalizeVehicleFleetText(value);
  if (!normalized) throw new VehicleFleetDomainError("INVALID_INPUT", `${label} zorunludur.`);
  return normalized;
}

function normalizeOptionalIdentifier(value: unknown) {
  return normalizeVehicleFleetText(value) || null;
}

function normalizeRequiredText(value: unknown, label: string) {
  const normalized = normalizeVehicleFleetText(value);
  if (!normalized) throw new VehicleFleetDomainError("INVALID_INPUT", `${label} zorunludur.`);
  if (normalized.length > VEHICLE_FLEET_MAX_TEXT_LENGTH) {
    throw new VehicleFleetDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${VEHICLE_FLEET_MAX_TEXT_LENGTH} karakter olabilir.`);
  }
  return normalized;
}

function normalizeOptionalText(value: unknown, label: string) {
  const normalized = normalizeVehicleFleetText(value);
  if (normalized.length > VEHICLE_FLEET_MAX_TEXT_LENGTH) {
    throw new VehicleFleetDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${VEHICLE_FLEET_MAX_TEXT_LENGTH} karakter olabilir.`);
  }
  return normalized || null;
}

function normalizeOptionalNote(value: unknown, label: string) {
  const normalized = normalizeVehicleFleetText(value);
  if (normalized.length > VEHICLE_FLEET_MAX_NOTE_LENGTH) {
    throw new VehicleFleetDomainError("TEXT_LIMIT_EXCEEDED", `${label} en fazla ${VEHICLE_FLEET_MAX_NOTE_LENGTH} karakter olabilir.`);
  }
  return normalized || null;
}

function normalizePositiveAmount(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new VehicleFleetDomainError("INVALID_AMOUNT", `${label} sıfırdan büyük olmalıdır.`);
  }
  return roundCurrency(amount);
}

function normalizeNonNegativeAmount(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new VehicleFleetDomainError("INVALID_AMOUNT", `${label} negatif olamaz.`);
  }
  return roundCurrency(amount);
}

function normalizeOdometer(value: unknown, label: string) {
  const odometer = Number(value);
  if (!Number.isInteger(odometer) || odometer < 0) {
    throw new VehicleFleetDomainError("INVALID_ODOMETER", `${label} negatif olmayan tam sayı olmalıdır.`);
  }
  return odometer;
}

function normalizeOptionalOdometer(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeOdometer(value, label);
}

function normalizeOptionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new VehicleFleetDomainError("INVALID_SCHEDULE", `${label} pozitif tam sayı olmalıdır.`);
  }
  return normalized;
}

function normalizeOptionalDate(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeVehicleFleetDate(String(value), label);
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
