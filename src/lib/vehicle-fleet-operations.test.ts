import { describe, expect, it } from "vitest";

import {
  VEHICLE_FLEET_MAX_NOTE_LENGTH,
  VEHICLE_FLEET_MAX_TEXT_LENGTH,
  assertVehicleFleetTransition,
  assertVehicleOdometerNotRegressed,
  canTransitionVehicleAssignmentStatus,
  canTransitionVehicleFuelRecordStatus,
  canTransitionVehicleMaintenancePlanStatus,
  canTransitionVehicleMaintenanceRecordStatus,
  createVehicleAssignmentDraft,
  createVehicleFuelRecordDraft,
  createVehicleMaintenancePlanDraft,
  createVehicleMaintenanceRecordDraft,
  getVehicleAssignmentKey,
  getVehicleFleetOperationPermission,
  getVehicleFuelRecordKey,
  normalizeVehicleFleetDate,
  normalizeVehicleFleetText,
} from "./vehicle-fleet-operations";

describe("vehicle fleet operation drafts", () => {
  it("creates a normalized active vehicle assignment with a project and driver", () => {
    expect(createVehicleAssignmentDraft({
      assignedOn: "2026-07-28",
      assignmentNote: "  Gece  vardiyası ",
      driverPersonnelId: " personnel-1 ",
      projectId: " project-1 ",
      vehicleId: " vehicle-1 ",
    })).toEqual({
      assignedOn: "2026-07-28",
      assignmentNote: "Gece vardiyası",
      driverPersonnelId: "personnel-1",
      projectId: "project-1",
      status: "ACTIVE",
      vehicleId: "vehicle-1",
    });
  });

  it("requires an assignment target", () => {
    expect(() => createVehicleAssignmentDraft({ assignedOn: "2026-07-28", vehicleId: "vehicle-1" }))
      .toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("creates a manual fuel record with a deterministic key and derived amount", () => {
    expect(createVehicleFuelRecordDraft({
      fueledOn: "2026-07-28",
      liters: 40.5,
      odometerKm: 120_500,
      stationName: "  Merkez  İstasyon ",
      unitPrice: 42.37,
      vehicleId: " vehicle-1 ",
    })).toEqual({
      fueledOn: "2026-07-28",
      key: "vehicle-1::2026-07-28::120500::merkez istasyon",
      liters: 40.5,
      odometerKm: 120_500,
      stationName: "Merkez İstasyon",
      status: "RECORDED",
      totalAmount: 1715.99,
      unitPrice: 42.37,
      vehicleId: "vehicle-1",
    });
    expect(getVehicleFuelRecordKey({ fueledOn: "2026-07-28", odometerKm: 12, stationName: null, vehicleId: "vehicle-1" }))
      .toBe("vehicle-1::2026-07-28::12::manual");
  });

  it("rejects invalid fuel values and regressing odometer readings", () => {
    expect(() => createVehicleFuelRecordDraft({ fueledOn: "2026-07-28", liters: 0, odometerKm: 1, unitPrice: 1, vehicleId: "vehicle-1" }))
      .toThrow(expect.objectContaining({ code: "INVALID_AMOUNT" }));
    expect(() => assertVehicleOdometerNotRegressed({ entryOdometerKm: 100, lastRecordedOdometerKm: 140, nextOdometerKm: 139 }))
      .toThrow(expect.objectContaining({ code: "INVALID_ODOMETER" }));
    expect(assertVehicleOdometerNotRegressed({ entryOdometerKm: 100, lastRecordedOdometerKm: 140, nextOdometerKm: 140 })).toBe(140);
  });

  it("creates an active maintenance plan when it has a km or date target", () => {
    expect(createVehicleMaintenancePlanDraft({
      intervalDays: 180,
      intervalKm: 10_000,
      maintenanceType: " Periyodik bakım ",
      nextDueKm: 130_000,
      nextDueOn: "2027-01-28",
      vehicleId: " vehicle-1 ",
    })).toEqual({
      intervalDays: 180,
      intervalKm: 10_000,
      maintenanceType: "Periyodik bakım",
      nextDueKm: 130_000,
      nextDueOn: "2027-01-28",
      status: "ACTIVE",
      vehicleId: "vehicle-1",
    });
  });

  it("rejects maintenance plans without a target or with invalid intervals", () => {
    expect(() => createVehicleMaintenancePlanDraft({ maintenanceType: "Periyodik", vehicleId: "vehicle-1" }))
      .toThrow(expect.objectContaining({ code: "INVALID_SCHEDULE" }));
    expect(() => createVehicleMaintenancePlanDraft({ intervalKm: 1.5, maintenanceType: "Periyodik", nextDueKm: 100, vehicleId: "vehicle-1" }))
      .toThrow(expect.objectContaining({ code: "INVALID_SCHEDULE" }));
  });

  it("creates a draft maintenance record without creating a financial side effect", () => {
    expect(createVehicleMaintenanceRecordDraft({
      costAmount: 0,
      maintenanceOn: "2026-07-28",
      maintenanceType: " Arıza ",
      note: "  Hortum değişimi ",
      odometerKm: 120_600,
      planId: " plan-1 ",
      providerName: " Servis A ",
      vehicleId: " vehicle-1 ",
    })).toEqual({
      costAmount: 0,
      maintenanceOn: "2026-07-28",
      maintenanceType: "Arıza",
      note: "Hortum değişimi",
      odometerKm: 120_600,
      planId: "plan-1",
      providerName: "Servis A",
      status: "DRAFT",
      vehicleId: "vehicle-1",
    });
  });
});

describe("vehicle fleet operation lifecycle and permissions", () => {
  it("allows only forward controlled transitions", () => {
    expect(canTransitionVehicleAssignmentStatus("ACTIVE", "TRANSFERRED")).toBe(true);
    expect(canTransitionVehicleAssignmentStatus("COMPLETED", "ACTIVE")).toBe(false);
    expect(canTransitionVehicleFuelRecordStatus("RECORDED", "CANCELLED")).toBe(true);
    expect(canTransitionVehicleMaintenancePlanStatus("ACTIVE", "COMPLETED")).toBe(true);
    expect(canTransitionVehicleMaintenancePlanStatus("CANCELLED", "ACTIVE")).toBe(false);
    expect(canTransitionVehicleMaintenanceRecordStatus("DRAFT", "COMPLETED")).toBe(true);
    expect(() => assertVehicleFleetTransition(false, "Bakım planı"))
      .toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });

  it("keeps list access open and rejects viewer or closed-period mutations", () => {
    expect(getVehicleFleetOperationPermission({ operation: "list", role: "viewer" })).toEqual({ allowed: true });
    expect(getVehicleFleetOperationPermission({ operation: "create", role: "viewer" })).toEqual({
      allowed: false,
      reason: "Araç operasyon kaydı için muhasebe veya yönetici yetkisi gereklidir.",
    });
    expect(getVehicleFleetOperationPermission({ operation: "transition", periodClosed: true, role: "admin" }))
      .toEqual({ allowed: false, reason: "Kapalı dönemde araç operasyon kaydı değiştirilemez." });
    expect(getVehicleFleetOperationPermission({ operation: "create", role: "accounting" })).toEqual({ allowed: true });
  });

  it("uses a stable assignment key", () => {
    expect(getVehicleAssignmentKey({ assignedOn: "2026-07-28", vehicleId: " vehicle-1 " }))
      .toBe("vehicle-1::2026-07-28");
  });
});

describe("vehicle fleet operation normalization safeguards", () => {
  it("normalizes whitespace and rejects impossible calendar dates", () => {
    expect(normalizeVehicleFleetText("  Periyodik\n\tBakım ")).toBe("Periyodik Bakım");
    expect(normalizeVehicleFleetDate("2024-02-29", "Tarih")).toBe("2024-02-29");
    expect(() => normalizeVehicleFleetDate("2025-02-29", "Tarih"))
      .toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });

  it("enforces explicit field and note limits", () => {
    expect(() => createVehicleMaintenancePlanDraft({
      maintenanceType: "a".repeat(VEHICLE_FLEET_MAX_TEXT_LENGTH + 1),
      nextDueKm: 1,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(() => createVehicleMaintenanceRecordDraft({
      costAmount: 1,
      maintenanceOn: "2026-07-28",
      maintenanceType: "Periyodik",
      note: "a".repeat(VEHICLE_FLEET_MAX_NOTE_LENGTH + 1),
      odometerKm: 1,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
  });
});
