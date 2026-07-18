import type { VehicleCardRow } from "./vehicle-service";

export type ArventoFleetCapabilityRow = {
  description: string;
  label: string;
  status: "Hazır" | "Planlandı";
};

export type ArventoFleetConnectionSettings = {
  endpoint: string;
  refreshIntervalLabel: "5 dk" | "10 dk" | "15 dk" | "30 dk" | "1 saat";
  simulationMode: boolean;
  statusLabel: "P2 sandbox hazırlığı" | "Bağlantı bekliyor" | "Aktif";
  userName: string;
};

export type ArventoFleetOverview = {
  capabilities: ArventoFleetCapabilityRow[];
  connection: ArventoFleetConnectionSettings;
};

export type ArventoVehicleTrackingStatus =
  | "Hareket halinde"
  | "Park halinde"
  | "Sinyal yok";

export type ArventoVehicleTrackingRow = {
  driverName: string;
  fuelLevelPercent: number;
  id: string;
  lastSeenAt: string;
  locationLabel: string;
  maintenanceStatusLabel: "Bakım takipte" | "Yaklaşan bakım" | "Sinyal kontrolü";
  odometerKm: number;
  plate: string;
  siteName: string;
  statusLabel: ArventoVehicleTrackingStatus;
  vehicleLabel: string;
};

export type ArventoVehicleFleetAlert = {
  detail: string;
  dueDate?: string;
  id: string;
  plate: string;
  severity: "Kritik" | "Uyarı" | "Bilgi";
  title:
    | "Sinyal yok"
    | "Yaklaşan bakım"
    | "Yakıt seviyesi izleniyor"
    | "Sigorta süresi yaklaşıyor"
    | "Muayene süresi yaklaşıyor";
};

export type ArventoVehicleFleetOverview = {
  alerts: ArventoVehicleFleetAlert[];
  rows: ArventoVehicleTrackingRow[];
  summary: {
    alertCount: number;
    averageFuelLevelPercent: number;
    criticalAlertCount: number;
    insuranceAlertCount: number;
    inspectionAlertCount: number;
    maintenanceAlertCount: number;
    movingCount: number;
    parkedCount: number;
    signalLostCount: number;
    vehicleCount: number;
  };
};

export type ArventoFleetCredentialDraft = {
  pin1: string;
  pin2: string;
  userName: string;
};

export type ArventoFleetCredentialReadiness = {
  missingFields: string[];
  ready: boolean;
  statusLabel: "Eksik bilgi" | "Test için hazır";
};

export type ArventoFleetCredentialAuditRedaction = {
  pin1: "eksik" | "girildi";
  pin2: "eksik" | "girildi";
  userName: "eksik" | "girildi";
};

export type ArventoFleetCredentialAuditEventDraft = {
  action: "arvento.credentials.preflight";
  detail: string;
  readiness: ArventoFleetCredentialReadiness;
  redactedCredentials: ArventoFleetCredentialAuditRedaction;
};

export type ArventoFleetResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: string[];
    };

const defaultArventoFleetCapabilities: ArventoFleetCapabilityRow[] = [
  {
    description: "GPS araç konumu ve son hareket zamanı",
    label: "GPS Takibi",
    status: "Hazır",
  },
  {
    description: "KM / motor saati puantaj ve bakım uyarısı",
    label: "Otomatik Puantaj",
    status: "Planlandı",
  },
  {
    description: "CANbus/OBD yakıt seviyesi ve ani düşüş alarmı",
    label: "Yakıt Takibi",
    status: "Planlandı",
  },
  {
    description: "Test amaçlı sahte GPS verisi üretir",
    label: "Simülasyon Modu",
    status: "Hazır",
  },
];

