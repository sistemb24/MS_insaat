import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { getEntityDefinition } from "./entities";
import {
  inspectEntityImportXlsxWorkbook,
  previewEntityImportXlsx,
} from "./entity-xlsx-import";

describe("previewEntityImportXlsx", () => {
  it("validates xlsx header row against entity definition columns", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportXlsx(
      definition!,
      [],
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
    );

    expect(preview.fileErrors).toEqual([]);
    expect(preview.summary).toEqual({
      invalidRows: 0,
      totalRows: 1,
      validRows: 1,
    });
    expect(preview.validRows[0]).toEqual(
      expect.objectContaining({
        code: "MUS-0002",
        email: "xlsx@example.com",
        name: "XLSX Müşteri",
      }),
    );
  });

  it("maps xlsx rows by header labels when columns are reordered", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportXlsx(
      definition!,
      [],
      createWorkbookBuffer([
        [
          "Tanımı",
          "Kodu",
          "E-posta",
          "Müşteri Tipi",
          "Durum",
          "Bakiye",
          "Telefon",
          "Vergi No",
        ],
        [
          "Sıralı Olmayan Müşteri",
          "MUS-0003",
          "mapped@example.com",
          "Kurumsal",
          "Aktif",
          "0,00 TL",
          "0 242 333 33 33",
          "3333333333",
        ],
      ]),
    );

    expect(preview.fileErrors).toEqual([]);
    expect(preview.summary).toEqual({
      invalidRows: 0,
      totalRows: 1,
      validRows: 1,
    });
    expect(preview.validRows[0]).toEqual(
      expect.objectContaining({
        code: "MUS-0003",
        email: "mapped@example.com",
        name: "Sıralı Olmayan Müşteri",
        phone: "0 242 333 33 33",
        taxNumber: "3333333333",
      }),
    );
  });

  it("maps renamed xlsx columns with an explicit one-to-one header mapping", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportXlsx(
      definition!,
      [],
      createWorkbookBuffer([
        [
          "Kod",
          "Ad",
          "Tip",
          "VKN",
          "Tel",
          "Mail",
          "Cari Bakiye",
          "Statü",
        ],
        [
          "MUS-0004",
          "Eşlenmiş Müşteri",
          "Kurumsal",
          "4444444444",
          "0 242 444 44 44",
          "mapping@example.com",
          "0,00 TL",
          "Aktif",
        ],
      ]),
      {
        Bakiye: "Cari Bakiye",
        Durum: "Statü",
        "E-posta": "Mail",
        Kodu: "Kod",
        "Müşteri Tipi": "Tip",
        Tanımı: "Ad",
        Telefon: "Tel",
        "Vergi No": "VKN",
      },
    );

    expect(preview.fileErrors).toEqual([]);
    expect(preview.validRows[0]).toEqual(
      expect.objectContaining({
        code: "MUS-0004",
        email: "mapping@example.com",
        name: "Eşlenmiş Müşteri",
        taxNumber: "4444444444",
      }),
    );
  });

  it("rejects incomplete manual xlsx mappings before row validation", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportXlsx(
      definition!,
      [],
      createWorkbookBuffer([
        ["Kod", "Ad", "Tip"],
        ["MUS-0004", "Eşlenmiş Müşteri", "Kurumsal"],
      ]),
      { Kodu: "Kod", Tanımı: "Ad" },
    );

    expect(preview.fileErrors).toEqual([
      "Şablon kolonları tanım ile eşleşmiyor.",
    ]);
  });

  it("reports xlsx header mismatches before row validation", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const preview = previewEntityImportXlsx(
      definition!,
      [],
      createWorkbookBuffer([
        ["Kod", "Ad", "Tip"],
        ["", "", ""],
      ]),
    );

    expect(preview.fileErrors).toEqual([
      "Şablon kolonları tanım ile eşleşmiyor.",
    ]);
    expect(preview.summary).toEqual({
      invalidRows: 0,
      totalRows: 0,
      validRows: 0,
    });
    expect(preview.rows).toEqual([]);
  });

  it("inspects and previews the selected worksheet instead of the first worksheet", () => {
    const definition = getEntityDefinition("musteriler");
    const workbookData = createWorkbookBuffer([
      { name: "Açıklamalar", rows: [["Bu sayfa içe aktarılmaz."]] },
      {
        name: "Müşteriler",
        rows: [
          ["Kodu", "Tanımı", "Müşteri Tipi", "Vergi No", "Telefon", "E-posta", "Bakiye", "Durum"],
          ["MUS-0005", "Seçili Sayfa Müşterisi", "Kurumsal", "5555555555", "0 242 555 55 55", "sayfa@example.com", "0,00 TL", "Aktif"],
        ],
      },
    ]);

    expect(inspectEntityImportXlsxWorkbook(workbookData, "Müşteriler")).toEqual({
      fileErrors: [],
      headers: ["Kodu", "Tanımı", "Müşteri Tipi", "Vergi No", "Telefon", "E-posta", "Bakiye", "Durum"],
      sheetNames: ["Açıklamalar", "Müşteriler"],
    });
    expect(
      previewEntityImportXlsx(definition!, [], workbookData, undefined, "Müşteriler")
        .validRows[0],
    ).toEqual(expect.objectContaining({ code: "MUS-0005", name: "Seçili Sayfa Müşterisi" }));
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
