import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { getEntityDefinition } from "./entities";
import {
  buildEntityImportTemplateXlsxBase64,
  buildEntityImportTemplateXlsxFileName,
  buildEntityImportTemplateXlsxHref,
} from "./entity-xlsx-export";

describe("entity xlsx export", () => {
  it("builds an import template workbook with data and instructions sheets", () => {
    const definition = getEntityDefinition("musteriler");

    expect(definition).toBeDefined();

    const workbook = XLSX.read(
      buildEntityImportTemplateXlsxBase64(definition!),
      { type: "base64" },
    );

    expect(workbook.SheetNames).toEqual(["Müşteri Cari Kartları", "Açıklamalar"]);

    const dataRows = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets["Müşteri Cari Kartları"],
      { header: 1 },
    );
    expect(dataRows[0]).toEqual([
      "Kodu",
      "Tanımı",
      "Müşteri Tipi",
      "Vergi No",
      "Telefon",
      "E-posta",
      "Bakiye",
      "Durum",
    ]);
    expect(dataRows[1]).toEqual([
      "MUS-0001",
      "Zorunlu",
      "Opsiyonel",
      "Opsiyonel",
      "Opsiyonel",
      "Opsiyonel",
      "Opsiyonel",
      "Aktif",
    ]);

    const instructionRows = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets["Açıklamalar"],
      { header: 1 },
    );
    expect(instructionRows).toContainEqual([
      "Kodu",
      "Zorunlu",
      "Benzersiz kod. Boş bırakılırsa kayıt alınmaz.",
    ]);
    expect(instructionRows).toContainEqual([
      "Durum",
      "Zorunlu",
      "Aktif veya Pasif olmalıdır.",
    ]);
  });

  it("exposes a downloadable xlsx href and file name for the template", () => {
    const definition = getEntityDefinition("tedarikciler");

    expect(definition).toBeDefined();

    expect(buildEntityImportTemplateXlsxFileName(definition!)).toBe(
      "tanimlar-tedarikciler-sablon.xlsx",
    );
    expect(buildEntityImportTemplateXlsxHref(definition!)).toMatch(
      /^data:application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet;base64,/,
    );
  });
});