const defaultArventoVehicleTrackingRows: ArventoVehicleTrackingRow[] = [
  {
    driverName: "Ali Usta",
    fuelLevelPercent: 78,
    id: "vehicle-34-noa-101",
    lastSeenAt: "2026-07-05T09:15:00.000Z",
    locationLabel: "Ataşehir / İstanbul",
    maintenanceStatusLabel: "Bakım takipte",
    odometerKm: 84210,
    plate: "34 NOA 101",
    siteName: "Merkez Şantiye",
    statusLabel: "Hareket halinde",
    vehicleLabel: "Kamyon / Mercedes Arocs 2022",
  },
  {
    driverName: "Mehmet Operatör",
    fuelLevelPercent: 61,
    id: "vehicle-34-noa-202",
    lastSeenAt: "2026-07-05T08:40:00.000Z",
    locationLabel: "Gebze Depo",
    maintenanceStatusLabel: "Yaklaşan bakım",
    odometerKm: 126540,
    plate: "34 NOA 202",
    siteName: "Depo / Lojistik",
    statusLabel: "Park halinde",
    vehicleLabel: "Kamyonet / Ford Transit 2021",
  },
  {
    driverName: "Atanmamış",
    fuelLevelPercent: 52,
    id: "vehicle-34-noa-303",
    lastSeenAt: "2026-07-04T18:10:00.000Z",
    locationLabel: "Son konum bekleniyor",
    maintenanceStatusLabel: "Sinyal kontrolü",
    odometerKm: 65220,
    plate: "34 NOA 303",
    siteName: "Kuzey Şantiye",
    statusLabel: "Sinyal yok",
    vehicleLabel: "Binek / Renault Megane 2020",
  },
];

export function getDefaultArventoFleetOverview(): ArventoFleetOverview {
  return {
    capabilities: defaultArventoFleetCapabilities.map((capability) => ({
      ...capability,
    })),
    connection: {
      endpoint: "ws.arvento.com",
      refreshIntervalLabel: "15 dk",
      simulationMode: true,
      statusLabel: "P2 sandbox hazırlığı",
      userName: "NOA-SANDBOX",
    },
  };
}

export function getDefaultArventoVehicleFleetOverview(): ArventoVehicleFleetOverview {
  const rows = defaultArventoVehicleTrackingRows.map((row) => ({ ...row }));

  return buildArventoVehicleFleetOverview(rows);
}

export function getArventoVehicleFleetOverview(
  vehicleCards: VehicleCardRow[],
  today = new Date().toISOString().slice(0, 10),
): ArventoVehicleFleetOverview {
  if (vehicleCards.length === 0) {
    return getDefaultArventoVehicleFleetOverview();
  }

  const activeCards = vehicleCards.filter((vehicleCard) => vehicleCard.status === "Aktif");
  const overview = buildArventoVehicleFleetOverview(
    activeCards.map((vehicleCard) => vehicleCardToTrackingRow(vehicleCard, today)),
  );
  const maintenanceDueVehicleIds = new Set(
    activeCards
      .filter((vehicleCard) => vehicleCard.maintenanceDueDate)
      .map((vehicleCard) => vehicleCard.id),
  );
  const baseAlerts = overview.alerts.filter(
    (alert) =>
      !(
        alert.title === "Yaklaşan bakım" &&
        maintenanceDueVehicleIds.has(alert.id.replace(/-maintenance-alert$/, ""))
      ),
  );
  const complianceAlerts = buildVehicleComplianceAlerts(activeCards, today);

  return {
    ...overview,
    alerts: [...baseAlerts, ...complianceAlerts].sort(compareVehicleAlerts),
    summary: {
      ...overview.summary,
      alertCount: baseAlerts.length + complianceAlerts.length,
      criticalAlertCount:
        baseAlerts.filter((alert) => alert.severity === "Kritik").length +
        complianceAlerts.filter((alert) => alert.severity === "Kritik").length,
      insuranceAlertCount: complianceAlerts.filter(
        (alert) => alert.title === "Sigorta süresi yaklaşıyor",
      ).length,
      inspectionAlertCount: complianceAlerts.filter(
        (alert) => alert.title === "Muayene süresi yaklaşıyor",
      ).length,
      maintenanceAlertCount:
        baseAlerts.filter((alert) => alert.title === "Yaklaşan bakım").length +
        complianceAlerts.filter((alert) => alert.title === "Yaklaşan bakım")
          .length,
    },
  };
}

