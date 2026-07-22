/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type {
  StockMinimumSettingRow,
} from "@/lib/stock-minimum-setting-service";

import { StockDepotSurface } from "./stock-depot-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("StockDepotSurface", () => {
  test("renders stock depot summary from posted purchase invoice lines", () => {
    render(<StockDepotSurface purchaseInvoices={[createPostedInvoice()]} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Stok ve Depo Yönetimi" }),
    ).toBeTruthy();
    expect(screen.getByText("Minimum Altı")).toBeTruthy();
    expect(screen.getByText("Depo Stok Özeti")).toBeTruthy();
    expect(screen.getByText("Depo Hareketleri")).toBeTruthy();
    expect(screen.getAllByText("Merkez Depo")).toHaveLength(3);
    expect(screen.getAllByText("Çimento Torba")).toHaveLength(2);
    expect(screen.getAllByText("100 Adet")).toHaveLength(3);
    expect(screen.getAllByText("13.500,00 TL")).toHaveLength(3);
    expect(screen.getByText("FAT-1001")).toBeTruthy();
  });

  test("filters stock depot rows by warehouse and search text", () => {
    render(
      <StockDepotSurface
        purchaseInvoices={[createPostedInvoice(), createPostedInvoiceTwo()]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Depo filtresi"), {
      target: { value: "Merkez Depo" },
    });
    fireEvent.change(screen.getByLabelText("Stok veya evrak ara"), {
      target: { value: "Çimento" },
    });

    expect(screen.getAllByText("Merkez Depo")).toHaveLength(3);
    expect(screen.getAllByText("Çimento Torba")).toHaveLength(2);
    expect(screen.queryByText("Demir Çubuk")).toBeNull();
    expect(screen.queryByText("FAT-1002")).toBeNull();
  });

  test("filters stock depot rows by invoice date range", () => {
    render(
      <StockDepotSurface
        purchaseInvoices={[createPostedInvoice(), createPostedInvoiceTwo()]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), {
      target: { value: "2026-07-31" },
    });

    expect(screen.getAllByText("Demir Çubuk")).toHaveLength(2);
    expect(screen.getByText("FAT-1002")).toBeTruthy();
    expect(screen.getAllByText("2.000 Kg")).toHaveLength(3);
    expect(screen.getAllByText("24.000,00 TL")).toHaveLength(3);
    expect(screen.queryByText("Çimento Torba")).toBeNull();
    expect(screen.queryByText("FAT-1001")).toBeNull();
  });


  test("exports filtered stock depot summary and movement rows as csv", () => {
    render(
      <StockDepotSurface
        purchaseInvoices={[createPostedInvoice(), createPostedInvoiceTwo()]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Depo filtresi"), {
      target: { value: "Şantiye Depo" },
    });

    const summaryCsvLink = screen.getByRole("link", {
      name: "Depo stok özeti CSV indir",
    });
    const movementCsvLink = screen.getByRole("link", {
      name: "Depo girişleri CSV indir",
    });

    expect(summaryCsvLink.getAttribute("download")).toBe(
      "stok-depo-ozet.csv",
    );
    expect(decodeURIComponent(summaryCsvLink.getAttribute("href") ?? ""))
      .toContain("Demir Çubuk");
    expect(decodeURIComponent(summaryCsvLink.getAttribute("href") ?? ""))
      .not.toContain("Çimento Torba");
    expect(movementCsvLink.getAttribute("download")).toBe(
      "stok-depo-hareketleri.csv",
    );
    expect(decodeURIComponent(movementCsvLink.getAttribute("href") ?? ""))
      .toContain("FAT-1002");
    expect(decodeURIComponent(movementCsvLink.getAttribute("href") ?? ""))
      .not.toContain("FAT-1001");
  });

  test("prints the filtered stock depot movement scope", () => {
    const print = vi.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <StockDepotSurface
        purchaseInvoices={[createPostedInvoice(), createPostedInvoiceTwo()]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), {
      target: { value: "2026-07-31" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Depo Girişlerini Yazdır" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Yazdırma kapsamı hazır: 1 depo girişi.",
    );
  });

  test("persists a minimum stock setting from the summary row", async () => {
    const saveMinimumSetting = vi.fn(
      async () => ({
        ok: true as const,
        data: { row: createMinimumSetting() },
      }),
    );

    render(
      <StockDepotSurface
        persistence={{ saveMinimumSetting }}
        purchaseInvoices={[createPostedInvoice()]}
        stockMinimumSettings={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("STK-0001 minimum miktar"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Minimumu Kaydet" }));

    expect(saveMinimumSetting).toHaveBeenCalledWith({
      minimumQuantity: 120,
      stockCode: "STK-0001",
      stockName: "Çimento Torba",
      unit: "Adet",
      warehouse: "Merkez Depo",
    });
    expect((await screen.findByRole("status")).textContent).toContain(
      "Minimum stok ayarı kaydedildi.",
    );
  });

  test("uses stock card minimum quantity as the summary row default", () => {
    render(
      <StockDepotSurface
        purchaseInvoices={[createPostedInvoice()]}
        stockCardRows={[
          {
            code: "STK-0001",
            defaultWarehouse: "Merkez Depo",
            minimumQuantity: "120",
            name: "Çimento Torba",
            status: "Aktif",
            unit: "Adet",
          },
        ]}
        stockMinimumSettings={[]}
      />,
    );

    expect(screen.getByLabelText("STK-0001 minimum miktar")).toHaveProperty(
      "value",
      "120",
    );
  });
});

function createPostedInvoice(): PurchaseInvoiceRow {
  return {
    id: "invoice-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    createdBy: "user-main",
    updatedBy: "user-main",
    createdAt: "2026-06-27T09:00:00.000Z",
    updatedAt: "2026-06-27T09:00:00.000Z",
    counterpartyCode: "TED-0001",
    counterpartyName: "ÖRNEK TEDARİKÇİ",
    currency: "TL",
    description: "",
    discountTotal: 1500,
    documentNo: "FAT-1001",
    dueDate: "2026-07-27",
    exchangeRate: 1,
    grandTotal: 16200,
    invoiceDate: "2026-06-27",
    isOfficial: false,
    lineCount: 1,
    movementGroup: "Malzeme Alımı",
    netTotal: 13500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Kaydedildi",
    subtotal: 15000,
    vatTotal: 2700,
    withholdingTotal: 0,
    lines: [
      {
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Adet",
        description: "50kg Portland",
        warehouse: "Merkez Depo",
        quantity: 100,
        unitPrice: 150,
        discountRate1: 10,
        discountRate2: 0,
        vatRate: 20,
      },
    ],
  };
}

function createPostedInvoiceTwo(): PurchaseInvoiceRow {
  return {
    ...createPostedInvoice(),
    id: "invoice-2",
    documentNo: "FAT-1002",
    invoiceDate: "2026-07-05",
    lineCount: 1,
    netTotal: 24000,
    grandTotal: 28800,
    subtotal: 24000,
    vatTotal: 4800,
    lines: [
      {
        stockCode: "STK-0002",
        stockName: "Demir Çubuk",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Kg",
        description: "12mm nervürlü",
        warehouse: "Şantiye Depo",
        quantity: 2000,
        unitPrice: 12,
        discountRate1: 0,
        discountRate2: 0,
        vatRate: 20,
      },
    ],
  };
}

function createMinimumSetting(): StockMinimumSettingRow {
  return {
    companyId: "company-demo-insaat",
    createdAt: "2026-07-02T09:00:00.000Z",
    id: "tenant-noa-demo::company-demo-insaat::period-2026::stock-minimum::merkez-depo::stk-0001",
    isActive: true,
    minimumQuantity: 120,
    periodId: "period-2026",
    stockCode: "STK-0001",
    stockName: "Çimento Torba",
    tenantId: "tenant-noa-demo",
    unit: "Adet",
    updatedAt: "2026-07-02T09:00:00.000Z",
    updatedBy: "user-main",
    warehouse: "Merkez Depo",
  };
}
