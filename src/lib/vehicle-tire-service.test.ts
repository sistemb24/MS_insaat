import { describe, expect, it, vi } from "vitest";

import { createVehicleTireService } from "./vehicle-tire-service";
import type { VehicleTireRecordRow, VehicleTireRepository } from "./vehicle-tire-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const now = "2026-07-29T12:00:00.000Z";

function setup(records: VehicleTireRecordRow[] = []) {
  const repository: VehicleTireRepository = {
    createTireRecord: vi.fn(async (row) => row),
    listTireRecords: vi.fn(async () => records),
    updateTireRecord: vi.fn(async (row) => row),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = createVehicleTireService({ auditLogRepository: audit, createId: ({ stableKey }) => `tire::${stableKey}`, now: () => now, repository });
  return { audit, repository, service };
}

describe("vehicle tire service", () => {
  it("creates a scoped tire mount with metadata-only audit", async () => {
    const { audit, repository, service } = setup();
    const result = await service.createMount({ entryOdometerKm: 100, scope: defaultTenantScope, values: mountValues() });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(repository.createTireRecord).toHaveBeenCalledWith(expect.objectContaining({ status: "ACTIVE", vehicleId: "vehicle-1" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-tire.mount.create", metadata: { mountedOdometerKm: 120500, mountedOn: "2026-07-29", statusTo: "ACTIVE", tirePosition: "Sol Ön", vehicleId: "vehicle-1" } }));
    expect(JSON.stringify((audit.record.mock.calls as unknown as Array<[unknown]>)[0][0])).not.toContain("315/80");
  });

  it("keeps mount retries idempotent and rejects an active vehicle position", async () => {
    const existing = tireRow();
    const { repository, service } = setup([existing]);
    await expect(service.createMount({ scope: defaultTenantScope, values: mountValues() })).resolves.toEqual({ data: { idempotent: true, row: existing }, ok: true });
    expect(repository.createTireRecord).not.toHaveBeenCalled();
    const conflict = await service.createMount({ scope: defaultTenantScope, values: { ...mountValues(), brandModel: "Yeni Model", mountedOn: "2026-07-30" } });
    expect(conflict).toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects viewer and closed-period mutations before repository writes", async () => {
    const { repository, service } = setup();
    const result = await service.createMount({ scope: { ...defaultTenantScope, userRole: "viewer" }, values: mountValues() });
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(repository.listTireRecords).not.toHaveBeenCalled();
    expect(repository.createTireRecord).not.toHaveBeenCalled();
  });

  it("removes an active tire once and makes terminal retries idempotent", async () => {
    const active = tireRow();
    const { audit, repository, service } = setup([active]);
    const result = await service.removeTireRecord({ id: active.id, removedOdometerKm: 130000, removedOn: "2026-11-29", scope: defaultTenantScope });
    expect(result).toEqual(expect.objectContaining({ data: { idempotent: false, row: expect.objectContaining({ status: "REMOVED", removedOn: "2026-11-29" }) }, ok: true }));
    expect(repository.updateTireRecord).toHaveBeenCalledWith(expect.objectContaining({ id: active.id, status: "REMOVED" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-tire.mount.remove", metadata: expect.not.objectContaining({ brandModel: expect.anything() }) }));

    const removed = { ...active, removedOn: "2026-11-29", removedOdometerKm: 130000, status: "REMOVED" as const };
    const retry = setup([removed]);
    await expect(retry.service.removeTireRecord({ id: removed.id, removedOdometerKm: 130000, removedOn: "2026-11-29", scope: defaultTenantScope })).resolves.toEqual({ data: { idempotent: true, row: removed }, ok: true });
    expect(retry.repository.updateTireRecord).not.toHaveBeenCalled();
    expect(retry.audit.record).not.toHaveBeenCalled();
  });
});

function mountValues() { return { brandModel: "315/80 R22.5 X Multi", mountedOdometerKm: 120500, mountedOn: "2026-07-29", season: "SUMMER" as const, tirePosition: "Sol Ön", treadWearPercent: 12, vehicleId: "vehicle-1" }; }
function tireRow(values: Partial<VehicleTireRecordRow> = {}): VehicleTireRecordRow { return { id: "tire-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId, vehicleId: "vehicle-1", mountKey: "vehicle-1::sol ön::2026-07-29::315/80 r22.5 x multi", tirePosition: "Sol Ön", season: "SUMMER", brandModel: "315/80 R22.5 X Multi", treadWearPercent: 12, mountedOn: "2026-07-29", mountedOdometerKm: 120500, status: "ACTIVE", removedOn: null, removedOdometerKm: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now, updatedAt: now, ...values }; }
