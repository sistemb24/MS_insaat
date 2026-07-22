/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteManagementSurface } from "./site-management-surface";
import { getEntityDefinition } from "@/lib/entities";

afterEach(() => {
  cleanup();
});

describe("SiteManagementSurface", () => {
  it("composes site cards and the real finance read model in the standard shell", () => {
    const definition = getEntityDefinition("santiyeler");

    expect(definition).toBeDefined();

    const activeSite = {
      ...definition!.sampleRows[0],
      code: "SANT-0001",
      name: "MERKEZ ŞANTİYESİ",
      status: "Aktif",
    };
    const passiveSite = {
      ...definition!.sampleRows[1],
      code: "SANT-0002",
      name: "TAMAMLANAN ŞANTİYE",
      status: "Pasif",
    };
    const base = { siteCode: activeSite.code, siteName: activeSite.name };

    render(
      <SiteManagementSurface
        definition={definition!}
        expenses={[{ ...base, grandTotal: 100, status: "Kaydedildi" }] as never}
        initialRows={[activeSite, passiveSite]}
        payrollAccruals={[
          {
            ...base,
            netTotal: 80,
            sourceTimesheetId: "timesheet-linked",
            status: "Kaydedildi",
          },
        ] as never}
        progressPayments={[
          {
            ...base,
            grandTotal: 1_000,
            paymentType: "Şantiye Geliri",
            status: "Kaydedildi",
          },
          {
            ...base,
            grandTotal: 300,
            paymentType: "Taşeron Hakedişi",
            status: "Kaydedildi",
          },
        ] as never}
        purchaseInvoices={[{ ...base, grandTotal: 200, status: "Kaydedildi" }] as never}
        salesInvoices={[{ ...base, grandTotal: 250, status: "Kaydedildi" }] as never}
        timesheets={[
          { ...base, id: "timesheet-linked", netTotal: 70, status: "Kaydedildi" },
          { ...base, id: "timesheet-standalone", netTotal: 20, status: "Kaydedildi" },
        ] as never}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Şantiyeler" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Hakedişlere git" }).getAttribute("href")).toBe(
      "/hakedis",
    );
    expect(screen.getByRole("link", { name: "Giderlere git" }).getAttribute("href")).toBe(
      "/giderler",
    );
    expect(screen.getByRole("link", { name: "Kârlılık raporu" }).getAttribute("href")).toBe(
      "/raporlar#santiye-karlilik",
    );

    const metrics = screen.getByLabelText("Şantiye özet metrikleri");
    expect(within(metrics).getByText("Aktif Şantiye")).toBeDefined();
    expect(within(metrics).getByText("Toplam Gelir")).toBeDefined();
    expect(within(metrics).getByText("Toplam Maliyet")).toBeDefined();
    expect(within(metrics).getByText("Net Sonuç")).toBeDefined();
    expect(within(metrics).getByText("1.250,00 TL")).toBeDefined();
    expect(within(metrics).getByText("700,00 TL")).toBeDefined();

    const financeTable = screen.getByRole("table", { name: "Şantiye finans özeti tablosu" });
    expect(financeTable).toBeDefined();
    expect(within(financeTable).getByRole("columnheader", { name: "İşçilik" })).toBeDefined();
    expect(within(financeTable).getByText("550,00 TL")).toBeDefined();
    expect(screen.getByText("Pozitif")).toBeDefined();
    const projectTable = screen.getByRole("table", {
      name: "Şantiye proje kartları tablosu",
    });
    expect(projectTable).toBeDefined();

    const statusFilters = screen.getByRole("group", {
      name: "Şantiye durum filtresi",
    });
    fireEvent.click(within(statusFilters).getByRole("button", { name: /Pasif/ }));
    expect(within(projectTable).getByText("TAMAMLANAN ŞANTİYE")).toBeDefined();
    expect(within(projectTable).queryByText("MERKEZ ŞANTİYESİ")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Yeni Şantiye" }));
    expect(screen.getByRole("form", { name: "Şantiye kayıt paneli" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Yeni Şantiye" })).toBeDefined();
  });
});
