import type { AuditLogEntry } from "./audit-log";

export function buildVehicleAuditCsv(entries: AuditLogEntry[]) {
  return [
    "Zaman;Plaka;İşlem;Son Durum;Değişiklikler;Kullanıcı",
    ...entries.map((entry) =>
      [
        entry.occurredAt,
        entry.entityLabel,
        formatVehicleAuditAction(entry.action),
        getVehicleAuditStatus(entry.metadata),
        getVehicleAuditChanges(entry.metadata),
        entry.actorUserId,
      ]
        .map(escapeCsvCell)
        .join(";"),
    ),
  ].join("\r\n");
}

export function buildVehicleAuditCsvHref(entries: AuditLogEntry[]) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    `\uFEFF${buildVehicleAuditCsv(entries)}`,
  )}`;
}

export function buildVehicleAuditCsvFileName() {
  return "arac-islem-gecmisi.csv";
}

export function formatVehicleAuditAction(action: string) {
  const labels: Record<string, string> = {
    "vehicle.activate": "Aktifleştirildi",
    "vehicle.create": "Oluşturuldu",
    "vehicle.deactivate": "Pasife Alındı",
    "vehicle.update": "Güncellendi",
  };

  return labels[action] ?? action;
}

export function getVehicleAuditStatus(metadata: Record<string, unknown>) {
  const status = metadata.status;

  return typeof status === "string" && status ? status : "-";
}

export function getVehicleAuditChanges(metadata: Record<string, unknown>) {
  const changedFields = metadata.changedFields;

  if (!Array.isArray(changedFields)) {
    return "-";
  }

  const labels: Record<string, string> = {
    acquisitionDate: "Alındığı/kiralandığı tarih",
    arventoDeviceId: "Arvento cihaz ID",
    brand: "Marka",
    chassisNumber: "Şase no",
    dispositionDate: "Satıldığı/iade tarihi",
    insuranceEndDate: "Sigorta bitiş tarihi",
    inspectionEndDate: "Muayene bitiş tarihi",
    maintenanceDueDate: "Bakım tarihi",
    registrationDate: "Tescil tarihi",
    driverName: "Sürücü",
    engineNumber: "Motor no",
    entryOdometerKm: "Giriş KM",
    fuelType: "Yakıt türü",
    modelName: "Model",
    modelYear: "Model yılı",
    siteCode: "Şantiye kodu",
    siteName: "Şantiye",
    vehicleType: "Araç tipi",
  };
  const fields = Array.from(
    new Set(changedFields.filter((field): field is string => typeof field === "string")),
  );

  return fields.length > 0
    ? fields.map((field) => labels[field] ?? field).join(", ")
    : "Bilgi değişmedi";
}

function escapeCsvCell(value: string) {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
