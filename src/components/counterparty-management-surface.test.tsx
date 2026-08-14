/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CounterpartyManagementSurface } from "./counterparty-management-surface";
import { getEntityDefinition } from "@/lib/entities";

afterEach(() => {
  cleanup();
});

describe("CounterpartyManagementSurface", () => {
  it("shows cross-party identity diagnostics without merging conflicting cards", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(
      <CounterpartyManagementSurface
        definition={definition!}
        initialRows={[
          {
            ...definition!.sampleRows[0],
            code: "MUS-0001",
            name: "ORTAK UNVAN",
            taxNumber: "1234567890",
          },
        ]}
        partyGroups={[
          {
            slug: "musteriler",
            rows: [
              {
                ...definition!.sampleRows[0],
                code: "MUS-0001",
                name: "ORTAK UNVAN",
                taxNumber: "1234567890",
              },
            ],
          },
          {
            slug: "tedarikciler",
            rows: [
              {
                code: "TED-0001",
                name: "BAŞKA UNVAN",
                taxNumber: "1234567890",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Cari kimlik kontrolü: 1 tanı")).toBeDefined();
    expect(
      screen.getByText(
        "Vergi numarası birden fazla cari kimliğine bağlı: 1234567890",
      ),
    ).toBeDefined();
  });

  it("composes the customer route with one page heading and real summary metrics", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(
      <CounterpartyManagementSurface
        definition={definition!}
        initialRows={[
          {
            ...definition!.sampleRows[0],
            code: "MUS-0001",
            status: "Aktif",
          },
          {
            ...definition!.sampleRows[1],
            code: "MUS-0002",
            status: "Pasif",
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Müşteriler" }),
    ).toBeDefined();

    const metrics = screen.getByLabelText("Müşteri özet metrikleri");
    expect(within(metrics).getByText("Toplam Müşteri")).toBeDefined();
    expect(within(metrics).getByText("Aktif Müşteri")).toBeDefined();
    expect(within(metrics).getByText("Toplam Alacak")).toBeDefined();
    expect(within(metrics).getByText("Toplam Borç")).toBeDefined();
    expect(within(metrics).getByText("2")).toBeDefined();
    expect(within(metrics).getByText("1")).toBeDefined();

    expect(
      screen.getByRole("table", { name: "Müşteri cari kartları tablosu" }),
    ).toBeDefined();
    expect(screen.queryByText("Kaynak HTML şablonları")).toBeNull();
  });

  it("composes the supplier route with category filtering and the real invoice workflow", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    render(
      <CounterpartyManagementSurface
        definition={definition!}
        initialRows={definition!.sampleRows.slice(0, 3)}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Tedarikçiler" }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Alış faturalarına git" }).getAttribute("href"),
    ).toBe("/faturalar");

    const metrics = screen.getByLabelText("Tedarikçi özet metrikleri");
    expect(within(metrics).getByText("Toplam Tedarikçi")).toBeDefined();
    expect(within(metrics).getByText("Aktif Tedarikçi")).toBeDefined();
    expect(within(metrics).getAllByText("3")).toHaveLength(2);

    expect(
      screen.getByRole("table", { name: "Tedarikçi cari kartları tablosu" }),
    ).toBeDefined();
    fireEvent.change(screen.getByLabelText("Tedarikçi kategorisi"), {
      target: { value: "Hizmet" },
    });
    expect(screen.getByText("GÜVEN NAKLİYAT LTD. ŞTİ.")).toBeDefined();
    expect(screen.queryByText("YAPI MALZEMELERİ A.Ş.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Yeni Tedarikçi" }));
    expect(
      screen.getByRole("form", { name: "Tedarikçi kayıt paneli" }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: "Yeni Tedarikçi" }),
    ).toBeDefined();
  });

  it("composes the subcontractor route with contract filtering and the real progress payment workflow", () => {
    const definition = getEntityDefinition("taseronlar");

    expect(definition).toBeDefined();

    render(
      <CounterpartyManagementSurface
        definition={definition!}
        initialRows={[
          definition!.sampleRows[0],
          {
            ...definition!.sampleRows[1],
            code: "TAS-0002",
            contractNo: "",
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Taşeronlar" }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Hakedişlere git" }).getAttribute("href"),
    ).toBe("/hakedis");

    const metrics = screen.getByLabelText("Taşeron özet metrikleri");
    expect(within(metrics).getByText("Toplam Taşeron")).toBeDefined();
    expect(within(metrics).getByText("Aktif Taşeron")).toBeDefined();
    expect(within(metrics).getByText("Sözleşmeli Taşeron")).toBeDefined();
    expect(within(metrics).getByText("Toplam Borç")).toBeDefined();

    expect(
      screen.getByRole("table", { name: "Taşeron cari kartları tablosu" }),
    ).toBeDefined();
    fireEvent.change(screen.getByLabelText("Taşeron sözleşme filtresi"), {
      target: { value: "Sözleşmesiz" },
    });
    expect(screen.getByText("DOĞAN YAPI TAŞERONLUK LTD. ŞTİ.")).toBeDefined();
    expect(screen.queryByText("ŞİRKETİN TAŞERONU")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Yeni Taşeron" }));
    expect(
      screen.getByRole("form", { name: "Taşeron kayıt paneli" }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: "Yeni Taşeron" }),
    ).toBeDefined();
  });
});
