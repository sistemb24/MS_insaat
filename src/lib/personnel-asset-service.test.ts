import { describe, expect, test, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import { createPersonnelAssetService, createSeededPersonnelAssetMemoryRepository } from "./personnel-asset-service";
import { defaultTenantScope } from "./tenant-scope";

const values = {
  assetCategory: "KKD",
  assetCode: "KKD-BASLIK-001",
  assetName: "Koruyucu Başlık",
  assignedAt: "2026-07-14",
  dueAt: "2027-07-14",
  personnelCode: "PER-0001",
  personnelName: "Ali Usta",
  quantity: 1,
  serialNo: "SN-001",
  siteCode: "SANT-0001",
  siteName: "Merkez Şantiyesi",
};

describe("personnel asset service", () => {
  test("assigns and returns an asset with scoped audit history", async () => {
    const record = vi.fn<AuditLogRepository["record"]>();
    let now = "2026-07-14T10:00:00.000Z";
    const service = createPersonnelAssetService({ auditLogRepository: { record }, now: () => now, repository: createSeededPersonnelAssetMemoryRepository() });
    const assigned = await service.create({ scope: defaultTenantScope, values });
    expect(assigned).toEqual({ ok: true, data: expect.objectContaining({ assetCode: values.assetCode, personnelCode: values.personnelCode, status: "Zimmetli" }) });
    if (!assigned.ok) throw new Error(assigned.errors.join(", "));
    now = "2026-07-15T09:00:00.000Z";
    await expect(service.returnAsset({ id: assigned.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: true, data: expect.objectContaining({ returnedAt: "2026-07-15", status: "İade Edildi" }) });
    expect(record.mock.calls.map(([entry]) => entry.action)).toEqual(["personnel-asset.assign", "personnel-asset.return"]);
  });

  test("prevents the same physical asset from being assigned twice while active", async () => {
    const service = createPersonnelAssetService({ now: () => "2026-07-14T10:00:00.000Z", repository: createSeededPersonnelAssetMemoryRepository() });
    await service.create({ scope: defaultTenantScope, values });
    await expect(service.create({ scope: defaultTenantScope, values: { ...values, personnelCode: "PER-0002", personnelName: "Veli Usta" } })).resolves.toEqual({ ok: false, errors: ["Varlık zaten aktif olarak zimmetli: KKD-BASLIK-001 / SN-001"] });
  });

  test("rejects invalid dates, quantities and viewer mutations", async () => {
    const service = createPersonnelAssetService({ now: () => "2026-07-14T10:00:00.000Z", repository: createSeededPersonnelAssetMemoryRepository() });
    const invalid = await service.create({ scope: defaultTenantScope, values: { ...values, dueAt: "2026-07-01", quantity: 0 } });
    expect(invalid).toEqual({ ok: false, errors: ["Miktar 0'dan büyük olmalıdır.", "İade hedef tarihi zimmet tarihinden önce olamaz."] });
    const viewer = await service.create({ scope: { ...defaultTenantScope, userRole: "viewer" }, values });
    expect(viewer).toEqual({ ok: false, errors: ["Zimmet işlemi için muhasebe veya yönetici yetkisi gereklidir."] });
  });
});
