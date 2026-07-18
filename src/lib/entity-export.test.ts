import { describe, expect, test } from "vitest";

import type { EntityDefinition, EntityRow } from "./entities";
import {
  buildEntityImportErrorReportCsv,
  buildEntityImportTemplateCsv,
  buildEntityImportTemplateCsvFileName,
  buildEntityRowsCsv,
  buildEntityRowsCsvFileName,
} from "./entity-export";

describe("entity export helpers", () => {
  test("builds definition based csv with escaped visible column values", () => {
    const definition = createDefinition();
    const rows: EntityRow[] = [
      {
        balance: "1.000,00 TL",
        code: "TED-0001",
        name: "ABC Beton; Antalya",
        phone: "0 242 000 00 00",
        status: "Aktif",
        taxNumber: "1111111111",
      },
    ];

    expect(buildEntityRowsCsv(definition, rows)).toBe(
      [
        "Kodu;Tanımı;Vergi No;Telefon;Bakiye;Durum",
        'TED-0001;"ABC Beton; Antalya";1111111111;0 242 000 00 00;1.000,00 TL;Aktif',
      ].join("\r\n"),
    );
  });

  test("builds an import template csv from definition columns", () => {
    expect(buildEntityImportTemplateCsv(createDefinition())).toBe(
      [
        "Kodu;Tanımı;Vergi No;Telefon;Bakiye;Durum",
        "TED-0001;Zorunlu;Opsiyonel;Opsiyonel;Opsiyonel;Aktif",
      ].join("\r\n"),
    );
  });

  test("builds csv import error report for invalid rows", () => {
    const report = buildEntityImportErrorReportCsv({
      fileErrors: [],
      rows: [
        {
          errors: ["Tanım zorunludur.", "Kod dosya içinde tekrar ediyor."],
          rowNumber: 3,
          values: {
            balance: "0,00 TL",
            code: "TED-0002",
            name: "",
            phone: "",
            status: "Aktif",
            taxNumber: "",
          },
        },
      ],
      summary: {
        invalidRows: 1,
        totalRows: 1,
        validRows: 0,
      },
      validRows: [],
    });

    expect(report).toBe(
      [
        "Satır No;Kod;Tanım;Hatalar",
        "3;TED-0002;;Tanım zorunludur. Kod dosya içinde tekrar ediyor.",
      ].join("\r\n"),
    );
  });
  test("builds a stable import template csv file name", () => {
    expect(buildEntityImportTemplateCsvFileName(createDefinition())).toBe(
      "tanimlar-tedarikciler-sablon.csv",
    );
  });
  test("builds a stable csv file name from the definition slug", () => {
    expect(buildEntityRowsCsvFileName(createDefinition())).toBe(
      "tanimlar-tedarikciler.csv",
    );
  });
});

function createDefinition(): EntityDefinition {
  return {
    codePrefix: "TED",
    columns: [
      { key: "code", label: "Kodu" },
      { key: "name", label: "Tanımı" },
      { key: "taxNumber", label: "Vergi No" },
      { key: "phone", label: "Telefon" },
      { align: "right", key: "balance", label: "Bakiye" },
      { align: "center", key: "status", label: "Durum" },
    ],
    description: "Tedarikçi tanımı",
    sampleRows: [],
    slug: "tedarikciler",
    templateSources: [],
    title: "Tedarikçi Tanımları",
  };
}

