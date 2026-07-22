/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { PurchaseInvoiceSurface } from "./purchase-invoice-surface";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
  getP0DefaultVatRateInputValue,
} from "@/lib/settings-contract";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

const invoice: PurchaseInvoiceRow = {
  id: "invoice-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  documentNo: "FAT-0006",
  invoiceDate: "2026-06-23",
  dueDate: "2026-07-23",
  counterpartyCode: "TED-0001",
  counterpartyName: "ÖRNEK TEDARİKÇİ",
  siteCode: "SANT-0001",
  siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
  currency: "TL",
  exchangeRate: 1,
  movementGroup: "",
  isOfficial: false,
  description: "",
  lines: [
    {
      stockCode: "STK-0001",
      stockName: "Çimento Torba",
      siteName: "",
      unit: "Adet",
      description: "",
      warehouse: "",
      quantity: 100,
      unitPrice: 150,
      discountRate1: 10,
      discountRate2: 0,
      vatRate: 20,
    },
  ],
  status: "Taslak",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-06-25T10:00:00.000Z",
  updatedAt: "2026-06-25T10:00:00.000Z",
  subtotal: 15000,
  discountTotal: 1500,
  netTotal: 13500,
  vatTotal: 2700,
  withholdingTotal: 0,
  grandTotal: 16200,
  lineCount: 1,
};

