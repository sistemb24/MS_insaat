/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { EntityRow } from "@/lib/entities";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { StockMovementRow } from "@/lib/stock-movement-service";
import { StockMovementSurface } from "./stock-movement-surface";

afterEach(cleanup);

const invoice = {
  counterpartyName: "ABC Beton",
  documentNo: "FAT-1",
  id: "invoice-1",
  invoiceDate: "2026-07-01",
  lines: [{ discountRate1: 0, discountRate2: 0, quantity: 100, stockCode: "STK-1", stockName: "Çimento", unit: "Adet", unitPrice: 100, vatRate: 20, warehouse: "Merkez Depo" }],
  siteName: "Merkez Şantiyesi",
  status: "Kaydedildi",
} as PurchaseInvoiceRow;
const stockCard = { code: "STK-1", defaultWarehouse: "Merkez Depo", name: "Çimento", status: "Aktif", unit: "Adet" } as EntityRow;
const draftRow = {
  companyId: "company-1",
  createdAt: "2026-07-14T10:00:00.000Z",
  createdBy: "user-1",
  documentNo: "STR-1",
  id: "movement-1",
  movementDate: "2026-07-14",
  movementType: "Depo Transferi",
  periodId: "period-1",
  quantity: 20,
  sourceWarehouse: "Merkez Depo",
  status: "Taslak",
  stockCode: "STK-1",
  stockName: "Çimento",
  targetWarehouse: "Şantiye Depo",
  tenantId: "tenant-1",
  unit: "Adet",
  unitCost: 100,
  updatedAt: "2026-07-14T10:00:00.000Z",
  updatedBy: "user-1",
} as StockMovementRow;

function persistence() {
  return {
    cancel: vi.fn(async () => ({ data: { ...draftRow, status: "İptal" as const }, ok: true as const })),
    create: vi.fn(async () => ({ data: draftRow, ok: true as const })),
    post: vi.fn(async () => ({ data: { ...draftRow, status: "Kaydedildi" as const }, ok: true as const })),
  };
}

describe("StockMovementSurface", () => {
  test("creates a transfer from current warehouse availability", async () => {
    const store = persistence();
    render(<StockMovementSurface canMutate deliveryNotes={[]} persistence={store} purchaseInvoices={[invoice]} rows={[]} siteRows={[]} stockCardRows={[stockCard]} />);
    fireEvent.click(screen.getByRole("button", { name: "Yeni Transfer" }));
    fireEvent.change(screen.getByLabelText("Stok Kartı"), { target: { value: "STK-1" } });
    fireEvent.change(screen.getByLabelText("Hareket No"), { target: { value: "STR-1" } });
    fireEvent.change(screen.getByLabelText("Hedef Depo"), { target: { value: "Şantiye Depo" } });
    fireEvent.change(screen.getByLabelText("Miktar"), { target: { value: "20" } });
    expect(screen.getByText("Kullanılabilir: 100 Adet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Taslak Oluştur" }));
    await waitFor(() => expect(store.create).toHaveBeenCalledWith(expect.objectContaining({ documentNo: "STR-1", quantity: 20, sourceWarehouse: "Merkez Depo", stockCode: "STK-1", targetWarehouse: "Şantiye Depo", unitCost: 100 })));
  });

  test("posts a draft movement into warehouse balances", async () => {
    const store = persistence();
    render(<StockMovementSurface canMutate deliveryNotes={[]} persistence={store} purchaseInvoices={[invoice]} rows={[draftRow]} siteRows={[]} stockCardRows={[stockCard]} />);
    fireEvent.click(screen.getByRole("button", { name: "Kesinleştir STR-1" }));
    await waitFor(() => expect(store.post).toHaveBeenCalledWith("movement-1"));
    expect(await screen.findByText("Stok hareketi kesinleşti ve bakiyelere yansıdı.")).toBeTruthy();
  });
});
