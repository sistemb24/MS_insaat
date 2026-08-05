import { describe, expect, it } from "vitest";

import {
  VEHICLE_TIRE_MAX_POSITION_LENGTH,
  VEHICLE_TIRE_MAX_TEXT_LENGTH,
  assertVehicleTireOdometerNotRegressed,
  assertVehicleTirePositionAvailable,
  assertVehicleTireTransition,
  canTransitionVehicleTireStatus,
  createVehicleTireMountDraft,
  createVehicleTireRemovalDraft,
  getVehicleTireMountKey,
  getVehicleTireOperationPermission,
  normalizeVehicleTireDate,
  normalizeVehicleTireText,
} from "./vehicle-tire-operations";

describe("vehicle tire operation drafts", () => {
  it("creates a normalized active tire mounting with a deterministic key", () => {
    expect(createVehicleTireMountDraft({
      brandModel: "  315/80 R22.5   X Multi ",
      mountedOdometerKm: 120_500,
      mountedOn: "2026-07-29",
      season: "SUMMER",
      tirePosition: "  Sol  Ön ",
      treadWearPercent: 12,
      vehicleId: " vehicle-1 ",
    })).toEqual({
      brandModel: "315/80 R22.5 X Multi",
      key: "vehicle-1::sol ön::2026-07-29::315/80 r22.5 x multi",
      mountedOdometerKm: 120_500,
      mountedOn: "2026-07-29",
      season: "SUMMER",
      status: "ACTIVE",
      tirePosition: "Sol Ön",
      treadWearPercent: 12,
      vehicleId: "vehicle-1",
    });
    expect(getVehicleTireMountKey({
      brandModel: "315/80 R22.5 X Multi",
      mountedOn: "2026-07-29",
      tirePosition: "Sol Ön",
      vehicleId: "vehicle-1",
    })).toBe("vehicle-1::sol ön::2026-07-29::315/80 r22.5 x multi");
  });

  it("rejects invalid season, wear percentage, required fields, and long text", () => {
    expect(() => createVehicleTireMountDraft({
      brandModel: "Model",
      mountedOdometerKm: 1,
      mountedOn: "2026-07-29",
      season: "SPRING" as "SUMMER",
      tirePosition: "Sol Ön",
      treadWearPercent: 1,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(() => createVehicleTireMountDraft({
      brandModel: "Model",
      mountedOdometerKm: 1,
      mountedOn: "2026-07-29",
      season: "SUMMER",
      tirePosition: "Sol Ön",
      treadWearPercent: 101,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "INVALID_WEAR_PERCENTAGE" }));
    expect(() => createVehicleTireMountDraft({
      brandModel: "a".repeat(VEHICLE_TIRE_MAX_TEXT_LENGTH + 1),
      mountedOdometerKm: 1,
      mountedOn: "2026-07-29",
      season: "SUMMER",
      tirePosition: "Sol Ön",
      treadWearPercent: 0,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(() => createVehicleTireMountDraft({
      brandModel: "Model",
      mountedOdometerKm: 1,
      mountedOn: "2026-07-29",
      season: "SUMMER",
      tirePosition: "a".repeat(VEHICLE_TIRE_MAX_POSITION_LENGTH + 1),
      treadWearPercent: 0,
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
  });

  it("creates a removal only after the mounting date and odometer", () => {
    expect(createVehicleTireRemovalDraft({
      mountedOdometerKm: 120_500,
      mountedOn: "2026-07-29",
      removedOdometerKm: 135_100,
      removedOn: "2026-11-29",
      tireRecordId: " tire-1 ",
    })).toEqual({
      removedOdometerKm: 135_100,
      removedOn: "2026-11-29",
      status: "REMOVED",
      tireRecordId: "tire-1",
    });
    expect(() => createVehicleTireRemovalDraft({
      mountedOdometerKm: 120_500,
      mountedOn: "2026-07-29",
      removedOdometerKm: 120_499,
      removedOn: "2026-07-28",
      tireRecordId: "tire-1",
    })).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });
});

describe("vehicle tire operation safeguards", () => {
  it("allows one active mounting per vehicle position", () => {
    expect(assertVehicleTirePositionAvailable({
      activeTireRecordId: null,
      tirePosition: " Sol Ön ",
      vehicleId: " vehicle-1 ",
    })).toEqual({ tirePosition: "Sol Ön", vehicleId: "vehicle-1" });
    expect(() => assertVehicleTirePositionAvailable({
      activeTireRecordId: "tire-1",
      tirePosition: "Sol Ön",
      vehicleId: "vehicle-1",
    })).toThrow(expect.objectContaining({ code: "ACTIVE_POSITION_EXISTS" }));
  });

  it("rejects regressing odometer readings", () => {
    expect(() => assertVehicleTireOdometerNotRegressed({
      entryOdometerKm: 100,
      lastPositionOdometerKm: 140,
      nextOdometerKm: 139,
    })).toThrow(expect.objectContaining({ code: "INVALID_ODOMETER" }));
    expect(assertVehicleTireOdometerNotRegressed({
      entryOdometerKm: 100,
      lastPositionOdometerKm: 140,
      nextOdometerKm: 140,
    })).toBe(140);
  });

  it("allows only the active to removed lifecycle", () => {
    expect(canTransitionVehicleTireStatus("ACTIVE", "REMOVED")).toBe(true);
    expect(canTransitionVehicleTireStatus("REMOVED", "ACTIVE")).toBe(false);
    expect(() => assertVehicleTireTransition(false)).toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });

  it("keeps list access open and rejects viewer or closed-period mutations", () => {
    expect(getVehicleTireOperationPermission({ operation: "list", role: "viewer" })).toEqual({ allowed: true });
    expect(getVehicleTireOperationPermission({ operation: "create", role: "viewer" })).toEqual({
      allowed: false,
      reason: "Lastik operasyon kaydı için muhasebe veya yönetici yetkisi gereklidir.",
    });
    expect(getVehicleTireOperationPermission({ operation: "transition", periodClosed: true, role: "admin" })).toEqual({
      allowed: false,
      reason: "Kapalı dönemde lastik operasyon kaydı değiştirilemez.",
    });
    expect(getVehicleTireOperationPermission({ operation: "create", role: "accounting" })).toEqual({ allowed: true });
  });

  it("normalizes whitespace and rejects impossible calendar dates", () => {
    expect(normalizeVehicleTireText("  Dört\n\tMevsim ")).toBe("Dört Mevsim");
    expect(normalizeVehicleTireDate("2024-02-29", "Tarih")).toBe("2024-02-29");
    expect(() => normalizeVehicleTireDate("2025-02-29", "Tarih"))
      .toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });
});
