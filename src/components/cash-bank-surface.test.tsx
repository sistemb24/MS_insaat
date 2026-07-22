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

import type {
  CashBankMovementCreateValues,
  CashBankMovementRow,
  CashBankTransferValues,
} from "@/lib/cash-bank-movement-service";
import { getEntityDefinition, type EntityRow } from "@/lib/entities";
import {
  getP0BaseCurrencyDisplayValue,
  getP0CurrencyPolicyDisplayValue,
} from "@/lib/settings-contract";

import { CashBankSurface } from "./cash-bank-surface";

const originalPrint = window.print;

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "print", {
    configurable: true,
    value: originalPrint,
  });
});

const accountRows: EntityRow[] = [
  {
    balance: "1.000,00 TL",
    code: "KASA-0001",
    currency: "TL",
    name: "MERKEZ KASA",
    status: "Aktif",
    type: "Kasa",
  },
];

const movement: CashBankMovementRow = {
  id: "movement-1",
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
  accountCode: "KASA-0001",
  accountName: "MERKEZ KASA",
  movementDate: "2026-06-27",
  movementType: "Çek Tahsilatı",
  direction: "Giriş",
  documentNo: "CEK-0001",
  counterpartyName: "ABC Beton A.Ş.",
  amount: 125000,
  currency: "TL",
  description: "CEK-0001 / CK-0001 çek tahsilatı",
  sourceType: "cheque",
  sourceId: "cheque-1",
  sourceLabel: "CEK-0001 / CK-0001",
  createdBy: "user-main",
  updatedBy: "user-main",
  createdAt: "2026-06-27T09:00:00.000Z",
  updatedAt: "2026-06-27T09:00:00.000Z",
  ledgerDocumentNo: "YVM-THS-CEK-0001",
};

