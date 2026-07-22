/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonnelWorkspaceHeader } from "./personnel-workspace-header";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";

const payrollAccruals = [
  { id: "payroll-paid", netTotal: 31500, status: "Kaydedildi" },
  { id: "payroll-waiting", netTotal: 28000, status: "Kaydedildi" },
  { id: "payroll-draft", netTotal: 12000, status: "Taslak" },
] as PayrollAccrualRow[];

const paymentMovements = [
  {
    id: "movement-1",
    sourceId: "payroll-paid",
    sourceType: "payroll-accrual",
  },
] as CashBankMovementRow[];

describe("PersonnelWorkspaceHeader", () => {
  it("summarizes scoped personel, şantiye and payroll payment data", () => {
    render(
      <PersonnelWorkspaceHeader
        paymentMovements={paymentMovements}
        payrollAccruals={payrollAccruals}
        personnelRows={[
          { code: "PER-001", name: "Aktif çalışan", status: "Aktif" },
          { code: "PER-002", name: "Pasif çalışan", status: "Pasif" },
        ]}
        siteRows={[
          { code: "SNT-001", name: "Aktif şantiye", status: "Aktif" },
          { code: "SNT-002", name: "Pasif şantiye", status: "Pasif" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Personel Yönetimi",
    );
    expect(screen.getByText("Toplam Personel").parentElement?.textContent).toContain(
      "2",
    );
    expect(screen.getByText("Aktif Şantiyeler").parentElement?.textContent).toContain(
      "1",
    );
    expect(
      screen.getByText("Bekleyen Ödemeler").parentElement?.textContent,
    ).toContain("28.000,00 TL");
    expect(
      screen.getByText("Tamamlanan Ödemeler").parentElement?.textContent,
    ).toContain("31.500,00 TL");
    expect(document.querySelector("[data-personnel-workspace-header]")).toBeTruthy();
  });
});
