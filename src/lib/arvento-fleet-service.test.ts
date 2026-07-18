import { describe, expect, test } from "vitest";

import {
  buildArventoCredentialAuditEventDraft,
  getArventoVehicleFleetOverview,
  getDefaultArventoVehicleFleetOverview,
  getArventoCredentialReadiness,
  redactArventoCredentialDraftForAudit,
  validateArventoCredentialDraft,
} from "./arvento-fleet-service";
import { defaultTenantScope } from "./tenant-scope";
import { buildVehicleCardRow, createVehicleCardDraft } from "./vehicle-service";
describe("arvento fleet service", () => {
  test("validates and trims the Arvento credential draft before sandbox testing", () => {
    const result = validateArventoCredentialDraft({
      pin1: " 111111 ",
      pin2: " 222222 ",
      userName: " NOA-SANDBOX ",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        draft: {
          pin1: "111111",
          pin2: "222222",
          userName: "NOA-SANDBOX",
        },
      },
    });
  });

  test("returns all required field errors for an empty Arvento credential draft", () => {
    const result = validateArventoCredentialDraft({
      pin1: " ",
      pin2: "",
      userName: "\t",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Arvento kullanıcı adı zorunludur.",
        "Arvento PIN1 zorunludur.",
        "Arvento PIN2 zorunludur.",
      ],
    });
  });

  test("summarizes credential readiness without exposing secret values", () => {
    expect(
      getArventoCredentialReadiness({
        pin1: "",
        pin2: "222222",
        userName: "NOA-SANDBOX",
      }),
    ).toEqual({
      missingFields: ["PIN1"],
      ready: false,
      statusLabel: "Eksik bilgi",
    });

    expect(
      getArventoCredentialReadiness({
        pin1: "111111",
        pin2: "222222",
        userName: "NOA-SANDBOX",
      }),
    ).toEqual({
      missingFields: [],
      ready: true,
      statusLabel: "Test için hazır",
    });
  });

  test("redacts credential draft values for future audit payloads", () => {
    const result = redactArventoCredentialDraftForAudit({
      pin1: "111111",
      pin2: "222222",
      userName: "NOA-SANDBOX",
    });

    expect(result).toEqual({
      pin1: "girildi",
      pin2: "girildi",
      userName: "girildi",
    });
    expect(JSON.stringify(result)).not.toContain("NOA-SANDBOX");
    expect(JSON.stringify(result)).not.toContain("111111");
    expect(JSON.stringify(result)).not.toContain("222222");

    expect(
      redactArventoCredentialDraftForAudit({
        pin1: "",
        pin2: "222222",
        userName: " ",
      }),
    ).toEqual({
      pin1: "eksik",
      pin2: "girildi",
      userName: "eksik",
    });
  });

  test("builds a no-secret audit event draft for credential preflight", () => {
    const result = buildArventoCredentialAuditEventDraft({
      pin1: "111111",
      pin2: "222222",
      userName: "NOA-SANDBOX",
    });

    expect(result).toEqual({
      action: "arvento.credentials.preflight",
      detail: "Arvento credential hazırlığı: Test için hazır",
      readiness: {
        missingFields: [],
        ready: true,
        statusLabel: "Test için hazır",
      },
      redactedCredentials: {
        pin1: "girildi",
        pin2: "girildi",
        userName: "girildi",
      },
    });
    expect(JSON.stringify(result)).not.toContain("NOA-SANDBOX");
    expect(JSON.stringify(result)).not.toContain("111111");
    expect(JSON.stringify(result)).not.toContain("222222");
  });

  test("builds the default vehicle fleet tracking read model", () => {
    const overview = getDefaultArventoVehicleFleetOverview();

    expect(overview.summary).toEqual({
      alertCount: 3,
      averageFuelLevelPercent: 64,
      criticalAlertCount: 1,
      insuranceAlertCount: 0,
      inspectionAlertCount: 0,
      maintenanceAlertCount: 1,
      movingCount: 1,
      parkedCount: 1,
      signalLostCount: 1,
      vehicleCount: 3,
    });
    expect(overview.rows).toEqual([
      expect.objectContaining({
        fuelLevelPercent: 78,
        maintenanceStatusLabel: "Bakım takipte",
        plate: "34 NOA 101",
        statusLabel: "Hareket halinde",
      }),
      expect.objectContaining({
        fuelLevelPercent: 61,
        maintenanceStatusLabel: "Yaklaşan bakım",
        plate: "34 NOA 202",
        statusLabel: "Park halinde",
        vehicleLabel: "Kamyonet / Ford Transit 2021",
      }),
      expect.objectContaining({
        fuelLevelPercent: 52,
        maintenanceStatusLabel: "Sinyal kontrolü",
        plate: "34 NOA 303",
        statusLabel: "Sinyal yok",
      }),
    ]);
    expect(overview.alerts).toEqual([
      {
        id: "vehicle-34-noa-303-signal-alert",
        detail: "34 NOA 303 son sinyalden beri takip gerektirir.",
        plate: "34 NOA 303",
        severity: "Kritik",
        title: "Sinyal yok",
      },
      {
        id: "vehicle-34-noa-202-maintenance-alert",
        detail: "34 NOA 202 için bakım planı kontrol edilmeli.",
        plate: "34 NOA 202",
        severity: "Uyarı",
        title: "Yaklaşan bakım",
      },
      {
        id: "vehicle-34-noa-303-fuel-alert",
        detail: "34 NOA 303 yakıt seviyesi yüzde 55 eşiğinin altında izleniyor.",
        plate: "34 NOA 303",
        severity: "Bilgi",
        title: "Yakıt seviyesi izleniyor",
      },
    ]);
  });
  test("uses persisted vehicle cards for the vehicle fleet overview when available", () => {
    const vehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        driverName: "Ali Usta",
        modelName: "Transit",
        modelYear: 2024,
        plate: "34 NOA 303",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });

    const overview = getArventoVehicleFleetOverview([vehicleCard]);

    expect(overview.summary).toEqual({
      alertCount: 0,
      averageFuelLevelPercent: 100,
      criticalAlertCount: 0,
      insuranceAlertCount: 0,
      inspectionAlertCount: 0,
      maintenanceAlertCount: 0,
      movingCount: 0,
      parkedCount: 1,
      signalLostCount: 0,
      vehicleCount: 1,
    });
    expect(overview.rows).toEqual([
      expect.objectContaining({
        driverName: "Ali Usta",
        fuelLevelPercent: 100,
        id: vehicleCard.id,
        lastSeenAt: "2026-07-05T19:30:00.000Z",
        locationLabel: "Merkez Şantiye",
        maintenanceStatusLabel: "Bakım takipte",
        odometerKm: 0,
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        statusLabel: "Park halinde",
        vehicleLabel: "Kamyonet / Ford Transit 2024",
      }),
    ]);
    expect(overview.alerts).toEqual([]);
  });
  test("builds insurance and inspection expiry alerts from active vehicle cards", () => {
    const vehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        insuranceEndDate: "2026-07-20",
        inspectionEndDate: "2026-06-30",
        maintenanceDueDate: "2026-07-25",
        plate: "34 NOA 505",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyon",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });

    const overview = getArventoVehicleFleetOverview([vehicleCard], "2026-07-05");

    expect(overview.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ plate: "34 NOA 505", severity: "Uyarı", title: "Sigorta süresi yaklaşıyor" }),
      expect.objectContaining({ plate: "34 NOA 505", severity: "Kritik", title: "Muayene süresi yaklaşıyor" }),
      expect.objectContaining({ plate: "34 NOA 505", severity: "Uyarı", title: "Yaklaşan bakım" }),
    ]));
    expect(overview.rows[0].maintenanceStatusLabel).toBe("Yaklaşan bakım");
    expect(overview.summary.alertCount).toBe(3);
    expect(overview.summary.criticalAlertCount).toBe(1);
    expect(overview.summary.insuranceAlertCount).toBe(1);
    expect(overview.summary.inspectionAlertCount).toBe(1);
    expect(overview.summary.maintenanceAlertCount).toBe(1);
  });

  test("marks an expired maintenance due date as critical", () => {
    const vehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        maintenanceDueDate: "2026-06-30",
        plate: "34 NOA 606",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyon",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });

    const overview = getArventoVehicleFleetOverview([vehicleCard], "2026-07-05");

    expect(overview.alerts).toEqual([
      expect.objectContaining({
        detail: "34 NOA 606 bakım süresi 2026-06-30 tarihinde doldu.",
        dueDate: "2026-06-30",
        plate: "34 NOA 606",
        severity: "Kritik",
        title: "Yaklaşan bakım",
      }),
    ]);
    expect(overview.summary.criticalAlertCount).toBe(1);
    expect(overview.summary.maintenanceAlertCount).toBe(1);
  });

  test("orders same-severity vehicle compliance alerts deterministically", () => {
    const firstVehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        insuranceEndDate: "2026-07-20",
        plate: "34 ZZZ 101",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyon",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });
    const secondVehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        insuranceEndDate: "2026-07-20",
        plate: "34 AAA 202",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyon",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });

    const overview = getArventoVehicleFleetOverview(
      [firstVehicleCard, secondVehicleCard],
      "2026-07-05",
    );

    expect(overview.alerts.map((alert) => alert.plate)).toEqual([
      "34 AAA 202",
      "34 ZZZ 101",
    ]);
  });

  test("excludes passive vehicle cards from the vehicle fleet tracking overview", () => {
    const activeVehicleCard = buildVehicleCardRow({
      draft: createVehicleCardDraft({
        brand: "Ford",
        driverName: "Ali Usta",
        modelName: "Transit",
        modelYear: 2024,
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      }),
      nowIso: "2026-07-05T19:30:00.000Z",
      scope: defaultTenantScope,
    });
    const passiveVehicleCard = {
      ...buildVehicleCardRow({
        draft: createVehicleCardDraft({
          brand: "Renault",
          driverName: "Pasif Sürücü",
          modelName: "Kangoo",
          modelYear: 2020,
          plate: "34 PAS 404",
          siteName: "Arşiv Şantiye",
          vehicleType: "Panelvan",
        }),
        nowIso: "2026-07-05T19:30:00.000Z",
        scope: defaultTenantScope,
      }),
      status: "Pasif" as const,
    };

    const overview = getArventoVehicleFleetOverview([
      activeVehicleCard,
      passiveVehicleCard,
    ]);

    expect(overview.summary.vehicleCount).toBe(1);
    expect(overview.rows).toEqual([
      expect.objectContaining({
        plate: "34 NOA 303",
        vehicleLabel: "Kamyonet / Ford Transit 2024",
      }),
    ]);
    expect(overview.rows).not.toEqual([
      expect.objectContaining({ plate: "34 PAS 404" }),
    ]);
  });

  test("returns an empty tracking overview when persisted cards are all passive", () => {
    const passiveVehicleCard = {
      ...buildVehicleCardRow({
        draft: createVehicleCardDraft({
          plate: "34 PAS 404",
          siteName: "Arşiv Şantiye",
          vehicleType: "Panelvan",
        }),
        nowIso: "2026-07-05T19:30:00.000Z",
        scope: defaultTenantScope,
      }),
      status: "Pasif" as const,
    };

    const overview = getArventoVehicleFleetOverview([passiveVehicleCard]);

    expect(overview).toEqual({
      alerts: [],
      rows: [],
      summary: {
        alertCount: 0,
        averageFuelLevelPercent: 0,
        criticalAlertCount: 0,
        insuranceAlertCount: 0,
        inspectionAlertCount: 0,
        maintenanceAlertCount: 0,
        movingCount: 0,
        parkedCount: 0,
        signalLostCount: 0,
        vehicleCount: 0,
      },
    });
  });
});






