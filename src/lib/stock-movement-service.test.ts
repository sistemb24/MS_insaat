import { describe, expect, test, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import { createSeededStockMovementMemoryRepository, createStockMovementService } from "./stock-movement-service";
import { defaultTenantScope } from "./tenant-scope";

const transfer = {
  documentNo: "STR-0001",
  movementDate: "2026-07-14",
  movementType: "Depo Transferi" as const,
  quantity: 30,
  sourceWarehouse: "Merkez Depo",
  stockCode: "STK-0001",
  stockName: "Çimento",
  targetWarehouse: "Şantiye Depo",
  unit: "Adet",
  unitCost: 100,
};

describe("stock movement service", () => {
  test("posts and cancels a warehouse transfer only when both inventory guards pass", async () => {
    const record = vi.fn<AuditLogRepository["record"]>();
    const availability = vi.fn(async ({ warehouse }: { warehouse: string }) => warehouse === "Merkez Depo" ? 100 : 30);
    const service = createStockMovementService({ auditLogRepository: { record }, availability, now: () => "2026-07-14T10:00:00.000Z", repository: createSeededStockMovementMemoryRepository() });
    const created = await service.create({ scope: defaultTenantScope, values: transfer });
    expect(created).toEqual({ ok: true, data: expect.objectContaining({ status: "Taslak" }) });
    if (!created.ok) throw new Error(created.errors.join(", "));
    await expect(service.post({ id: created.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: true, data: expect.objectContaining({ status: "Kaydedildi" }) });
    await expect(service.cancel({ id: created.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: true, data: expect.objectContaining({ status: "İptal" }) });
    expect(availability).toHaveBeenCalledTimes(2);
    expect(record.mock.calls.map(([entry]) => entry.action)).toEqual(["stock-movement.create", "stock-movement.post", "stock-movement.cancel"]);
  });

  test("rejects posting when source inventory is insufficient", async () => {
    const service = createStockMovementService({ availability: async () => 10, now: () => "2026-07-14T10:00:00.000Z", repository: createSeededStockMovementMemoryRepository() });
    const created = await service.create({ scope: defaultTenantScope, values: transfer });
    if (!created.ok) throw new Error(created.errors.join(", "));
    await expect(service.post({ id: created.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: false, errors: ["Yetersiz stok: Merkez Depo deposunda 10 Adet kullanılabilir."] });
  });

  test("validates transfer warehouses and site issue target", async () => {
    const service = createStockMovementService({ now: () => "2026-07-14T10:00:00.000Z", repository: createSeededStockMovementMemoryRepository() });
    await expect(service.create({ scope: defaultTenantScope, values: { ...transfer, targetWarehouse: "Merkez Depo" } })).resolves.toEqual({ ok: false, errors: ["Kaynak ve hedef depo farklı olmalıdır."] });
    await expect(service.create({ scope: defaultTenantScope, values: { ...transfer, documentNo: "SC-0001", movementType: "Şantiye Çıkışı", siteCode: "", siteName: "", targetWarehouse: "" } })).resolves.toEqual({ ok: false, errors: ["Şantiye çıkışı için şantiye zorunludur."] });
  });
});
