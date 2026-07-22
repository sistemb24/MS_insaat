/**
 * @vitest-environment jsdom
 */


import * as XLSX from "xlsx";
import {
  fireEvent,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EntityListSurface } from "./entity-list-surface";
import { getEntityDefinition, type EntityRow } from "@/lib/entities";
import type { OperationalReportCounterpartyStatementDetailRow } from "@/lib/reports-service";

afterEach(() => {
  cleanup();
});

describe("EntityListSurface", () => {
  it("applies the customer route list, status filter and create panel standard", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            ...definition!.sampleRows[0],
            code: "MUS-AKTIF",
            name: "Aktif Müşteri",
            status: "Aktif",
          },
          {
            ...definition!.sampleRows[1],
            code: "MUS-PASIF",
            name: "Pasif Müşteri",
            status: "Pasif",
          },
        ]}
        visualVariant="customer"
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(
      screen.getByRole("table", { name: "Müşteri cari kartları tablosu" }),
    ).toBeDefined();
    expect(
      screen.getByRole("group", { name: "Müşteri durum filtresi" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Pasif\s*1/ }));

    expect(screen.queryByText("Aktif Müşteri")).toBeNull();
    expect(screen.getByText("Pasif Müşteri")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Yeni Müşteri" }));

    expect(
      screen.getByRole("form", { name: "Müşteri kayıt paneli" }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: "Yeni Müşteri" }),
    ).toBeDefined();
    expect(document.activeElement).toBe(screen.getByLabelText("Kodu"));
  });

  it("creates a counterparty collection or payment from the selected card", async () => {
    const definition = getEntityDefinition("musteriler");
    const createCounterpartyMovement = vi.fn(async () => ({
      ok: false as const,
      errors: ["test sonucu"],
    }));

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            ...definition!.sampleRows[0],
            code: "MUS-TEST",
            name: "Test Müşterisi",
            status: "Aktif",
          },
        ]}
        cashBankAccountOptions={[{ code: "KASA-0001", name: "Merkez Kasa" }]}
        persistence={{ createCounterpartyMovement }}
      />,
    );

    expect(
      (screen.getByLabelText("İşlem tarihi") as HTMLInputElement).value,
    ).toBe(new Date().toISOString().slice(0, 10));

    fireEvent.change(screen.getByLabelText("İşlem tarihi"), {
      target: { value: "2026-07-14" },
    });
    fireEvent.change(screen.getByLabelText("Tutar"), {
      target: { value: "1250.50" },
    });
    fireEvent.change(screen.getByLabelText("Evrak No"), {
      target: { value: "TAH-TEST-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tahsilat/Ödeme Kaydet" }));

    await waitFor(() => expect(createCounterpartyMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        accountCode: "KASA-0001",
        amount: 1250.5,
        counterpartyCode: "MUS-TEST",
        counterpartySlug: "musteriler",
        movementType: "Tahsilat",
      }),
    ));
  });

  it("supports the first CRUD workflow for definition pages", () => {
    const definition = getEntityDefinition("santiyeler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} />);

    expect(
      screen.getByText("NOA Demo Tenant / DEMO İNŞAAT / 2026"),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    expect(screen.getByDisplayValue("SANT-0006")).toBeDefined();
    expect(document.activeElement).toBe(screen.getByLabelText("Kodu"));

    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getAllByText("Tanım zorunludur.").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Tanımı"), {
      target: { value: "Yeni SaaS Şantiyesi" },
    });
    fireEvent.change(screen.getByLabelText("Yetkili"), {
      target: { value: "Ayşe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    const newRow = screen.getByRole("row", { name: /SANT-0006/i });
    expect(within(newRow).getByText("Yeni SaaS Şantiyesi")).toBeDefined();

    fireEvent.click(within(newRow).getByRole("button", { name: "Seç" }));
    fireEvent.click(screen.getByRole("button", { name: "Pasifleştir" }));

    expect(within(newRow).getByText("Pasif")).toBeDefined();
  });

  it("renders P0 supplier category and subcontractor contract fields in create forms", () => {
    const supplierDefinition = getEntityDefinition("tedarikciler");
    const subcontractorDefinition = getEntityDefinition("taseronlar");

    expect(supplierDefinition).toBeDefined();
    expect(subcontractorDefinition).toBeDefined();

    const { unmount } = render(
      <EntityListSurface definition={supplierDefinition!} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    expect(screen.getByLabelText("Kategori")).toBeDefined();

    unmount();

    render(<EntityListSurface definition={subcontractorDefinition!} />);

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    expect(screen.getByLabelText("Sözleşme No")).toBeDefined();
    expect(screen.getByLabelText("Sözleşme Başlangıç")).toBeDefined();
    expect(screen.getByLabelText("Sözleşme Bitiş")).toBeDefined();
  });
  it("uses server actions when persistence handlers are provided", async () => {
    const definition = getEntityDefinition("tedarikciler");
    const createRow = vi.fn(async (_slug: string, values) => ({
      ok: true as const,
      data: {
        code: "TED-0006",
        name: values.name,
        taxNumber: values.taxNumber,
        phone: values.phone,
        balance: values.balance,
        status: "Aktif",
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z",
      },
    }));
    const deactivateRow = vi.fn(async (_slug: string, code: string) => ({
      ok: true as const,
      data: {
        code,
        name: "Server Tedarikçi",
        taxNumber: "3333333333",
        phone: "0 242 333 33 33",
        balance: "0,00 TL",
        status: "Pasif",
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:05:00.000Z",
      },
    }));

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        persistence={{
          createRow,
          deactivateRow,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Yeni" }));
    fireEvent.change(screen.getByLabelText("Tanımı"), {
      target: { value: "Server Tedarikçi" },
    });
    fireEvent.change(screen.getByLabelText("Vergi No"), {
      target: { value: "3333333333" },
    });
    fireEvent.change(screen.getByLabelText("Telefon"), {
      target: { value: "0 242 333 33 33" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(createRow).toHaveBeenCalledWith(
        "tedarikciler",
        expect.objectContaining({
          code: "TED-0006",
          name: "Server Tedarikçi",
        }),
      ),
    );

    const savedRow = await screen.findByRole("row", { name: /TED-0006/i });
    expect(within(savedRow).getByText("Server Tedarikçi")).toBeDefined();

    fireEvent.click(within(savedRow).getByRole("button", { name: "Seç" }));
    fireEvent.click(screen.getByRole("button", { name: "Pasifleştir" }));

    await waitFor(() =>
      expect(deactivateRow).toHaveBeenCalledWith("tedarikciler", "TED-0006"),
    );
    expect(within(savedRow).getByText("Pasif")).toBeDefined();
  });

  it("shows an empty state when a persisted list has no rows", () => {
    const definition = getEntityDefinition("personel");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    expect(screen.getByText("Henüz kayıt yok")).toBeDefined();
    expect(
      screen.getByText("Yeni butonu ile ilk tanım kaydını oluşturabilirsiniz."),
    ).toBeDefined();
  });

  it("downloads the customer xlsx import template from the toolbar", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} />);

    const templateLink = screen.getByRole("link", {
      name: "Şablon",
    });

    expect(templateLink.getAttribute("download")).toBe(
      "tanimlar-musteriler-sablon.xlsx",
    );
    expect(templateLink.getAttribute("href")).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet;base64,/,
    );
  });
  it("previews customer csv import rows and applies only valid rows", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "MUS-0001",
            customerType: "Kurumsal",
            email: "mevcut@example.com",
            name: "MEVCUT MÜŞTERİ",
            phone: "0 242 111 11 11",
            status: "Aktif",
            taxNumber: "1111111111",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));
    fireEvent.change(screen.getByLabelText("CSV içe aktar verisi"), {
      target: {
        value: [
          "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
          "MUS-0002;Yeni Müşteri;Kurumsal;3333333333;0 242 333 33 33;new@example.com;0,00 TL;Aktif",
          "MUS-0003;;Bireysel;;;;;Aktif",
        ].join("\r\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Önizle" }));

    expect(
      screen.getByText("İçe aktarım önizlemesi: 1 geçerli, 1 hatalı."),
    ).toBeDefined();
    expect(screen.getAllByText("3. satır").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tanım zorunludur.").length).toBeGreaterThan(0);

    const importStatusTable = screen.getByLabelText(
      "İçe aktarım satır durumları",
    );
    const validPreviewRow = within(importStatusTable).getByRole("row", {
      name: /2\. satır\s+MUS-0002\s+Yeni Müşteri\s+Geçerli/i,
    });
    const invalidPreviewRow = within(importStatusTable).getByRole("row", {
      name: /3\. satır\s+MUS-0003\s+-\s+Hatalı\s+Tanım zorunludur\./i,
    });

    expect(validPreviewRow.className).toContain("ds-success");
    expect(invalidPreviewRow.className).toContain("ds-danger");

    const previewErrorReportLink = screen.getByRole("link", {
      name: "Önizleme hata raporu CSV indir",
    });
    expect(previewErrorReportLink.getAttribute("download")).toBe(
      "tanimlar-musteriler-hata-raporu.csv",
    );
    expect(
      decodeURIComponent(previewErrorReportLink.getAttribute("href") ?? ""),
    ).toContain("3;MUS-0003;;Tanım zorunludur.");

    fireEvent.click(
      screen.getByRole("button", { name: "Geçerli Satırları Uygula" }),
    );

    const importedRow = screen.getByRole("row", { name: /MUS-0002/i });
    expect(within(importedRow).getByText("Yeni Müşteri")).toBeDefined();
    expect(screen.getByText("1 geçerli kayıt listeye eklendi.")).toBeDefined();
    expect(screen.getByText("İçe aktarım sonucu")).toBeDefined();
    expect(screen.getByText("Eklenen kayıt: 1")).toBeDefined();
    expect(screen.getByText("Atlanan hatalı satır: 1")).toBeDefined();

    const errorReportLink = screen.getByRole("link", {
      name: "Hata raporu CSV indir",
    });
    expect(errorReportLink.getAttribute("download")).toBe(
      "tanimlar-musteriler-hata-raporu.csv",
    );

    const errorReportCsv = decodeURIComponent(
      errorReportLink.getAttribute("href") ?? "",
    );
    expect(errorReportCsv).toContain("Satır No;Kod;Tanım;Hatalar");
    expect(errorReportCsv).toContain("3;MUS-0003;;Tanım zorunludur.");
  });
  it("shows the xlsx import wizard shell and accepts a valid workbook file", async () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    expect(screen.getByText("XLSX içe aktar sihirbazı")).toBeDefined();
    expect(screen.getByText("1. Şablon")).toBeDefined();
    expect(screen.getByText("2. Ön kontrol")).toBeDefined();
    expect(screen.getByText("3. Sonuç")).toBeDefined();

    const file = new File(
      [
        createWorkbookBuffer([
          [
            "Kodu",
            "Tanımı",
            "Müşteri Tipi",
            "Vergi No",
            "Telefon",
            "E-posta",
            "Bakiye",
            "Durum",
          ],
          [
            "MUS-0002",
            "XLSX Müşteri",
            "Kurumsal",
            "3333333333",
            "0 242 333 33 33",
            "xlsx@example.com",
            "0,00 TL",
            "Aktif",
          ],
        ]),
      ],
      "musteriler.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    fireEvent.change(screen.getByLabelText("XLSX dosyası seç"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("musteriler.xlsx XLSX önizlemesi hazır: 1 geçerli, 0 hatalı."),
    ).toBeDefined();
    expect(screen.getByText("Dosya ön kontrolü hazır: musteriler.xlsx")).toBeDefined();
    expect(screen.getByText(/XLSX önizleme: 1 geçerli,\s*0 hatalı\./)).toBeDefined();
    expect(screen.getByText("İçe aktarım önizlemesi: 1 geçerli, 0 hatalı.")).toBeDefined();
  });

  it("lets the user choose the worksheet to import", async () => {
    const definition = getEntityDefinition("musteriler");

    render(<EntityListSurface definition={definition!} initialRows={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    const file = new File(
      [
        createWorkbookBuffer([
          { name: "Açıklamalar", rows: [["Bu sayfa içe aktarılmaz."]] },
          {
            name: "Müşteriler",
            rows: [
              ["Kodu", "Tanımı", "Müşteri Tipi", "Vergi No", "Telefon", "E-posta", "Bakiye", "Durum"],
              ["MUS-0006", "İkinci Sayfa Müşterisi", "Kurumsal", "6666666666", "0 242 666 66 66", "ikinci@example.com", "0,00 TL", "Aktif"],
            ],
          },
        ]),
      ],
      "cok-sayfali-musteriler.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );

    fireEvent.change(screen.getByLabelText("XLSX dosyası seç"), {
      target: { files: [file] },
    });
    const sheetSelect = await screen.findByLabelText("XLSX çalışma sayfası");
    fireEvent.change(sheetSelect, { target: { value: "Müşteriler" } });

    expect(
      await screen.findByText("Müşteriler çalışma sayfası için XLSX önizlemesi hazır."),
    ).toBeDefined();
    expect(screen.getByText("İkinci Sayfa Müşterisi")).toBeDefined();
  });

  it("allows manual xlsx header mapping for renamed customer columns", async () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    const file = new File(
      [
        createWorkbookBuffer([
          [
            "Kod",
            "Ad",
            "Tip",
            "VergiNo",
            "TelefonNumarasi",
            "Eposta",
            "BakiyeTutar",
            "Durum",
          ],
          [
            "MUS-0002",
            "Eşlemeli Müşteri",
            "Kurumsal",
            "3333333333",
            "0 242 333 33 33",
            "mapped@example.com",
            "0,00 TL",
            "Aktif",
          ],
        ]),
      ],
      "eslemeli-musteriler.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    fireEvent.change(screen.getByLabelText("XLSX dosyası seç"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("XLSX kolon eşleme"),
    ).toBeDefined();

    fireEvent.change(screen.getByLabelText("Kodu için XLSX kolonu"), {
      target: { value: "Kod" },
    });
    fireEvent.change(screen.getByLabelText("Tanımı için XLSX kolonu"), {
      target: { value: "Ad" },
    });
    fireEvent.change(screen.getByLabelText("Müşteri Tipi için XLSX kolonu"), {
      target: { value: "Tip" },
    });
    fireEvent.change(screen.getByLabelText("Vergi No için XLSX kolonu"), {
      target: { value: "VergiNo" },
    });
    fireEvent.change(screen.getByLabelText("Telefon için XLSX kolonu"), {
      target: { value: "TelefonNumarasi" },
    });
    fireEvent.change(screen.getByLabelText("E-posta için XLSX kolonu"), {
      target: { value: "Eposta" },
    });
    fireEvent.change(screen.getByLabelText("Bakiye için XLSX kolonu"), {
      target: { value: "BakiyeTutar" },
    });
    fireEvent.change(screen.getByLabelText("Durum için XLSX kolonu"), {
      target: { value: "Durum" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Eşlemeyi Uygula" }));

    expect(
      await screen.findByText("XLSX başlık eşlemesi uygulandı."),
    ).toBeDefined();
    expect(
      screen.getByText("İçe aktarım önizlemesi: 1 geçerli, 0 hatalı."),
    ).toBeDefined();
    expect(screen.getByText("Eşlemeli Müşteri")).toBeDefined();
  });

  it("accepts an xlsx workbook dropped onto the import drop zone", async () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    const file = new File(
      [
        createWorkbookBuffer([
          [
            "Kodu",
            "Tanımı",
            "Müşteri Tipi",
            "Vergi No",
            "Telefon",
            "E-posta",
            "Bakiye",
            "Durum",
          ],
          [
            "MUS-0002",
            "Sürükle Bırak Müşteri",
            "Kurumsal",
            "3333333333",
            "0 242 333 33 33",
            "drop@example.com",
            "0,00 TL",
            "Aktif",
          ],
        ]),
      ],
      "surukle-birak-musteriler.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    fireEvent.drop(screen.getByLabelText("XLSX dosyasını sürükle bırak"), {
      dataTransfer: {
        files: [file],
      },
    });

    expect(
      await screen.findByText(
        "surukle-birak-musteriler.xlsx XLSX önizlemesi hazır: 1 geçerli, 0 hatalı.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Sürükle Bırak Müşteri")).toBeDefined();
  });

  it("rejects xlsx import files larger than fifteen megabytes", async () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    const oversizedFile = new File(
      [new Uint8Array(15 * 1024 * 1024 + 1)],
      "buyuk-musteriler.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    );

    fireEvent.change(screen.getByLabelText("XLSX dosyası seç"), {
      target: { files: [oversizedFile] },
    });

    expect(
      await screen.findByText("XLSX dosyası 15 MB sınırını aşamaz."),
    ).toBeDefined();
  });
  it("loads csv import text from a selected file", async () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    render(<EntityListSurface definition={definition!} initialRows={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));

    const file = new File(
      [
        [
          "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
          "MUS-0002;Dosyadan Müşteri;Kurumsal;3333333333;0 242 333 33 33;file@example.com;0,00 TL;Aktif",
        ].join("\r\n"),
      ],
      "musteriler.csv",
      { type: "text/csv" },
    );

    fireEvent.change(screen.getByLabelText("CSV dosyası seç"), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("musteriler.csv içe aktarım alanına yüklendi."),
    ).toBeDefined();
    expect(screen.getByLabelText("CSV içe aktar verisi")).toHaveProperty(
      "value",
      expect.stringContaining("Dosyadan Müşteri"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Önizle" }));

    expect(
      screen.getByText("İçe aktarım önizlemesi: 1 geçerli, 0 hatalı."),
    ).toBeDefined();
  });
  it("persists valid csv import rows through server actions when available", async () => {
    const definition = getEntityDefinition("musteriler");
    const createRow = vi.fn(async (_slug: string, values) => ({
      ok: true as const,
      data: {
        ...values,
        tenantId: "tenant-noa-demo",
        companyId: "company-demo-insaat",
        periodId: "period-2026",
        createdBy: "user-main",
        updatedBy: "user-main",
        createdAt: "2026-06-30T10:00:00.000Z",
        updatedAt: "2026-06-30T10:00:00.000Z",
      },
    }));

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "MUS-0001",
            customerType: "Kurumsal",
            email: "mevcut@example.com",
            name: "MEVCUT MÜŞTERİ",
            phone: "0 242 111 11 11",
            status: "Aktif",
            taxNumber: "1111111111",
          },
        ]}
        persistence={{
          createRow,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));
    fireEvent.change(screen.getByLabelText("CSV içe aktar verisi"), {
      target: {
        value: [
          "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
          "MUS-0002;Kalıcı Müşteri;Kurumsal;3333333333;0 242 333 33 33;new@example.com;0,00 TL;Aktif",
        ].join("\r\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Önizle" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Geçerli Satırları Uygula" }),
    );

    await waitFor(() =>
      expect(createRow).toHaveBeenCalledWith(
        "musteriler",
        expect.objectContaining({
          code: "MUS-0002",
          name: "Kalıcı Müşteri",
        }),
      ),
    );
    expect(
      await screen.findByText("1 geçerli kayıt kalıcı kaynağa eklendi."),
    ).toBeDefined();
    expect(
      within(screen.getByRole("row", { name: /MUS-0002/i })).getByText(
        "Kalıcı Müşteri",
      ),
    ).toBeDefined();
  });
  it("prefers the bulk import server action when it is available", async () => {
    const definition = getEntityDefinition("musteriler");
    const createRow = vi.fn();
    const createRows = vi.fn(async (_slug: string, rows: EntityRow[]) => ({
      ok: true as const,
      data: {
        rows: rows.map((row) => ({
          ...row,
          tenantId: "tenant-noa-demo",
          companyId: "company-demo-insaat",
          periodId: "period-2026",
          createdBy: "user-main",
          updatedBy: "user-main",
          createdAt: "2026-06-30T10:00:00.000Z",
          updatedAt: "2026-06-30T10:00:00.000Z",
        })),
      },
    }));

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[]}
        persistence={{
          createRow,
          createRows,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "İçe Aktar" }));
    fireEvent.change(screen.getByLabelText("CSV içe aktar verisi"), {
      target: {
        value: [
          "Kodu;Tanımı;Müşteri Tipi;Vergi No;Telefon;E-posta;Bakiye;Durum",
          "MUS-0002;Toplu Müşteri;Kurumsal;3333333333;0 242 333 33 33;bulk@example.com;0,00 TL;Aktif",
        ].join("\r\n"),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Önizle" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Geçerli Satırları Uygula" }),
    );

    await waitFor(() =>
      expect(createRows).toHaveBeenCalledWith("musteriler", [
        expect.objectContaining({
          code: "MUS-0002",
          name: "Toplu Müşteri",
        }),
      ]),
    );
    expect(createRow).not.toHaveBeenCalled();
    expect(
      await screen.findByText("1 geçerli kayıt kalıcı kaynağa eklendi."),
    ).toBeDefined();
  });
  it("exports the filtered definition rows from the Excel toolbar action", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "TED-0001",
            name: "ABC Beton",
            phone: "0 242 000 00 00",
            status: "Aktif",
            taxNumber: "1111111111",
          },
          {
            balance: "0,00 TL",
            code: "TED-0002",
            name: "DEF Hafriyat",
            phone: "0 242 111 11 11",
            status: "Aktif",
            taxNumber: "2222222222",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Arama"), {
      target: { value: "DEF" },
    });

    const excelLink = screen.getByRole("link", {
      name: "Excel",
    });

    expect(excelLink.getAttribute("download")).toBe(
      "tanimlar-tedarikciler.csv",
    );
    expect(decodeURIComponent(excelLink.getAttribute("href") ?? "")).toContain(
      "DEF Hafriyat",
    );
    expect(decodeURIComponent(excelLink.getAttribute("href") ?? "")).not.toContain(
      "ABC Beton",
    );
  });

  it("prints the filtered definition row scope from the print toolbar action", () => {
    const definition = getEntityDefinition("tedarikciler");
    const print = vi.fn();

    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "TED-0001",
            name: "ABC Beton",
            phone: "0 242 000 00 00",
            status: "Aktif",
            taxNumber: "1111111111",
          },
          {
            balance: "0,00 TL",
            code: "TED-0002",
            name: "DEF Hafriyat",
            phone: "0 242 111 11 11",
            status: "Aktif",
            taxNumber: "2222222222",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Arama"), {
      target: { value: "DEF" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Yazdır" }));

    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByText("Yazdırma kapsamı hazır: 1 kayıt.")).toBeDefined();
  });

  it("shows account statement rows for the selected supplier or subcontractor card", () => {
    const definition = getEntityDefinition("tedarikciler");
    const statementRows: OperationalReportCounterpartyStatementDetailRow[] = [
      {
        amount: -12000,
        balanceAfter: -12000,
        counterpartyName: "ABC Beton",
        date: "2026-06-20",
        documentNo: "FAT-0001",
        effect: "Borç",
        source: "Fatura",
        targetHref: "/faturalar?evrak=FAT-0001",
      },
      {
        amount: 5000,
        balanceAfter: -7000,
        counterpartyName: "ABC Beton",
        date: "2026-06-30",
        documentNo: "ODM-FAT-0001",
        effect: "Ödeme",
        ledgerDocumentNo: "YVM-ODM-CARI-ODM-FAT-0001",
        source: "Kasa/Banka",
        targetHref: "/kasa-banka?evrak=ODM-FAT-0001",
      },
      {
        amount: 15000,
        balanceAfter: 15000,
        counterpartyName: "ŞİRKET MERKEZ ŞANTİYESİ",
        date: "2026-06-27",
        documentNo: "HAK-GELIR-0001",
        effect: "Alacak",
        source: "Hakediş",
        targetHref: "/hakedis?evrak=HAK-GELIR-0001",
      },
    ];

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "TED-0001",
            name: "ABC Beton",
            phone: "0 242 000 00 00",
            status: "Aktif",
            taxNumber: "1111111111",
          },
        ]}
        statementRows={statementRows}
      />,
    );

    expect(screen.getByText("Hesap Ekstresi")).toBeDefined();

    const statementTable = screen.getByLabelText("Seçili cari hesap ekstresi");

    expect(within(statementTable).getByText("FAT-0001")).toBeDefined();
    expect(within(statementTable).getByText("ODM-FAT-0001")).toBeDefined();
    expect(within(statementTable).getByText("YVM-ODM-CARI-ODM-FAT-0001")).toBeDefined();
    expect(
      within(statementTable).getAllByText("-12.000,00 TL").length,
    ).toBeGreaterThan(0);
    expect(within(statementTable).getByText("-7.000,00 TL")).toBeDefined();
    expect(
      within(statementTable)
        .getByRole("link", {
          name: "FAT-0001 evrakına git",
        })
        .getAttribute("href"),
    ).toBe("/faturalar?evrak=FAT-0001");
    expect(within(statementTable).queryByText("HAK-GELIR-0001")).toBeNull();

    const csvLink = screen.getByRole("link", {
      name: "Seçili cari hesap ekstresi CSV indir",
    });

    expect(csvLink.getAttribute("download")).toBe(
      "cari-ekstresi-abc-beton.csv",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "FAT-0001",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "ODM-FAT-0001",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).not.toContain(
      "HAK-GELIR-0001",
    );
  });

  it("shows account statement rows for the selected customer card", () => {
    const definition = getEntityDefinition("musteriler");
    const statementRows: OperationalReportCounterpartyStatementDetailRow[] = [
      {
        amount: 25000,
        balanceAfter: 25000,
        counterpartyName: "ÖRNEK MÜŞTERİ",
        date: "2026-06-28",
        documentNo: "HAK-GELIR-0002",
        effect: "Alacak",
        source: "Hakediş",
        targetHref: "/hakedis?evrak=HAK-GELIR-0002",
      },
      {
        amount: -10000,
        balanceAfter: 15000,
        counterpartyName: "ÖRNEK MÜŞTERİ",
        date: "2026-06-30",
        documentNo: "THS-HAK-0002",
        effect: "Tahsilat",
        source: "Kasa/Banka",
        targetHref: "/kasa-banka?evrak=THS-HAK-0002",
      },
      {
        amount: -12000,
        balanceAfter: -12000,
        counterpartyName: "ABC Beton",
        date: "2026-06-20",
        documentNo: "FAT-0001",
        effect: "Borç",
        source: "Fatura",
        targetHref: "/faturalar?evrak=FAT-0001",
      },
    ];

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "15.000,00 TL",
            code: "MUS-0001",
            customerType: "Kurumsal",
            email: "musteri@example.com",
            name: "ÖRNEK MÜŞTERİ",
            phone: "0 242 222 22 22",
            status: "Aktif",
            taxNumber: "2222222222",
          },
        ]}
        statementRows={statementRows}
      />,
    );

    const statementTable = screen.getByLabelText("Seçili cari hesap ekstresi");

    expect(within(statementTable).getByText("HAK-GELIR-0002")).toBeDefined();
    expect(within(statementTable).getByText("THS-HAK-0002")).toBeDefined();
    expect(within(statementTable).queryByText("FAT-0001")).toBeNull();
    expect(
      within(statementTable)
        .getByRole("link", {
          name: "HAK-GELIR-0002 evrakına git",
        })
        .getAttribute("href"),
    ).toBe("/hakedis?evrak=HAK-GELIR-0002");

    const csvLink = screen.getByRole("link", {
      name: "Seçili cari hesap ekstresi CSV indir",
    });

    expect(csvLink.getAttribute("download")).toBe(
      "cari-ekstresi-ornek-musteri.csv",
    );
    expect(decodeURIComponent(csvLink.getAttribute("href") ?? "")).toContain(
      "HAK-GELIR-0002",
    );
  });

  it("shows the customer list balance from account statement movements", () => {
    const definition = getEntityDefinition("musteriler");
    const statementRows: OperationalReportCounterpartyStatementDetailRow[] = [
      {
        amount: 25000,
        balanceAfter: 25000,
        counterpartyName: "ÖRNEK MÜŞTERİ",
        date: "2026-06-28",
        documentNo: "HAK-GELIR-0002",
        effect: "Alacak",
        source: "Hakediş",
        targetHref: "/hakedis?evrak=HAK-GELIR-0002",
      },
      {
        amount: -10000,
        balanceAfter: 15000,
        counterpartyName: "ÖRNEK MÜŞTERİ",
        date: "2026-06-30",
        documentNo: "THS-HAK-0002",
        effect: "Tahsilat",
        source: "Kasa/Banka",
        targetHref: "/kasa-banka?evrak=THS-HAK-0002",
      },
    ];

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            balance: "0,00 TL",
            code: "MUS-0001",
            customerType: "Kurumsal",
            email: "musteri@example.com",
            name: "ÖRNEK MÜŞTERİ",
            phone: "0 242 222 22 22",
            status: "Aktif",
            taxNumber: "2222222222",
          },
        ]}
        statementRows={statementRows}
      />,
    );

    const customerRow = screen.getByRole("row", { name: /MUS-0001/i });

    expect(within(customerRow).getByText("15.000,00 TL")).toBeDefined();
  });
  it("shows server action pending and error states without losing the selected row", async () => {
    const definition = getEntityDefinition("kasa-banka");
    const deferred = createDeferred<{
      ok: false;
      errors: string[];
    }>();
    const deactivateRow = vi.fn(() => deferred.promise);

    expect(definition).toBeDefined();

    render(
      <EntityListSurface
        definition={definition!}
        initialRows={[
          {
            code: "KASA-0001",
            name: "MERKEZ KASA",
            type: "Kasa",
            currency: "TL",
            balance: "0,00 TL",
            status: "Aktif",
          },
        ]}
        persistence={{
          deactivateRow,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pasifleştir" }));

    expect(screen.getByText("Sunucu işlemi sürüyor: Pasifleştir")).toBeDefined();

    deferred.resolve({
      ok: false,
      errors: ["Kayıt hareket gördüğü için pasifleştirilemedi."],
    });

    expect(
      await screen.findByText("Sunucu işlemi tamamlanamadı"),
    ).toBeDefined();
    expect(
      screen.getByText("Kayıt hareket gördüğü için pasifleştirilemedi."),
    ).toBeDefined();
    expect(screen.getByText("Aktif")).toBeDefined();
  });
});

function createWorkbookBuffer(
  sheets: string[][] | Array<{ name: string; rows: string[][] }>,
) {
  const workbook = XLSX.utils.book_new();
  const normalizedSheets = Array.isArray(sheets[0])
    ? [{ name: "Müşteriler", rows: sheets as string[][] }]
    : (sheets as Array<{ name: string; rows: string[][] }>);

  normalizedSheets.forEach((sheet) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  });

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
}
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}