function buildArventoVehicleFleetOverview(
  rows: ArventoVehicleTrackingRow[],
): ArventoVehicleFleetOverview {
  const alerts = buildArventoVehicleFleetAlerts(rows);
  const vehicleCount = rows.length;
  const totalFuel = rows.reduce((total, row) => total + row.fuelLevelPercent, 0);

  return {
    alerts,
    rows,
    summary: {
      alertCount: alerts.length,
      averageFuelLevelPercent:
        vehicleCount > 0 ? Math.round(totalFuel / vehicleCount) : 0,
      criticalAlertCount: alerts.filter((alert) => alert.severity === "Kritik")
        .length,
      insuranceAlertCount: 0,
      inspectionAlertCount: 0,
      maintenanceAlertCount: alerts.filter(
        (alert) => alert.title === "Yaklaşan bakım",
      ).length,
      movingCount: rows.filter((row) => row.statusLabel === "Hareket halinde")
        .length,
      parkedCount: rows.filter((row) => row.statusLabel === "Park halinde").length,
      signalLostCount: rows.filter((row) => row.statusLabel === "Sinyal yok")
        .length,
      vehicleCount,
    },
  };
}

function vehicleCardToTrackingRow(
  vehicleCard: VehicleCardRow,
  today?: string,
): ArventoVehicleTrackingRow {
  return {
    driverName: vehicleCard.driverName || "Atanmamış",
    fuelLevelPercent: 100,
    id: vehicleCard.id,
    lastSeenAt: vehicleCard.updatedAt || vehicleCard.createdAt,
    locationLabel: vehicleCard.siteName,
    maintenanceStatusLabel: getVehicleMaintenanceStatusLabel(vehicleCard, today),
    odometerKm: 0,
    plate: vehicleCard.plate,
    siteName: vehicleCard.siteName,
    statusLabel: "Park halinde",
    vehicleLabel: formatVehicleCardLabel(vehicleCard),
  };
}

function getVehicleMaintenanceStatusLabel(
  vehicleCard: VehicleCardRow,
  today?: string,
): ArventoVehicleTrackingRow["maintenanceStatusLabel"] {
  if (!vehicleCard.maintenanceDueDate || !today) {
    return "Bakım takipte";
  }

  const dueDate = parseDateOnly(vehicleCard.maintenanceDueDate);
  const todayDate = parseDateOnly(today);

  if (!dueDate || !todayDate) {
    return "Bakım takipte";
  }

  const days = Math.round((dueDate.getTime() - todayDate.getTime()) / 86400000);

  return days <= 30 ? "Yaklaşan bakım" : "Bakım takipte";
}

function formatVehicleCardLabel(vehicleCard: VehicleCardRow) {
  const brandModel = [vehicleCard.brand, vehicleCard.modelName]
    .filter(Boolean)
    .join(" ");
  const modelYear = vehicleCard.modelYear > 0 ? String(vehicleCard.modelYear) : "";
  const detail = [brandModel, modelYear].filter(Boolean).join(" ");

  return [vehicleCard.vehicleType, detail].filter(Boolean).join(" / ") || "Araç";
}
function buildArventoVehicleFleetAlerts(
  rows: ArventoVehicleTrackingRow[],
): ArventoVehicleFleetAlert[] {
  const alerts = rows.flatMap((row) => {
    const rowAlerts: ArventoVehicleFleetAlert[] = [];

    if (row.statusLabel === "Sinyal yok") {
      rowAlerts.push({
        id: `${row.id}-signal-alert`,
        detail: `${row.plate} son sinyalden beri takip gerektirir.`,
        plate: row.plate,
        severity: "Kritik",
        title: "Sinyal yok",
      });
    }

    if (row.maintenanceStatusLabel === "Yaklaşan bakım") {
      rowAlerts.push({
        id: `${row.id}-maintenance-alert`,
        detail: `${row.plate} için bakım planı kontrol edilmeli.`,
        plate: row.plate,
        severity: "Uyarı",
        title: "Yaklaşan bakım",
      });
    }

    if (row.fuelLevelPercent <= 55) {
      rowAlerts.push({
        id: `${row.id}-fuel-alert`,
        detail: `${row.plate} yakıt seviyesi yüzde 55 eşiğinin altında izleniyor.`,
        plate: row.plate,
        severity: "Bilgi",
        title: "Yakıt seviyesi izleniyor",
      });
    }

    return rowAlerts;
  });

  return alerts.sort(compareVehicleAlerts);
}

