import { describe, expect, test, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import {
  createDeliveryNoteService,
  createSeededDeliveryNoteMemoryRepository,
} from "./delivery-note-service";
import { defaultTenantScope } from "./tenant-scope";

const values = {
  deliveryDate: "2026-07-14",
  documentNo: "IRS-0001",
  lines: [{ quantity: 25, stockCode: "STK-0001", stockName: "Çimento", unit: "Adet", warehouse: "Merkez Depo" }],
  linkedPurchaseInvoiceDocumentNo: "FAT-0001",
  linkedPurchaseInvoiceId: "invoice-1",
  siteCode: "SANT-0001",
  siteName: "Merkez Şantiyesi",
  supplierCode: "TED-0001",
  supplierName: "Örnek Tedarikçi",
};

describe("delivery note service", () => {
  test("creates, posts and cancels a scoped delivery note with audit", async () => {
    const record = vi.fn<AuditLogRepository["record"]>();
    let now = "2026-07-14T10:00:00.000Z";
    const service = createDeliveryNoteService({ auditLogRepository: { record }, now: () => now, repository: createSeededDeliveryNoteMemoryRepository() });
    const created = await service.create({ scope: defaultTenantScope, values });
    expect(created).toEqual({ ok: true, data: expect.objectContaining({ documentNo: "IRS-0001", status: "Taslak", totalQuantity: 25 }) });
    if (!created.ok) throw new Error(created.errors.join(", "));

    now = "2026-07-14T11:00:00.000Z";
    await expect(service.post({ id: created.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: true, data: expect.objectContaining({ status: "Kaydedildi" }) });
    now = "2026-07-14T12:00:00.000Z";
    await expect(service.cancel({ id: created.data.id, scope: defaultTenantScope })).resolves.toEqual({ ok: true, data: expect.objectContaining({ status: "İptal" }) });
    expect(record.mock.calls.map(([entry]) => entry.action)).toEqual(["delivery-note.create", "delivery-note.post", "delivery-note.cancel"]);
  });

  test("requires supplier, site, warehouse and positive quantities", async () => {
    const service = createDeliveryNoteService({ now: () => "2026-07-14T10:00:00.000Z", repository: createSeededDeliveryNoteMemoryRepository() });
    const result = await service.create({
      scope: defaultTenantScope,
      values: { ...values, lines: [{ ...values.lines[0], quantity: 0, warehouse: "" }], siteCode: "", siteName: "", supplierCode: "", supplierName: "" },
    });
    expect(result).toEqual({
      ok: false,
      errors: ["Tedarikçi zorunludur.", "Şantiye zorunludur.", "1. satır depo zorunludur.", "1. satır miktarı 0'dan büyük olmalıdır."],
    });
  });

  test("isolates delivery notes by tenant/company/period", async () => {
    const service = createDeliveryNoteService({ now: () => "2026-07-14T10:00:00.000Z", repository: createSeededDeliveryNoteMemoryRepository() });
    await service.create({ scope: defaultTenantScope, values });
    await expect(service.list({ scope: { ...defaultTenantScope, periodId: "period-other" } })).resolves.toEqual({ ok: true, data: { rows: [] } });
  });
});
