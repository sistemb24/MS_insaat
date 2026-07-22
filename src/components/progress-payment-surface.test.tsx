/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { AuditLogEntry } from "@/lib/audit-log";
import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import type {
  ProgressPaymentCreateValues,
  ProgressPaymentRow,
} from "@/lib/progress-payment-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
  getP0DefaultVatRateInputValue,
} from "@/lib/settings-contract";

import { ProgressPaymentSurface } from "./progress-payment-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

describe("ProgressPaymentSurface", () => {
  test("renders progress payment list and totals", () => {
    render(
      <ProgressPaymentSurface
        lookups={{
          counterparties: [{ code: "TAS-0001", name: "ŞİRKETİN TAŞERONU" }],
          sites: [{ code: "SANT-0001", name: "ŞİRKET MERKEZ ŞANTİYESİ" }],
        }}
        rows={[createProgressPaymentRow()]}
      />,
    );

    expect(
      screen.getByRole("table", {
        name: "Hakediş faturası hareket listesi",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Hakediş İşlemleri")).toBeTruthy();
    expect(screen.getByText("Hakediş faturası hareket listesi")).toBeTruthy();
    expect(screen.getByText("HAK-0001")).toBeTruthy();
    expect(screen.getByText("ŞİRKETİN TAŞERONU")).toBeTruthy();
    expect(screen.getAllByText("11.400,00 TL")).toHaveLength(2);
    expect(screen.getByText("Kesinti Toplamı")).toBeTruthy();
  });

  test("prints the visible progress payment movement list scope", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<ProgressPaymentSurface rows={[createProgressPaymentRow()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(
      "Yazdırma kapsamı hazır: 1 hakediş.",
    );
  });

  test("shows P0 boundary messages for passive progress payment toolbar actions", () => {
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(<ProgressPaymentSurface rows={[createProgressPaymentRow()]} />);

    fireEvent.click(screen.getByRole("button", { name: "PDF Önizleme" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "PDF önizleme P0 kapsamı dışında; görünen hakediş listesi için Yazdır kullanılabilir.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Onay" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Hakediş onayı P0 kapsamında satırdaki Kesinleştir aksiyonuyla yönetilir.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Yenile" }));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(
      "Hakediş listesi server render ve revalidate akışıyla güncellenir.",
    );
  });

  test("highlights the progress payment row matching the requested document number", () => {
    render(
      <ProgressPaymentSurface
        highlightedDocumentNo="HAK-0002"
        rows={[
          createProgressPaymentRow(),
          createProgressPaymentRow({
            documentNo: "HAK-0002",
            id: "progress-payment-2",
          }),
        ]}
      />,
    );

    const highlightedRow = screen.getAllByRole("row", {
      name: /HAK-0002/i,
    })[0];

    expect(highlightedRow?.getAttribute("data-highlighted")).toBe("true");
  });

  test("creates progress payment from the form", async () => {
    const createProgressPayment = vi.fn(
      async (
        values: ProgressPaymentCreateValues,
      ): Promise<{ ok: true; data: ProgressPaymentRow }> => ({
        ok: true,
        data: createProgressPaymentRow(values),
      }),
    );

    render(
      <ProgressPaymentSurface
        lookups={{
          counterparties: [{ code: "TAS-0001", name: "ŞİRKETİN TAŞERONU" }],
          sites: [{ code: "SANT-0001", name: "ŞİRKET MERKEZ ŞANTİYESİ" }],
        }}
        persistence={{ createProgressPayment }}
        rows={[]}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "HAK-0001" },
    });
    fireEvent.change(screen.getByLabelText("Cari"), {
      target: { value: "TAS-0001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Açıklama satır 1"), {
      target: { value: "Kaba inşaat imalatı" },
    });
    fireEvent.change(screen.getByLabelText("Miktar satır 1"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Birim Fiyat satır 1"), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(createProgressPayment).toHaveBeenCalledOnce());
    expect(createProgressPayment.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        counterpartyCode: "TAS-0001",
        counterpartyName: "ŞİRKETİN TAŞERONU",
        currency: getP0BaseCurrencyTransactionValue(),
        documentNo: "HAK-0001",
        issueDate: "2026-06-27",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
      }),
    );
    expect(screen.getByText("HAK-0001")).toBeTruthy();
  });

  test("shows the P0 default VAT context when a new progress payment line is opened", () => {
    render(<ProgressPaymentSurface rows={[]} today="2026-06-27" />);

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));

    expect(
      screen.getByText(`Varsayılan KDV: %${getP0DefaultVatRateInputValue()}`),
    ).toBeTruthy();
    expect(
      screen.getByText(`Baz Para: ${getP0BaseCurrencyDisplayValue()}`),
    ).toBeTruthy();
    expect(screen.getByText(getP0CurrencyPolicyDisplayValue())).toBeTruthy();
    expect(screen.getByLabelText("KDV satır 1")).toHaveProperty(
      "value",
      getP0DefaultVatRateInputValue(),
    );
  });

  test("renders progress payment audit history grouped by row", () => {
    const row = createProgressPaymentRow();

    render(
      <ProgressPaymentSurface
        auditLogsByEntityId={{
          [row.id]: [
            createAuditLog({
              action: "progress-payment.create",
              entityId: row.id,
              occurredAt: "2026-06-27T10:00:00.000Z",
              statusTo: "Taslak",
            }),
            createAuditLog({
              action: "progress-payment.post",
              entityId: row.id,
              occurredAt: "2026-06-27T11:00:00.000Z",
              statusFrom: "Taslak",
              statusTo: "Kaydedildi",
            }),
          ],
        }}
        rows={[row]}
      />,
    );

    expect(screen.getByText("İşlem Geçmişi")).toBeTruthy();
    expect(screen.getByText("Oluşturuldu")).toBeTruthy();
    expect(screen.getByText("Kesinleştirildi")).toBeTruthy();
    expect(screen.getByText("Taslak -> Kaydedildi")).toBeTruthy();
  });

  test("shows the linked ledger document for a posted progress payment", () => {
    render(
      <ProgressPaymentSurface
        rows={[createProgressPaymentRow({ status: "Kaydedildi", ledgerDocumentNo: "YVM-HAK-HAK-0001" })]}
      />,
    );

    expect(screen.getByText("Fiş: YVM-HAK-HAK-0001")).toBeTruthy();
  });

  test("creates payment movement for posted subcontractor progress payment", async () => {
    const payProgressPayment = vi.fn(
      async (
        id: string,
        account?: CashBankAccountOption,
      ): Promise<{ ok: true; data: CashBankMovementRow }> => ({
        ok: true,
        data: createPaymentMovement({
          accountCode: account?.code ?? "KASA-0001",
          accountName: account?.name ?? "MERKEZ KASA",
          sourceId: id,
        }),
      }),
    );

    render(
      <ProgressPaymentSurface
        accountOptions={[
          { code: "KASA-0001", name: "MERKEZ KASA" },
          { code: "BANKA-0001", name: "MERKEZ BANKA" },
        ]}
        persistence={{ payProgressPayment }}
        rows={[createProgressPaymentRow({ status: "Kaydedildi" })]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Ödeme/Tahsilat hesabı"), {
      target: { value: "BANKA-0001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ödeme Oluştur" }));

    await waitFor(() => expect(payProgressPayment).toHaveBeenCalledOnce());
    expect(payProgressPayment).toHaveBeenCalledWith("progress-payment-1", {
      code: "BANKA-0001",
      name: "MERKEZ BANKA",
    });
    expect(screen.getByText("Hakediş ödeme hareketi oluşturuldu.")).toBeTruthy();
    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("MERKEZ BANKA")).toBeTruthy();
  });

  test("creates collection movement for posted site income progress payment", async () => {
    const collectProgressPayment = vi.fn(
      async (
        id: string,
        account?: CashBankAccountOption,
      ): Promise<{ ok: true; data: CashBankMovementRow }> => ({
        ok: true,
        data: createPaymentMovement({
          accountCode: account?.code ?? "KASA-0001",
          accountName: account?.name ?? "MERKEZ KASA",
          counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
          description: "HAK-0001 hakediş tahsilatı",
          direction: "Giriş",
          documentNo: "THS-HAK-0001",
          movementType: "Hakediş Tahsilatı",
          sourceId: id,
        }),
      }),
    );

    render(
      <ProgressPaymentSurface
        accountOptions={[
          { code: "KASA-0001", name: "MERKEZ KASA" },
          { code: "BANKA-0001", name: "MERKEZ BANKA" },
        ]}
        persistence={{ collectProgressPayment }}
        rows={[
          createProgressPaymentRow({
            counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
            paymentType: "Şantiye Geliri",
            status: "Kaydedildi",
          }),
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Ödeme/Tahsilat hesabı"), {
      target: { value: "BANKA-0001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tahsilat Oluştur" }));

    await waitFor(() => expect(collectProgressPayment).toHaveBeenCalledOnce());
    expect(collectProgressPayment).toHaveBeenCalledWith("progress-payment-1", {
      code: "BANKA-0001",
      name: "MERKEZ BANKA",
    });
    expect(screen.getByText("Hakediş tahsilat hareketi oluşturuldu.")).toBeTruthy();
    expect(screen.getByText("Tahsil Edildi")).toBeTruthy();
    expect(screen.getByText("MERKEZ BANKA")).toBeTruthy();
  });

  test("shows payment movement ledger document for posted progress payment", () => {
    render(
      <ProgressPaymentSurface
        paymentMovements={[
          createPaymentMovement({
            ledgerDocumentNo: "YVM-ODM-ODM-HAK-0001",
          }),
        ]}
        rows={[createProgressPaymentRow({ status: "Kaydedildi" })]}
      />,
    );

    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-ODM-ODM-HAK-0001")).toBeTruthy();
  });

  test("shows collection movement ledger document for site income", () => {
    render(
      <ProgressPaymentSurface
        paymentMovements={[
          createPaymentMovement({
            direction: "Giriş",
            documentNo: "THS-HAK-0001",
            ledgerDocumentNo: "YVM-THS-THS-HAK-0001",
            movementType: "Hakediş Tahsilatı",
          }),
        ]}
        rows={[createProgressPaymentRow({ paymentType: "Şantiye Geliri", status: "Kaydedildi" })]}
      />,
    );

    expect(screen.getByText("Tahsil Edildi")).toBeTruthy();
    expect(screen.getByText("Muhasebe fişi: YVM-THS-THS-HAK-0001")).toBeTruthy();
  });

  test("offers collection action instead of payment action for site income progress payments", () => {
    render(
      <ProgressPaymentSurface
        rows={[
          createProgressPaymentRow({
            paymentType: "Şantiye Geliri",
            status: "Kaydedildi",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Tahsilat Bekliyor")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tahsilat Oluştur" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ödeme Oluştur" })).toBeNull();
  });
});

function createProgressPaymentRow(
  overrides: Partial<ProgressPaymentRow> = {},
): ProgressPaymentRow {
  return {
    id: "progress-payment-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    counterpartyCode: overrides.counterpartyCode ?? "TAS-0001",
    counterpartyName: overrides.counterpartyName ?? "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-27T10:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: overrides.description ?? "Haziran hakedişi",
    documentNo: overrides.documentNo ?? "HAK-0001",
    grandTotal: 11400,
    grossTotal: 10000,
    issueDate: overrides.issueDate ?? "2026-06-27",
    lineCount: 1,
    lines: overrides.lines ?? [
      {
        description: "Kaba inşaat imalatı",
        quantity: 10,
        unit: "m2",
        unitPrice: 1000,
        vatRate: 20,
      },
    ],
    netTotal: 9500,
    paymentType: "Taşeron Hakedişi",
    retentionRate: 5,
    retentionTotal: 500,
    siteCode: overrides.siteCode ?? "SANT-0001",
    siteName: overrides.siteName ?? "ŞİRKET MERKEZ ŞANTİYESİ",
    status: "Taslak",
    updatedAt: "2026-06-27T10:00:00.000Z",
    updatedBy: "user-main",
    vatTotal: 1900,
    ...overrides,
  };
}

function createAuditLog({
  action,
  entityId,
  occurredAt,
  statusFrom,
  statusTo,
}: {
  action: string;
  entityId: string;
  occurredAt: string;
  statusFrom?: string;
  statusTo: string;
}): AuditLogEntry {
  return {
    id: `${entityId}-${action}`,
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    actorUserId: "user-main",
    action,
    entityType: "progress-payment",
    entityId,
    entityLabel: "HAK-0001",
    occurredAt,
    createdAt: occurredAt,
    metadata: {
      statusFrom,
      statusTo,
    },
  };
}

function createPaymentMovement(
  overrides: Partial<CashBankMovementRow> = {},
): CashBankMovementRow {
  return {
    id: "movement-1",
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    accountCode: "KASA-0001",
    accountName: "MERKEZ KASA",
    amount: 11400,
    counterpartyName: "ŞİRKETİN TAŞERONU",
    createdAt: "2026-06-30T12:00:00.000Z",
    createdBy: "user-main",
    currency: "TL",
    description: "HAK-0001 hakediş ödemesi",
    direction: "Çıkış",
    documentNo: "ODM-HAK-0001",
    movementDate: "2026-06-30",
    movementType: "Hakediş Ödemesi",
    sourceId: "progress-payment-1",
    sourceLabel: "HAK-0001",
    sourceType: "progress-payment",
    updatedAt: "2026-06-30T12:00:00.000Z",
    updatedBy: "user-main",
    ...overrides,
  };
}

