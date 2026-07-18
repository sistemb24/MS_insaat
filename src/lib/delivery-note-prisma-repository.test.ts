import { describe, expect, test } from "vitest";

import { createDeliveryNotePrismaRepository } from "./delivery-note-prisma-repository";
import type { DeliveryNoteRow } from "./delivery-note-service";
import { defaultTenantScope } from "./tenant-scope";

const row: DeliveryNoteRow = {
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-14T10:00:00.000Z",
  createdBy: defaultTenantScope.userId,
  deliveryDate: "2026-07-14",
  description: "E2E mal kabulü",
  documentNo: "IRS-E2E-0714",
  id: "delivery-note-1",
  lineCount: 1,
  lines: [
    {
      quantity: 100,
      stockCode: "STK-E2E-0714",
      stockName: "E2E PORTLAND ÇİMENTO 50KG",
      unit: "Torba",
      warehouse: "Merkez Depo",
    },
  ],
  linkedPurchaseInvoiceDocumentNo: "AF-E2E-0714",
  linkedPurchaseInvoiceId: "purchase-invoice-1",
  periodId: defaultTenantScope.periodId,
  siteCode: "SANT-E2E-0714",
  siteName: "E2E KONUT PROJESİ 14 TEMMUZ",
  status: "Kaydedildi",
  supplierCode: "TED-E2E-0714",
  supplierName: "E2E YAPI MALZEMELERİ LTD",
  tenantId: defaultTenantScope.tenantId,
  totalQuantity: 100,
  updatedAt: "2026-07-14T11:00:00.000Z",
  updatedBy: defaultTenantScope.userId,
};

describe("delivery note prisma repository", () => {
  test("deletes existing lines before recreating the same line numbers", async () => {
    const repository = createDeliveryNotePrismaRepository({
      deliveryNote: {
        async create() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
        async update(input) {
          expect(Object.keys(input.data.lines)).toEqual([
            "deleteMany",
            "createMany",
          ]);

          return {
            ...row,
            createdAt: new Date(row.createdAt),
            deliveryDate: new Date(`${row.deliveryDate}T00:00:00.000Z`),
            description: row.description ?? null,
            linkedPurchaseInvoiceDocumentNo:
              row.linkedPurchaseInvoiceDocumentNo ?? null,
            linkedPurchaseInvoiceId: row.linkedPurchaseInvoiceId ?? null,
            updatedAt: new Date(row.updatedAt),
            lines: input.data.lines.createMany.data,
          };
        },
      },
    });

    await expect(repository.update(row)).resolves.toEqual(row);
  });
});