describe("CashBankSurface", () => {
  test("renders account definitions together with generated cash bank movements", () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[movement]}
      />,
    );

    expect(screen.getByText("Kasa/Banka")).toBeTruthy();
    expect(screen.getByText("Hesap Bakiye Özeti")).toBeTruthy();
    expect(screen.getByText("Otomatik Hareketler")).toBeTruthy();
    expect(screen.getByText("Giriş Toplamı")).toBeTruthy();
    expect(screen.getAllByText("125.000,00 TL")).toHaveLength(3);
    expect(screen.getAllByText("126.000,00 TL")).toHaveLength(2);
    expect(screen.getByText("CEK-0001")).toBeTruthy();
    expect(screen.getByText("Çek Tahsilatı")).toBeTruthy();
    expect(screen.getByText("YVM-THS-CEK-0001")).toBeTruthy();
    expect(screen.getAllByText("MERKEZ KASA")).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  test("filters real movement rows by direction and search text", () => {
    const definition = getEntityDefinition("kasa-banka");
    const outgoingMovement: CashBankMovementRow = {
      ...movement,
      id: "movement-2",
      counterpartyName: "DEF Hafriyat",
      direction: "Çıkış",
      documentNo: "ODM-0001",
      ledgerDocumentNo: undefined,
      movementType: "Ödeme",
    };

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[movement, outgoingMovement]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Çıkış" }));
    expect(screen.queryByText("CEK-0001")).toBeNull();
    expect(screen.getByText("ODM-0001")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tümü" }));
    fireEvent.change(screen.getByLabelText("Hareketlerde ara"), {
      target: { value: "ABC Beton" },
    });
    expect(screen.getByText("CEK-0001")).toBeTruthy();
    expect(screen.queryByText("ODM-0001")).toBeNull();
  });

  test("labels compensating reversal movements in the automatic list", () => {
    const definition = getEntityDefinition("kasa-banka");
    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[{ ...movement, sourceType: "cash-bank-movement-reversal", documentNo: "YVM-IA-YVM-THS-CEK-0001" }]}
      />,
    );

    expect(screen.getByText("Ters kayıt")).toBeTruthy();
    expect(screen.getByText("YVM-THS-CEK-0001")).toBeTruthy();
  });

  test("prints the visible cash bank movement list scope", () => {
    const definition = getEntityDefinition("kasa-banka");
    const print = vi.fn();

    expect(definition).toBeDefined();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[movement]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hareketleri Yazdır" }));

    expect(print).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Yazdırma kapsamı hazır: 1 hareket."),
    ).toBeTruthy();
  });

  test("highlights the cash bank movement matching the requested document number", () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        highlightedDocumentNo="ODM-FAT-0001"
        movements={[
          movement,
          {
            ...movement,
            id: "movement-2",
            documentNo: "ODM-FAT-0001",
          },
        ]}
      />,
    );

    const highlightedRow = screen.getAllByRole("row", {
      name: /ODM-FAT-0001/i,
    })[0];

    expect(highlightedRow?.getAttribute("data-highlighted")).toBe("true");
  });

  test("renders empty movement state without hiding account definitions", () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[]}
      />,
    );

    expect(screen.getByText("Henüz kasa/banka hareketi yok")).toBeTruthy();
    expect(screen.getAllByText("KASA-0001")).toHaveLength(2);
  });

  test("creates a manual collection movement from the cash bank form", async () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();

    const createdMovement: CashBankMovementRow = {
      ...movement,
      id: "manual-movement-1",
      amount: 1500,
      counterpartyName: "DEF Hafriyat",
      description: "Nakit tahsilat",
      documentNo: "THS-0001",
      movementType: "Tahsilat",
      sourceId: "THS-0001",
      sourceLabel: "THS-0001",
      sourceType: "manual",
    };

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={accountRows}
        movements={[]}
        permissions={{ canMutateMovements: true }}
        persistence={{
          createMovement: async (values: CashBankMovementCreateValues) => {
            expect(values).toEqual({
              accountCode: "KASA-0001",
              accountName: "MERKEZ KASA",
              amount: 1500,
              counterAccountCode: "120",
              counterAccountName: "Alıcılar",
              counterpartyName: "DEF Hafriyat",
              currency: "TL",
              description: "Nakit tahsilat",
              documentNo: "THS-0001",
              movementDate: "2026-06-27",
              movementType: "Tahsilat",
            });

            return {
              ok: true,
              data: createdMovement,
            };
          },
        }}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni Hareket" }));
    expect(
      (screen.getByLabelText("Karşı Muhasebe Hesabı") as HTMLSelectElement)
        .value,
    ).toBe("120");
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "THS-0001" },
    });
    fireEvent.change(screen.getByLabelText("Cari"), {
      target: { value: "DEF Hafriyat" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText("Açıklama"), {
      target: { value: "Nakit tahsilat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hareket Kaydet" }));

    await waitFor(() => {
      expect(screen.getByText("THS-0001")).toBeTruthy();
    });
    expect(screen.getByText("DEF Hafriyat")).toBeTruthy();
    expect(screen.getByText("Tahsilat")).toBeTruthy();
    expect(screen.getAllByText("1.500,00 TL")).toHaveLength(3);
  });

  test("keeps manual movement currency on the P0 base currency context", async () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();

    const usdAccountRows: EntityRow[] = [
      {
        ...accountRows[0],
        balance: "1.000,00 USD",
        currency: "USD",
      },
    ];

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={usdAccountRows}
        movements={[]}
        permissions={{ canMutateMovements: true }}
        persistence={{
          createMovement: async (values: CashBankMovementCreateValues) => {
            expect(values.currency).toBe("TL");

            return {
              ok: true,
              data: {
                ...movement,
                id: "manual-movement-p0-currency",
                amount: 125,
                currency: values.currency,
                documentNo: values.documentNo,
                movementType: values.movementType,
                sourceId: values.documentNo,
                sourceLabel: values.documentNo,
                sourceType: "manual",
              },
            };
          },
        }}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni Hareket" }));

    expect(
      screen.getByText(`Baz Para: ${getP0BaseCurrencyDisplayValue()}`),
    ).toBeTruthy();
    expect(screen.getByText(getP0CurrencyPolicyDisplayValue())).toBeTruthy();

    const currencyInput = screen.getByLabelText(
      "Para Birimi",
    ) as HTMLSelectElement;
    expect(currencyInput.value).toBe("TL");
    expect(currencyInput.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "THS-USD-001" },
    });
    fireEvent.change(screen.getByLabelText("Cari"), {
      target: { value: "USD Hesaplı Cari" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "125" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hareket Kaydet" }));

    await waitFor(() => {
      expect(screen.getByText("THS-USD-001")).toBeTruthy();
    });
  });

  test("creates paired transfer movements from the cash bank form", async () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();
    const transferAccounts: EntityRow[] = [
      ...accountRows,
      {
        balance: "0,00 TL",
        code: "BANKA-0002",
        currency: "TL",
        name: "MERKEZ BANKA",
        status: "Aktif",
        type: "Banka",
      },
    ];
    const transferRows: CashBankMovementRow[] = [
      {
        ...movement,
        id: "transfer-out",
        amount: 750,
        counterpartyName: "MERKEZ BANKA",
        description: "Kasa banka virmanı",
        direction: "Çıkış",
        documentNo: "VRM-0001",
        movementType: "Virman",
        sourceId: "vrm-0001-cikis",
        sourceLabel: "VRM-0001",
        sourceType: "transfer",
      },
      {
        ...movement,
        id: "transfer-in",
        accountCode: "BANKA-0002",
        accountName: "MERKEZ BANKA",
        amount: 750,
        counterpartyName: "MERKEZ KASA",
        description: "Kasa banka virmanı",
        direction: "Giriş",
        documentNo: "VRM-0001",
        movementType: "Virman",
        sourceId: "vrm-0001-giris",
        sourceLabel: "VRM-0001",
        sourceType: "transfer",
      },
    ];

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={transferAccounts}
        movements={[]}
        permissions={{ canMutateMovements: true }}
        persistence={{
          createTransfer: async (values: CashBankTransferValues) => {
            expect(values).toEqual({
              amount: 750,
              currency: "TL",
              description: "Kasa banka virmanı",
              documentNo: "VRM-0001",
              fromAccountCode: "KASA-0001",
              fromAccountName: "MERKEZ KASA",
              movementDate: "2026-06-27",
              toAccountCode: "BANKA-0002",
              toAccountName: "MERKEZ BANKA",
            });

            return {
              ok: true,
              data: {
                rows: transferRows,
              },
            };
          },
        }}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Virman" }));
    fireEvent.change(screen.getByLabelText("Giriş Hesabı"), {
      target: { value: "BANKA-0002" },
    });
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "VRM-0001" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "750" },
    });
    fireEvent.change(screen.getByLabelText("Açıklama"), {
      target: { value: "Kasa banka virmanı" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Virman Kaydet" }));

    await waitFor(() => {
      expect(screen.getAllByText("VRM-0001")).toHaveLength(2);
    });
    expect(screen.getAllByText("Virman")).toHaveLength(3);
    expect(screen.getAllByText("750,00 TL")).toHaveLength(7);
  });

  test("keeps transfer currency on the P0 base currency context", async () => {
    const definition = getEntityDefinition("kasa-banka");
    expect(definition).toBeDefined();
    const transferAccounts: EntityRow[] = [
      {
        ...accountRows[0],
        balance: "1.000,00 USD",
        currency: "USD",
      },
      {
        balance: "0,00 EUR",
        code: "BANKA-0002",
        currency: "EUR",
        name: "MERKEZ BANKA",
        status: "Aktif",
        type: "Banka",
      },
    ];

    render(
      <CashBankSurface
        accountDefinition={definition!}
        accountRows={transferAccounts}
        movements={[]}
        permissions={{ canMutateMovements: true }}
        persistence={{
          createTransfer: async (values: CashBankTransferValues) => {
            expect(values.currency).toBe("TL");

            return {
              ok: true,
              data: {
                rows: [
                  {
                    ...movement,
                    id: "transfer-out-p0-currency",
                    currency: values.currency,
                    documentNo: values.documentNo,
                    direction: "Çıkış",
                    movementType: "Virman",
                    sourceId: `${values.documentNo}-cikis`,
                    sourceLabel: values.documentNo,
                    sourceType: "transfer",
                  },
                  {
                    ...movement,
                    id: "transfer-in-p0-currency",
                    accountCode: "BANKA-0002",
                    accountName: "MERKEZ BANKA",
                    currency: values.currency,
                    documentNo: values.documentNo,
                    movementType: "Virman",
                    sourceId: `${values.documentNo}-giris`,
                    sourceLabel: values.documentNo,
                    sourceType: "transfer",
                  },
                ],
              },
            };
          },
        }}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Virman" }));

    expect(
      screen.getByText(`Baz Para: ${getP0BaseCurrencyDisplayValue()}`),
    ).toBeTruthy();
    expect(screen.getByText(getP0CurrencyPolicyDisplayValue())).toBeTruthy();

    const currencyInput = screen.getByLabelText(
      "Para Birimi",
    ) as HTMLSelectElement;
    expect(currencyInput.value).toBe("TL");
    expect(currencyInput.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "VRM-P0-001" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "250" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Virman Kaydet" }));

    await waitFor(() => {
      expect(screen.getAllByText("VRM-P0-001")).toHaveLength(2);
    });
  });
});
