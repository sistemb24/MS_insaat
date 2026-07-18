/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { ExpenseSurface } from "./expense-surface";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ExpenseRow } from "@/lib/expense-service";

afterEach(() => {
  cleanup();
});

describe("ExpenseSurface", () => {
  test("creates an expense with site and cash bank account selections", async () => {
    const createdExpense: ExpenseRow = {
      id: "expense-1",
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      accountCode: "KASA-0001",
      accountName: "MERKEZ KASA",
      amount: 12500,
      counterpartyName: "ABC Beton A.Ş.",
      currency: "TL",
      description: "Şantiye nakliye gideri",
      documentNo: "GDR-0001",
      expenseDate: "2026-06-30",
      grandTotal: 15000,
      movementGroup: "Nakliye",
      siteCode: "SANT-0001",
      siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
      status: "Kaydedildi",
      vatRate: 20,
      vatTotal: 2500,
      createdBy: "user-main",
      updatedBy: "user-main",
      createdAt: "2026-06-30T13:00:00.000Z",
      updatedAt: "2026-06-30T13:00:00.000Z",
      ledgerDocumentNo: "YVM-GDR-GDR-0001",
    };
    const createdPayment: CashBankMovementRow = {
      id: "movement-1",
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      accountCode: "KASA-0001",
      accountName: "MERKEZ KASA",
      amount: 15000,
      counterpartyName: "ABC Beton A.Ş.",
      currency: "TL",
      description: "GDR-0001 gider ödemesi",
      direction: "Çıkış",
      documentNo: "ODM-GDR-0001",
      movementDate: "2026-06-30",
      movementType: "Gider Ödemesi",
      sourceId: "expense-1",
      sourceLabel: "GDR-0001",
      sourceType: "expense",
      createdBy: "user-main",
      updatedBy: "user-main",
      createdAt: "2026-06-30T13:00:00.000Z",
      updatedAt: "2026-06-30T13:00:00.000Z",
    };
    const receivedValues: unknown[] = [];

    render(
      <ExpenseSurface
        accountOptions={[{ code: "KASA-0001", name: "MERKEZ KASA" }]}
        lookups={{ sites: [{ code: "SANT-0001", name: "ŞİRKET MERKEZ ŞANTİYESİ" }] }}
        paymentMovements={[]}
        persistence={{
          async createExpense(values) {
            receivedValues.push(values);

            return {
              ok: true,
              data: {
                expense: createdExpense,
                paymentMovement: createdPayment,
              },
            };
          },
        }}
        rows={[]}
        today="2026-06-30"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "GDR-0001" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "SANT-0001" },
    });
    fireEvent.change(screen.getByLabelText("Hareket Grubu"), {
      target: { value: "Nakliye" },
    });
    fireEvent.change(screen.getByLabelText("Cari"), {
      target: { value: "ABC Beton A.Ş." },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "12500" },
    });
    fireEvent.change(screen.getByLabelText("KDV %"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => {
      expect(screen.getByText("GDR-0001")).toBeTruthy();
    });

    expect(receivedValues).toEqual([
      expect.objectContaining({
        accountCode: "KASA-0001",
        accountName: "MERKEZ KASA",
        amount: 12500,
        documentNo: "GDR-0001",
        movementGroup: "Nakliye",
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        vatRate: 20,
      }),
    ]);
    expect(screen.getByText("Ödendi")).toBeTruthy();
    expect(screen.getByText("MERKEZ KASA")).toBeTruthy();
    expect(screen.getByText("Fiş: YVM-GDR-GDR-0001")).toBeTruthy();
  });
});

