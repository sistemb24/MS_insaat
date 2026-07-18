/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { DeliveryNoteRow } from "@/lib/delivery-note-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import { DeliveryNoteSurface } from "./delivery-note-surface";

afterEach(cleanup);

const invoice = {
  counterpartyCode: "TED-0001",
  counterpartyName: "ÖRNEK TEDARİKÇİ",
  documentNo: "FAT-0001",
  id: "invoice-1",
  lines: [{ quantity: 10, stockCode: "STK-0001", stockName: "Çimento", unit: "Adet", warehouse: "Merkez Depo" }],
  siteCode: "SANT-0001",
  siteName: "MERKEZ ŞANTİYESİ",
  status: "Kaydedildi",
} as PurchaseInvoiceRow;

const createdRow = {
  companyId: "company-1",
  createdAt: "2026-07-14T10:00:00.000Z",
  createdBy: "user-1",
  deliveryDate: "2026-07-14",
  documentNo: "IRS-0001",
  id: "delivery-note-1",
  lineCount: 1,
  lines: invoice.lines,
  linkedPurchaseInvoiceDocumentNo: invoice.documentNo,
  linkedPurchaseInvoiceId: invoice.id,
  periodId: "period-1",
  siteCode: invoice.siteCode,
  siteName: invoice.siteName,
  status: "Taslak",
  supplierCode: invoice.counterpartyCode,
  supplierName: invoice.counterpartyName,
  tenantId: "tenant-1",
  totalQuantity: 10,
  updatedAt: "2026-07-14T10:00:00.000Z",
  updatedBy: "user-1",
} as DeliveryNoteRow;

function persistence() {
  return {
    cancelNote: vi.fn(async () => ({ data: { ...createdRow, status: "İptal" as const }, ok: true as const })),
    createNote: vi.fn(async () => ({ data: createdRow, ok: true as const })),
    postNote: vi.fn(async () => ({ data: { ...createdRow, status: "Kaydedildi" as const }, ok: true as const })),
    updateNote: vi.fn(async () => ({ data: createdRow, ok: true as const })),
  };
}

describe("DeliveryNoteSurface", () => {
  test("prefills an incoming delivery note from its purchase invoice and saves it", async () => {
    const store = persistence();
    render(
      <DeliveryNoteSurface
        canMutate
        persistence={store}
        purchaseInvoices={[invoice]}
        rows={[]}
        sites={[{ code: invoice.siteCode, name: invoice.siteName }]}
        stockCards={[]}
        suppliers={[{ code: invoice.counterpartyCode, name: invoice.counterpartyName }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Yeni İrsaliye" }));
    fireEvent.change(screen.getByLabelText("Bağlı Alış Faturası"), { target: { value: invoice.id } });
    fireEvent.change(screen.getByLabelText("İrsaliye No"), { target: { value: "IRS-0001" } });

    expect((screen.getByLabelText("Tedarikçi") as HTMLSelectElement).value).toBe("TED-0001");
    expect((screen.getByLabelText("Şantiye") as HTMLSelectElement).value).toBe("SANT-0001");
    expect((screen.getByLabelText("Stok/Hizmet satır 1") as HTMLInputElement).value).toBe("Çimento");
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(store.createNote).toHaveBeenCalledWith(expect.objectContaining({
      documentNo: "IRS-0001",
      linkedPurchaseInvoiceId: "invoice-1",
      supplierCode: "TED-0001",
    })));
    expect(await screen.findByText("Alış irsaliyesi taslak olarak kaydedildi.")).toBeTruthy();
  });

  test("posts a draft delivery note into warehouse movement lifecycle", async () => {
    const store = persistence();
    render(<DeliveryNoteSurface canMutate persistence={store} purchaseInvoices={[invoice]} rows={[createdRow]} sites={[]} stockCards={[]} suppliers={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Kesinleştir IRS-0001" }));
    await waitFor(() => expect(store.postNote).toHaveBeenCalledWith("delivery-note-1"));
    expect(await screen.findByText("İrsaliye kesinleşti ve depo girişine yansıdı.")).toBeTruthy();
  });
});