describe("PurchaseInvoiceSurface", () => {
  test("renders purchase invoice workflow with totals and table columns", () => {
    render(<PurchaseInvoiceSurface rows={[invoice]} />);

    expect(
      screen.getByRole("table", { name: "Alış Faturası hareket listesi" }),
    ).toBeTruthy();    expect(screen.getByRole("heading", { name: "Faturalar" })).toBeTruthy();
    expect(screen.getByText("Alış Faturası")).toBeTruthy();
    expect(
      screen.getByText(/153 Ticari Mallar ve 191 İndirilecek KDV borç/),
    ).toBeTruthy();
    expect(
      screen.getByText(/ters kayıt akışı uygulanmadan iptal edilemez/),
    ).toBeTruthy();
    expect(screen.getByText("Evrak No")).toBeTruthy();
    expect(screen.getByText("Tedarikçi")).toBeTruthy();
    expect(screen.getByText("Şantiye")).toBeTruthy();
    expect(screen.getByText("FAT-0006")).toBeTruthy();
    expect(screen.getByText("ÖRNEK TEDARİKÇİ")).toBeTruthy();
    expect(screen.getByText("ŞİRKET MERKEZ ŞANTİYESİ")).toBeTruthy();
    expect(screen.getAllByText("16.200,00 TL")).toHaveLength(2);
  });

  test("prints the visible purchase invoice movement list scope", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<PurchaseInvoiceSurface rows={[invoice]} />);

    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdırma kapsamı hazır: 1 fatura.",
    );
  });

  test("opens a printable PDF preview and keeps soft-delete guidance", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<PurchaseInvoiceSurface rows={[invoice]} />);

    fireEvent.click(screen.getByRole("button", { name: "PDF Önizleme" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Alış Faturası PDF önizlemesi hazırlandı.",
    );
    expect(
      screen.getByRole("dialog", { name: "Alış Faturası PDF önizleme" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Alış Faturası döküm tablosu" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Kapat" }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Alış Faturası PDF önizleme" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Fatura silme fiziksel silme değildir; ilgili satırdaki İptal Et aksiyonunu kullanın.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Fatura listesi server render ve revalidate akışıyla güncellenir.",
    );
  });

  test("renders sales invoice labels and customer lookup", () => {
    render(
      <PurchaseInvoiceSurface
        lookups={{
          customers: [{ code: "MUS-0001", name: "ÖRNEK MÜŞTERİ" }],
          sites: [],
          suppliers: [],
        }}
        rows={[
          {
            ...invoice,
            counterpartyCode: "MUS-0001",
            counterpartyName: "ÖRNEK MÜŞTERİ",
            documentNo: "SAT-0001",
            id: "sales-invoice-1",
          },
        ]}
        variant="sales"
      />,
    );

    expect(screen.getByText("Satış Faturası")).toBeTruthy();
    expect(screen.getByText("Müşteri")).toBeTruthy();
    expect(screen.getByText("ÖRNEK MÜŞTERİ")).toBeTruthy();
    expect(screen.getByText("Kesinleşince tahsil edilir")).toBeTruthy();
  });

  test("highlights the invoice row matching the requested document number", () => {
    const requestedInvoice = {
      ...invoice,
      id: "invoice-2",
      documentNo: "FAT-0007",
    };

    render(
      <PurchaseInvoiceSurface
        highlightedDocumentNo="FAT-0007"
        rows={[invoice, requestedInvoice]}
      />,
    );

    const highlightedRow = screen.getAllByRole("row", {
      name: /FAT-0007/i,
    })[0];

    expect(highlightedRow?.getAttribute("data-highlighted")).toBe("true");
  });

  test("renders purchase invoice audit history grouped by invoice", () => {
    render(
      <PurchaseInvoiceSurface
        auditLogsByEntityId={{
          "invoice-1": [
            {
              id: "audit-1",
              tenantId: invoice.tenantId,
              companyId: invoice.companyId,
              periodId: invoice.periodId,
              actorUserId: "user-main",
              action: "purchase-invoice.post",
              entityType: "purchase-invoice",
              entityId: "invoice-1",
              entityLabel: "FAT-0006",
              occurredAt: "2026-06-25T12:00:00.000Z",
              createdAt: "2026-06-25T12:00:01.000Z",
              metadata: {
                statusFrom: "Taslak",
                statusTo: "Kaydedildi",
                grandTotal: 16200,
                ledgerDocumentNo: "AF-FAT-0006",
              },
            },
          ],
        }}
        rows={[invoice]}
      />,
    );

    expect(screen.getByText("İşlem Geçmişi")).toBeTruthy();
    expect(screen.getByText("Kesinleştirildi")).toBeTruthy();
    expect(
      screen.getByText(
        "Taslak -> Kaydedildi · Muhasebe fişi: AF-FAT-0006",
      ),
    ).toBeTruthy();
    expect(screen.getByText("25.06.2026 15:00")).toBeTruthy();
  });
  test("renders empty purchase invoice state", () => {
    render(<PurchaseInvoiceSurface rows={[]} />);

    expect(screen.getByText("Henüz fatura kaydı yok")).toBeTruthy();
    expect(
      screen.getByText("Satır grid'i stok kartı, depo, miktar, fiyat, iskonto ve KDV alanlarıyla birlikte kullanılabilir."),
    ).toBeTruthy();
  });

  test("shows the P0 default VAT context when a new purchase invoice line is opened", () => {
    render(<PurchaseInvoiceSurface rows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));

    expect(
      screen.getByText(`Varsayılan KDV: %${getP0DefaultVatRateInputValue()}`),
    ).toBeTruthy();
    expect(
      screen.getByText(`Baz Para: ${getP0BaseCurrencyDisplayValue()}`),
    ).toBeTruthy();
    expect(screen.getByText(getP0CurrencyPolicyDisplayValue())).toBeTruthy();
    expect(screen.getByLabelText("KDV % satır 1")).toHaveProperty(
      "value",
      getP0DefaultVatRateInputValue(),
    );
  });

  test("creates purchase invoice from lookup backed header and line grid", async () => {
    const createInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        id: "invoice-2",
        documentNo: "FAT-0007",
        grandTotal: 12000,
      },
    });

    render(
      <PurchaseInvoiceSurface
        lookups={{
          sites: [
            {
              code: "SANT-0001",
              name: "ŞİRKET MERKEZ ŞANTİYESİ",
            },
          ],
          suppliers: [
            {
              code: "TED-0001",
              name: "ÖRNEK TEDARİKÇİ",
            },
          ],
        }}
        persistence={{
          createInvoice,
        }}
        rows={[]}
        today="2026-06-25"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "FAT-0007" },
    });
    fireEvent.change(screen.getByLabelText("Tedarikçi"), {
      target: { value: "TED-0001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Stok/Hizmet satır 1"), {
      target: { value: "Beton C30" },
    });
    fireEvent.change(screen.getByLabelText("Miktar satır 1"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Birim Fiyat satır 1"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("KDV % satır 1"), {
      target: { value: "20" },
    });

    expect(screen.getAllByText("12.000,00 TL").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(createInvoice).toHaveBeenCalledWith({
        counterpartyCode: "TED-0001",
        counterpartyName: "ÖRNEK TEDARİKÇİ",
        currency: getP0BaseCurrencyTransactionValue(),
        documentNo: "FAT-0007",
        dueDate: "",
        exchangeRate: 1,
        invoiceDate: "2026-06-25",
        isOfficial: false,
        lines: [
          {
            description: "",
            discountRate1: 0,
            discountRate2: 0,
            quantity: 10,
            siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
            stockCode: "",
            stockName: "Beton C30",
            unit: "Adet",
            unitPrice: 1000,
            vatRate: 20,
            warehouse: "",
          },
        ],
        movementGroup: "",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("FAT-0007")).toBeTruthy();
    });
  });

  test("fills purchase invoice line fields from a selected stock card", async () => {
    const createInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        id: "invoice-stock-card",
        documentNo: "FAT-0010",
      },
    });

    render(
      <PurchaseInvoiceSurface
        lookups={{
          sites: [
            {
              code: "SANT-0001",
              name: "ŞİRKET MERKEZ ŞANTİYESİ",
            },
          ],
          suppliers: [
            {
              code: "TED-0001",
              name: "ÖRNEK TEDARİKÇİ",
            },
          ],
        }}
        persistence={{
          createInvoice,
        }}
        rows={[]}
        stockCardOptions={[
          {
            code: "STK-0001",
            defaultWarehouse: "Merkez Depo",
            name: "Çimento Torba",
            unit: "Adet",
          },
        ]}
        today="2026-06-25"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "FAT-0010" },
    });
    fireEvent.change(screen.getByLabelText("Tedarikçi"), {
      target: { value: "TED-0001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Stok Kartı satır 1"), {
      target: { value: "STK-0001" },
    });

    expect(screen.getByLabelText("Stok/Hizmet satır 1")).toHaveProperty(
      "value",
      "Çimento Torba",
    );
    expect(screen.getByLabelText("Birim satır 1")).toHaveProperty("value", "Adet");
    expect(screen.getByLabelText("Depo satır 1")).toHaveProperty(
      "value",
      "Merkez Depo",
    );

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNo: "FAT-0010",
          lines: [
            expect.objectContaining({
              stockCode: "STK-0001",
              stockName: "Çimento Torba",
              unit: "Adet",
              warehouse: "Merkez Depo",
            }),
          ],
        }),
      );
    });
  });

  test("adds and removes invoice lines with discount warehouse and description fields", async () => {
    const createInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        id: "invoice-3",
        documentNo: "FAT-0008",
        grandTotal: 5640,
        lineCount: 1,
      },
    });

    render(
      <PurchaseInvoiceSurface
        lookups={{
          sites: [
            {
              code: "SANT-0001",
              name: "ŞİRKET MERKEZ ŞANTİYESİ",
            },
          ],
          suppliers: [
            {
              code: "TED-0001",
              name: "ÖRNEK TEDARİKÇİ",
            },
          ],
        }}
        persistence={{
          createInvoice,
        }}
        rows={[]}
        today="2026-06-25"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "FAT-0008" },
    });
    fireEvent.change(screen.getByLabelText("Tedarikçi"), {
      target: { value: "TED-0001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Stok/Hizmet satır 1"), {
      target: { value: "Silinecek Satır" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Satır Ekle" }));
    fireEvent.change(screen.getByLabelText("Stok/Hizmet satır 2"), {
      target: { value: "Demir 14'lük" },
    });
    fireEvent.change(screen.getByLabelText("Açıklama satır 2"), {
      target: { value: "Nervürlü demir" },
    });
    fireEvent.change(screen.getByLabelText("Depo satır 2"), {
      target: { value: "Merkez Depo" },
    });
    fireEvent.change(screen.getByLabelText("Miktar satır 2"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Birim Fiyat satır 2"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("İskonto 1 satır 2"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("İskonto 2 satır 2"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("KDV % satır 2"), {
      target: { value: "20" },
    });

    expect(screen.getAllByText("5.400,00 TL").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Satır 1 sil" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNo: "FAT-0008",
          lines: [
            expect.objectContaining({
              description: "Nervürlü demir",
              discountRate1: 10,
              discountRate2: 0,
              quantity: 5,
              stockName: "Demir 14'lük",
              unitPrice: 1000,
              vatRate: 20,
              warehouse: "Merkez Depo",
            }),
          ],
        }),
      );
    });
  });

  test("edits existing invoice from the movement list", async () => {
    const createInvoice = vi.fn();
    const updateInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        documentNo: "FAT-0099",
        lines: [
          {
            ...invoice.lines[0],
            stockName: "Güncellenen Çimento",
            quantity: 2,
            unitPrice: 1000,
            discountRate1: 0,
          },
        ],
        subtotal: 2000,
        discountTotal: 0,
        netTotal: 2000,
        vatTotal: 400,
        grandTotal: 2400,
        lineCount: 1,
      },
    });

    render(
      <PurchaseInvoiceSurface
        persistence={{
          createInvoice,
          updateInvoice,
        }}
        rows={[invoice]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Düzenle FAT-0006" }));

    expect(screen.getByLabelText("Evrak No")).toHaveProperty("value", "FAT-0006");
    expect(screen.getByLabelText("Stok/Hizmet satır 1")).toHaveProperty(
      "value",
      "Çimento Torba",
    );

    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "FAT-0099" },
    });
    fireEvent.change(screen.getByLabelText("Stok/Hizmet satır 1"), {
      target: { value: "Güncellenen Çimento" },
    });
    fireEvent.change(screen.getByLabelText("Miktar satır 1"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Birim Fiyat satır 1"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("İskonto 1 satır 1"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(updateInvoice).toHaveBeenCalledWith(
        "invoice-1",
        expect.objectContaining({
          documentNo: "FAT-0099",
          lines: [
            expect.objectContaining({
              stockName: "Güncellenen Çimento",
              quantity: 2,
              unitPrice: 1000,
              discountRate1: 0,
            }),
          ],
        }),
      );
    });

    expect(createInvoice).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("FAT-0099")).toBeTruthy();
      expect(screen.getAllByText("2.400,00 TL").length).toBeGreaterThan(0);
    });
  });

  test("cancels existing invoice from the movement list without removing the row", async () => {
    const createInvoice = vi.fn();
    const updateInvoice = vi.fn();
    const cancelInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        status: "İptal",
        updatedAt: "2026-06-25T12:00:00.000Z",
      },
    });

    render(
      <PurchaseInvoiceSurface
        persistence={{
          createInvoice,
          updateInvoice,
          cancelInvoice,
        }}
        rows={[invoice]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İptal FAT-0006" }));

    await waitFor(() => {
      expect(cancelInvoice).toHaveBeenCalledWith("invoice-1");
    });

    expect(createInvoice).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("FAT-0006")).toBeTruthy();
      expect(screen.getByText("İptal")).toBeTruthy();
      expect(
        (screen.getByRole("button", { name: "İptal FAT-0006" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.getAllByText("0,00 TL").length).toBeGreaterThan(0);
    });
  });

  test("posts draft purchase invoice, shows its ledger document and locks cancellation", async () => {
    const createInvoice = vi.fn();
    const updateInvoice = vi.fn();
    const cancelInvoice = vi.fn();
    const postInvoice = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        ...invoice,
        ledgerDocumentNo: "AF-FAT-0006",
        ledgerEntryId: "ledger-entry-1",
        status: "Kaydedildi",
        updatedAt: "2026-06-25T13:00:00.000Z",
      },
    });

    render(
      <PurchaseInvoiceSurface
        persistence={{
          cancelInvoice,
          createInvoice,
          postInvoice,
          updateInvoice,
        }}
        rows={[invoice]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kesinleştir FAT-0006" }));

    await waitFor(() => {
      expect(postInvoice).toHaveBeenCalledWith("invoice-1");
    });

    expect(createInvoice).not.toHaveBeenCalled();
    expect(updateInvoice).not.toHaveBeenCalled();
    expect(cancelInvoice).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("Kaydedildi")).toBeTruthy();
      expect(
        screen.getByText(
          "Fatura kesinleştirildi ve AF-FAT-0006 numaralı muhasebe fişi oluşturuldu.",
        ),
      ).toBeTruthy();
      expect(
        (
          screen.getByRole("button", {
            name: "Düzenle FAT-0006",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Kesinleştir FAT-0006",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "İptal FAT-0006",
          }) as HTMLButtonElement
      ).disabled,
      ).toBe(true);
    });
  });

  test("locks posted sales invoice cancellation", () => {
    render(
      <PurchaseInvoiceSurface
        persistence={{
          cancelInvoice: vi.fn(),
          createInvoice: vi.fn(),
        }}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
        variant="sales"
      />,
    );

    expect(
      (screen.getByRole("button", { name: "İptal FAT-0006" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/Kesinleşen satış faturası otomatik olarak/)).toBeTruthy();
  });

  test("offers reversal cancellation for production-posted invoices", async () => {
    const cancelInvoice = vi.fn(async () => ({
      ok: true as const,
      data: { ...invoice, status: "İptal" as const },
    }));
    render(
      <PurchaseInvoiceSurface
        persistence={{ allowPostedCancellation: true, cancelInvoice, createInvoice: vi.fn() }}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
        variant="sales"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "İptal FAT-0006" }));
    await waitFor(() => expect(cancelInvoice).toHaveBeenCalledWith("invoice-1"));
  });

  test("creates collection movement for posted sales invoices", async () => {
    const collectInvoice = vi.fn(async (id: string, account?: { code: string; name: string }) => ({
      ok: true as const,
      data: {
        ...createInvoicePaymentMovement({
          accountCode: account?.code ?? "KASA-0001",
          accountName: account?.name ?? "MERKEZ KASA",
          sourceId: id,
        }),
        movementType: "Tahsilat" as const,
        direction: "Giriş" as const,
        sourceType: "sales-invoice",
        ledgerDocumentNo: "YVM-THS-THS-FAT-0006",
      },
    }));
    render(
      <PurchaseInvoiceSurface
        accountOptions={[{ code: "KASA-0001", name: "MERKEZ KASA" }]}
        persistence={{ collectInvoice, createInvoice: vi.fn() }}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
        variant="sales"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Tahsilat Oluştur" }));
    await waitFor(() => expect(collectInvoice).toHaveBeenCalledWith("invoice-1", { code: "KASA-0001", name: "MERKEZ KASA" }));
    expect(await screen.findByText("Tahsil Edildi")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-THS-THS-FAT-0006")).toBeTruthy();
  });

  test("creates payment movement for posted purchase invoices", async () => {
    const payInvoice = vi.fn(
      async (
        id: string,
        account?: { code: string; name: string },
      ): Promise<{ ok: true; data: CashBankMovementRow }> => ({
        ok: true,
        data: {
          ...createInvoicePaymentMovement({
            accountCode: account?.code ?? "KASA-0001",
            accountName: account?.name ?? "MERKEZ KASA",
            sourceId: id,
          }),
          ledgerDocumentNo: "YVM-ODM-ODM-FAT-0006",
        },
      }),
    );

    render(
      <PurchaseInvoiceSurface
        accountOptions={[
          { code: "KASA-0001", name: "MERKEZ KASA" },
          { code: "BANKA-0002", name: "MERKEZ BANKA" },
        ]}
        paymentMovements={[]}
        persistence={{
          createInvoice: vi.fn(),
          payInvoice,
        }}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
      />,
    );

    expect(screen.getByText(/Kalan:/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ödeme hesabı"), {
      target: { value: "BANKA-0002" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ödeme Oluştur" }));

    await waitFor(() =>
      expect(payInvoice).toHaveBeenCalledWith("invoice-1", {
        code: "BANKA-0002",
        name: "MERKEZ BANKA",
      }),
    );
    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("MERKEZ BANKA")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-ODM-ODM-FAT-0006")).toBeTruthy();
  });

  test("renders existing purchase invoice payment movement trace", () => {
    render(
      <PurchaseInvoiceSurface
        paymentMovements={[createInvoicePaymentMovement()]}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
      />,
    );

    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("MERKEZ KASA")).toBeTruthy();
    expect(screen.getByText("30.06.2026")).toBeTruthy();
  });

  test("renders ledger references for every partial invoice payment movement", () => {
    render(
      <PurchaseInvoiceSurface
        paymentMovements={[
          createInvoicePaymentMovement({
            amount: 8000,
            documentNo: "ODM-FAT-0006-1",
            ledgerDocumentNo: "YVM-ODM-ODM-FAT-0006-1",
          }),
          createInvoicePaymentMovement({
            amount: 8200,
            documentNo: "ODM-FAT-0006-2",
            id: "invoice-payment-2",
            ledgerDocumentNo: "YVM-ODM-ODM-FAT-0006-2",
          }),
        ]}
        rows={[{ ...invoice, status: "Kaydedildi" }]}
      />,
    );

    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-ODM-ODM-FAT-0006-1")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-ODM-ODM-FAT-0006-2")).toBeTruthy();
  });

  test("locks purchase invoice mutations for read only permissions", () => {
    render(
      <PurchaseInvoiceSurface
        permissions={{
          canMutateInvoices: false,
        }}
        rows={[invoice]}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Yeni" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Düzenle FAT-0006",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Kesinleştir FAT-0006",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "İptal FAT-0006",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText("FAT-0006")).toBeTruthy();
  });
});

function createInvoicePaymentMovement(
  overrides: Partial<CashBankMovementRow> = {},
): CashBankMovementRow {
  return {
    id: "invoice-payment-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    amount: 16200,
    counterpartyName: "ÖRNEK TEDARİKÇİ",
    createdAt: "2026-06-30T12:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "FAT-0006 alış faturası ödemesi",
    direction: "Çıkış",
    documentNo: "ODM-FAT-0006",
    movementDate: "2026-06-30",
    movementType: "Fatura Ödemesi",
    sourceId: "invoice-1",
    sourceLabel: "FAT-0006",
    sourceType: "purchase-invoice",
    updatedAt: "2026-06-30T12:00:00.000Z",
    updatedBy: "user-main",
    ...overrides,
  };
}