function buildVehicleComplianceAlerts(vehicleCards: VehicleCardRow[], today: string) {
  const todayDate = parseDateOnly(today);
  if (!todayDate) return [];

  return vehicleCards.flatMap((vehicleCard) =>
    [
      {
        date: vehicleCard.insuranceEndDate,
        id: "insurance",
        title: "Sigorta süresi yaklaşıyor" as const,
        label: "Sigorta",
      },
      {
        date: vehicleCard.inspectionEndDate,
        id: "inspection",
        title: "Muayene süresi yaklaşıyor" as const,
        label: "Muayene",
      },
      {
        date: vehicleCard.maintenanceDueDate,
        id: "maintenance",
        title: "Yaklaşan bakım" as const,
        label: "Bakım",
      },
    ].flatMap((item) => {
      const endDate = parseDateOnly(item.date);
      if (!endDate) return [];
      const days = Math.round((endDate.getTime() - todayDate.getTime()) / 86400000);
      if (days > 30) return [];
      const expired = days < 0;
      return [{
        detail: expired
          ? `${vehicleCard.plate} ${item.label.toLowerCase()} süresi ${item.date} tarihinde doldu.`
          : `${vehicleCard.plate} ${item.label.toLowerCase()} süresi ${item.date} tarihinde doluyor (${days} gün).`,
        id: `${vehicleCard.id}-${item.id}-alert`,
        plate: vehicleCard.plate,
        dueDate: item.date,
        severity: expired ? "Kritik" as const : "Uyarı" as const,
        title: item.title,
      }];
    }),
  );
}

function parseDateOnly(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

function compareVehicleAlerts(left: ArventoVehicleFleetAlert, right: ArventoVehicleFleetAlert) {
  const severityRank: Record<ArventoVehicleFleetAlert["severity"], number> = { Kritik: 0, Uyarı: 1, Bilgi: 2 };
  const severityDifference = severityRank[left.severity] - severityRank[right.severity];
  if (severityDifference !== 0) return severityDifference;
  const titleDifference = left.title.localeCompare(right.title, "tr");
  if (titleDifference !== 0) return titleDifference;
  const plateDifference = left.plate.localeCompare(right.plate, "tr");
  if (plateDifference !== 0) return plateDifference;
  return left.id.localeCompare(right.id, "tr");
}

export function testArventoSandboxConnection(): ArventoFleetResult<{
  connection: ArventoFleetConnectionSettings;
}> {
  const { connection } = getDefaultArventoFleetOverview();

  return {
    ok: true,
    data: {
      connection: {
        ...connection,
        statusLabel: "Aktif",
      },
    },
  };
}

export function validateArventoCredentialDraft(
  values: ArventoFleetCredentialDraft,
): ArventoFleetResult<{ draft: ArventoFleetCredentialDraft }> {
  const draft = {
    pin1: values.pin1.trim(),
    pin2: values.pin2.trim(),
    userName: values.userName.trim(),
  };
  const errors: string[] = [];

  if (!draft.userName) {
    errors.push("Arvento kullanıcı adı zorunludur.");
  }

  if (!draft.pin1) {
    errors.push("Arvento PIN1 zorunludur.");
  }

  if (!draft.pin2) {
    errors.push("Arvento PIN2 zorunludur.");
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    data: {
      draft,
    },
  };
}

export function getArventoCredentialReadiness(
  values: ArventoFleetCredentialDraft,
): ArventoFleetCredentialReadiness {
  const result = validateArventoCredentialDraft(values);

  if (result.ok) {
    return {
      missingFields: [],
      ready: true,
      statusLabel: "Test için hazır",
    };
  }

  return {
    missingFields: result.errors.map((error) =>
      error.replace("Arvento ", "").replace(" zorunludur.", ""),
    ),
    ready: false,
    statusLabel: "Eksik bilgi",
  };
}

export function redactArventoCredentialDraftForAudit(
  values: ArventoFleetCredentialDraft,
): ArventoFleetCredentialAuditRedaction {
  return {
    pin1: values.pin1.trim() ? "girildi" : "eksik",
    pin2: values.pin2.trim() ? "girildi" : "eksik",
    userName: values.userName.trim() ? "girildi" : "eksik",
  };
}

export function buildArventoCredentialAuditEventDraft(
  values: ArventoFleetCredentialDraft,
): ArventoFleetCredentialAuditEventDraft {
  const readiness = getArventoCredentialReadiness(values);

  return {
    action: "arvento.credentials.preflight",
    detail: `Arvento credential hazırlığı: ${readiness.statusLabel}`,
    readiness,
    redactedCredentials: redactArventoCredentialDraftForAudit(values),
  };
}



