import { describe, expect, test } from "vitest";

import type { AuditLogEntry } from "./audit-log";
import {
  buildVehicleAuditCsv,
  buildVehicleAuditCsvFileName,
  buildVehicleAuditCsvHref,
  formatVehicleAuditAction,
  getVehicleAuditChanges,
} from "./vehicle-audit-export";

const auditEntry: AuditLogEntry = {
  action: "vehicle.update",
  actorUserId: 'user-"admin"',
  companyId: "company-demo-insaat",
  createdAt: "2026-07-10T06:15:00.000Z",
  entityId: "vehicle-34-noa-303",
  entityLabel: "34;NOA 303",
  entityType: "vehicle",
  id: "audit-vehicle-update-303",
  metadata: {
    changedFields: [
      "acquisitionDate",
      "dispositionDate",
      "insuranceEndDate",
      "inspectionEndDate",
      "maintenanceDueDate",
      "registrationDate",
      "driverName",
      "fuelType",
      "chassisNumber",
      "engineNumber",
      "entryOdometerKm",
      "siteName",
    ],
    status: "Aktif",
  },
  occurredAt: "2026-07-10T06:15:00.000Z",
  periodId: "period-2026",
  tenantId: "tenant-noa-demo",
};

describe("vehicle audit export helpers", () => {
  test("keeps unknown vehicle audit actions and empty change payloads visible", () => {
    expect(formatVehicleAuditAction("vehicle.transfer")).toBe(
      "vehicle.transfer",
    );
    expect(getVehicleAuditChanges({})).toBe("-");
  });

  test("builds a semicolon separated csv with presentation labels and escaping", () => {
    expect(buildVehicleAuditCsv([auditEntry])).toBe(
      [
        "Zaman;Plaka;İşlem;Son Durum;Değişiklikler;Kullanıcı",
        '2026-07-10T06:15:00.000Z;"34;NOA 303";Güncellendi;Aktif;Alındığı/kiralandığı tarih, Satıldığı/iade tarihi, Sigorta bitiş tarihi, Muayene bitiş tarihi, Bakım tarihi, Tescil tarihi, Sürücü, Yakıt türü, Şase no, Motor no, Giriş KM, Şantiye;"user-""admin"""',
      ].join("\r\n"),
    );
  });

  test("exposes an Excel-friendly csv href and stable file name", () => {
    expect(buildVehicleAuditCsvFileName()).toBe("arac-islem-gecmisi.csv");
    expect(decodeURIComponent(buildVehicleAuditCsvHref([auditEntry]))).toBe(
      `data:text/csv;charset=utf-8,\uFEFF${buildVehicleAuditCsv([auditEntry])}`,
    );
  });
});
