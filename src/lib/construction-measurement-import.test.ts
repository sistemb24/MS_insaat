import { describe, expect, it } from "vitest";

import {
  CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION,
  CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES,
  CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS,
  ConstructionMeasurementImportDomainError,
  canTransitionConstructionMeasurementImportStatus,
  createConstructionMeasurementImportIdempotencyKey,
  getConstructionMeasurementImportPermission,
  normalizeConstructionMeasurementImportFileName,
  parseConstructionMeasurementImportCsv,
} from "./construction-measurement-import";

const encoder = new TextEncoder();
const contractItems = [
  { id: "item-1", itemCode: "15.001", unit: "m³", isActive: true },
  { id: "item-2", itemCode: "Y.16.050", unit: "kg", isActive: true },
  { id: "item-passive", itemCode: "18.001", unit: "m²", isActive: false },
] as const;

function parse(
  text: string,
  options: {
    fileName?: string;
    contentType?: string;
    items?: typeof contractItems | [];
  } = {},
) {
  return parseConstructionMeasurementImportCsv({
    bytes: encoder.encode(text),
    fileName: options.fileName ?? "metraj.csv",
    contentType: options.contentType ?? "text/csv",
    contractItems: options.items ?? contractItems,
  });
}

describe("construction measurement import CSV parser", () => {
  it("parses semicolon CSV, maps scoped contract items and normalizes quantities", () => {
    const result = parse(
      "\uFEFFpoz_no;miktar;aciklama;birim\r\n"
      + "15.001;1.234,5678;Betonarme;m³\r\n"
      + "Y.16.050;20;Donatı;kg\r\n",
    );

    expect(result).toMatchObject({
      originalFileName: "metraj.csv",
      contentType: "text/csv",
      mappingVersion: CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION,
      delimiter: ";",
      fileErrors: [],
      summary: {
        totalRowCount: 2,
        validRowCount: 2,
        errorRowCount: 0,
      },
      canValidate: true,
    });
    expect(result.rows).toEqual([
      {
        rowNo: 2,
        sourceItemCode: "15.001",
        contractItemId: "item-1",
        description: "Betonarme",
        sourceUnit: "m³",
        resolvedUnit: "m³",
        quantity: 1234.5678,
        status: "READY",
        errorCode: null,
      },
      {
        rowNo: 3,
        sourceItemCode: "Y.16.050",
        contractItemId: "item-2",
        description: "Donatı",
        sourceUnit: "kg",
        resolvedUnit: "kg",
        quantity: 20,
        status: "READY",
        errorCode: null,
      },
    ]);
    expect(result.fileSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("parses comma CSV and quoted delimiters, escaped quotes and line breaks", () => {
    const result = parse(
      "item_code,quantity,description,unit\n"
      + "15.001,2.5,\"Beton, \"\"özel\"\"\nkat\",m³\n",
    );

    expect(result.delimiter).toBe(",");
    expect(result.rows[0]).toMatchObject({
      rowNo: 2,
      description: "Beton, \"özel\" kat",
      quantity: 2.5,
      status: "READY",
    });
  });

  it("accepts Turkish and English header aliases while ignoring unknown columns", () => {
    const result = parse(
      "poz_numarasi;quantity;imalat_aciklamasi;unit;not\n"
      + "15.001;2;Açıklama;m³;yoksay\n",
    );

    expect(result.fileErrors).toEqual([]);
    expect(result.rows[0]?.status).toBe("READY");
  });

  it("reports missing and duplicate mapped headers without producing rows", () => {
    expect(parse("aciklama;birim\nTest;m³\n").fileErrors).toContain(
      "HEADER_REQUIRED",
    );
    expect(
      parse("poz_no;item_code;miktar\n15.001;15.001;1\n").fileErrors,
    ).toContain("HEADER_DUPLICATE");
  });

  it("requires at least one non-empty data row", () => {
    const result = parse("poz_no;miktar\n\n");

    expect(result.fileErrors).toContain("DATA_ROW_REQUIRED");
    expect(result.canValidate).toBe(false);
  });

  it("rejects unclosed quoted cells", () => {
    const result = parse("poz_no;miktar;aciklama\n15.001;1;\"Açık\n");

    expect(result.fileErrors).toEqual(["CSV_UNCLOSED_QUOTE"]);
    expect(result.rows).toEqual([]);
  });

  it("preserves physical source row numbers while skipping empty records", () => {
    const result = parse("poz_no;miktar\n\n15.001;1\n\nY.16.050;2\n");

    expect(result.rows.map((row) => row.rowNo)).toEqual([3, 5]);
  });

  it("produces deterministic first-priority row errors", () => {
    const result = parse(
      "poz_no;miktar;aciklama;birim\n"
      + ";1;Boş;m³\n"
      + "99.999;1;Yok;m³\n"
      + "18.001;1;Pasif;m²\n"
      + "15.001;0;Sıfır;m³\n"
      + "Y.16.050;1;İlk;kg\n"
      + "y.16.050;2;Tekrar;kg\n",
    );

    expect(result.rows.map((row) => row.errorCode)).toEqual([
      "ITEM_CODE_REQUIRED",
      "ITEM_NOT_FOUND",
      "ITEM_INACTIVE",
      "QUANTITY_INVALID",
      null,
      "DUPLICATE_ITEM_CODE",
    ]);
    expect(result.summary).toEqual({
      totalRowCount: 6,
      validRowCount: 1,
      errorRowCount: 5,
    });
    expect(result.canValidate).toBe(false);
  });

  it("rejects invalid precision, negative, exponent and non-finite quantities", () => {
    for (const quantity of ["1,12345", "-1", "1e3", "Infinity", "0"]) {
      const result = parse(`poz_no;miktar\n15.001;${quantity}\n`);
      expect(result.rows[0]?.errorCode, quantity).toBe("QUANTITY_INVALID");
    }
  });

  it("detects unit mismatch after locale-aware normalization", () => {
    const mismatch = parse("poz_no;miktar;birim\n15.001;1;kg\n");
    const normalized = parse("poz_no;miktar;birim\n15.001;1; M³ \n");

    expect(mismatch.rows[0]?.errorCode).toBe("UNIT_MISMATCH");
    expect(normalized.rows[0]?.errorCode).toBeNull();
  });

  it("neutralizes formula prefixes and strips markup from free text", () => {
    const result = parse(
      "poz_no;miktar;aciklama\n15.001;1;\"  =HYPERLINK(\"\"x\"\") <b>beton</b>\"\n",
    );

    expect(result.rows[0]?.description).toBe(
      "'=HYPERLINK(\"x\") beton",
    );
  });

  it("rejects descriptions beyond 240 normalized characters", () => {
    const result = parse(
      `poz_no;miktar;aciklama\n15.001;1;${"a".repeat(241)}\n`,
    );

    expect(result.rows[0]).toMatchObject({
      errorCode: "DESCRIPTION_TOO_LONG",
      status: "ERROR",
    });
    expect(result.rows[0]?.description).toHaveLength(240);
  });
});

describe("construction measurement import file boundary", () => {
  it("accepts configured MIME aliases and rejects other types or extensions", () => {
    for (const contentType of ["", "text/csv", "application/csv", "text/plain"]) {
      expect(parse("poz_no;miktar\n15.001;1\n", { contentType }).fileErrors)
        .not.toContain("FILE_TYPE_INVALID");
    }

    expect(
      parse("poz_no;miktar\n15.001;1\n", {
        contentType: "application/vnd.ms-excel",
      }).fileErrors,
    ).toContain("FILE_TYPE_INVALID");
    expect(
      parse("poz_no;miktar\n15.001;1\n", { fileName: "metraj.xlsx" }).fileErrors,
    ).toContain("FILE_NAME_INVALID");
  });

  it("sanitizes client paths, control characters, markup and long names", () => {
    expect(normalizeConstructionMeasurementImportFileName(
      " C:\\fakepath\\<b>metraj</b>\u0007.csv ",
    )).toBe("metraj .csv");
    expect(normalizeConstructionMeasurementImportFileName(
      `${"x".repeat(200)}.csv`,
    )).toHaveLength(180);
  });

  it("rejects empty, NUL-containing and invalid UTF-8 files", () => {
    const empty = parseConstructionMeasurementImportCsv({
      bytes: new Uint8Array(),
      fileName: "empty.csv",
      contentType: "text/csv",
      contractItems,
    });
    const nul = parse("poz_no;miktar\n15.001;\0\n");
    const invalidUtf8 = parseConstructionMeasurementImportCsv({
      bytes: new Uint8Array([0xc3, 0x28]),
      fileName: "invalid.csv",
      contentType: "text/csv",
      contractItems,
    });

    expect(empty.fileErrors).toContain("FILE_EMPTY");
    expect(nul.fileErrors).toContain("NUL_CHARACTER");
    expect(invalidUtf8.fileErrors).toEqual(["UTF8_INVALID"]);
  });

  it("enforces the 2 MiB byte boundary before staging rows", () => {
    const exactLimit = parseConstructionMeasurementImportCsv({
      bytes: new Uint8Array(CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES),
      fileName: "limit.csv",
      contentType: "text/csv",
      contractItems,
    });
    const overLimit = parseConstructionMeasurementImportCsv({
      bytes: new Uint8Array(CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES + 1),
      fileName: "over.csv",
      contentType: "text/csv",
      contractItems,
    });

    expect(exactLimit.fileErrors).not.toContain("FILE_TOO_LARGE");
    expect(overLimit.fileErrors).toContain("FILE_TOO_LARGE");
  });

  it("accepts 500 data rows and rejects 501", () => {
    const csv = (count: number) =>
      `poz_no;miktar\n${Array.from(
        { length: count },
        (_, index) => `P-${index};1`,
      ).join("\n")}\n`;
    const items = Array.from({ length: CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS }, (_, index) => ({
      id: `item-${index}`,
      itemCode: `P-${index}`,
      unit: "m",
      isActive: true,
    }));

    const atLimit = parseConstructionMeasurementImportCsv({
      bytes: encoder.encode(csv(CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS)),
      fileName: "limit.csv",
      contentType: "text/csv",
      contractItems: items,
    });
    const overLimit = parseConstructionMeasurementImportCsv({
      bytes: encoder.encode(csv(CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS + 1)),
      fileName: "over.csv",
      contentType: "text/csv",
      contractItems: items,
    });

    expect(atLimit.summary.totalRowCount).toBe(500);
    expect(atLimit.canValidate).toBe(true);
    expect(overLimit.fileErrors).toContain("ROW_LIMIT_EXCEEDED");
    expect(overLimit.rows).toEqual([]);
  });

  it("normalizes BOM, newline form and Unicode before hashing", () => {
    const crlf = parse("\uFEFFpoz_no;miktar;aciklama\r\n15.001;1;çelik\r\n");
    const lf = parse("poz_no;miktar;aciklama\n15.001;1;çelik\n");

    expect(crlf.fileSha256).toBe(lf.fileSha256);
  });
});

describe("construction measurement import lifecycle and access", () => {
  it("allows only the approved lifecycle transitions", () => {
    expect(canTransitionConstructionMeasurementImportStatus("DRAFT", "VALIDATED"))
      .toBe(true);
    expect(canTransitionConstructionMeasurementImportStatus("DRAFT", "CANCELLED"))
      .toBe(true);
    expect(canTransitionConstructionMeasurementImportStatus("VALIDATED", "APPLIED"))
      .toBe(true);
    expect(canTransitionConstructionMeasurementImportStatus("APPLIED", "DRAFT"))
      .toBe(false);
    expect(canTransitionConstructionMeasurementImportStatus("FAILED", "DRAFT"))
      .toBe(false);
    expect(canTransitionConstructionMeasurementImportStatus("CANCELLED", "APPLIED"))
      .toBe(false);
  });

  it("denies every viewer operation and permits accounting/admin operations", () => {
    for (const operation of ["read", "create", "validate", "apply", "cancel"] as const) {
      expect(getConstructionMeasurementImportPermission({
        role: "viewer",
        operation,
        status: operation === "validate"
          ? "DRAFT"
          : operation === "apply"
            ? "VALIDATED"
            : "DRAFT",
      })).toEqual({ allowed: false, reason: "ROLE_FORBIDDEN" });
    }

    expect(getConstructionMeasurementImportPermission({
      role: "accounting",
      operation: "validate",
      status: "DRAFT",
    }).allowed).toBe(true);
    expect(getConstructionMeasurementImportPermission({
      role: "admin",
      operation: "apply",
      status: "VALIDATED",
    }).allowed).toBe(true);
  });

  it("allows closed-period reads but denies all closed-period mutations", () => {
    expect(getConstructionMeasurementImportPermission({
      role: "accounting",
      operation: "read",
      status: "APPLIED",
      periodClosed: true,
    })).toEqual({ allowed: true, reason: "ALLOWED" });

    for (const operation of ["create", "validate", "apply", "cancel"] as const) {
      expect(getConstructionMeasurementImportPermission({
        role: "admin",
        operation,
        status: operation === "validate"
          ? "DRAFT"
          : operation === "apply"
            ? "VALIDATED"
            : "DRAFT",
        periodClosed: true,
      })).toEqual({ allowed: false, reason: "PERIOD_CLOSED" });
    }
  });

  it("rejects operations that do not match the current status", () => {
    expect(getConstructionMeasurementImportPermission({
      role: "accounting",
      operation: "apply",
      status: "DRAFT",
    })).toEqual({ allowed: false, reason: "INVALID_STATUS" });
    expect(getConstructionMeasurementImportPermission({
      role: "admin",
      operation: "cancel",
      status: "APPLIED",
    })).toEqual({ allowed: false, reason: "INVALID_STATUS" });
  });
});

describe("construction measurement import idempotency", () => {
  const baseInput = {
    scope: {
      tenantId: "tenant-1",
      companyId: "company-1",
      periodId: "period-1",
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
    },
    fileSha256: "a".repeat(64),
  };

  it("creates a deterministic opaque key from the full boundary", () => {
    const first = createConstructionMeasurementImportIdempotencyKey(baseInput);
    const second = createConstructionMeasurementImportIdempotencyKey(baseInput);

    expect(first).toBe(second);
    expect(first).toMatch(/^measurement-import-v1-[a-f0-9]{64}$/);
    expect(first).not.toContain("tenant-1");
    expect(first).not.toContain(baseInput.fileSha256);
  });

  it("changes when any scope, hash or mapping version part changes", () => {
    const baseline = createConstructionMeasurementImportIdempotencyKey(baseInput);
    const variants = [
      { ...baseInput, scope: { ...baseInput.scope, tenantId: "tenant-2" } },
      { ...baseInput, scope: { ...baseInput.scope, companyId: "company-2" } },
      { ...baseInput, scope: { ...baseInput.scope, periodId: "period-2" } },
      { ...baseInput, scope: { ...baseInput.scope, projectId: "project-2" } },
      {
        ...baseInput,
        scope: { ...baseInput.scope, sourceProgressPaymentId: "payment-2" },
      },
      { ...baseInput, fileSha256: "b".repeat(64) },
      { ...baseInput, mappingVersion: "measurement-csv-v2" },
    ];

    for (const variant of variants) {
      expect(createConstructionMeasurementImportIdempotencyKey(variant))
        .not.toBe(baseline);
    }
  });

  it("rejects missing scope, malformed hash and blank mapping versions", () => {
    for (const input of [
      { ...baseInput, scope: { ...baseInput.scope, companyId: " " } },
      { ...baseInput, fileSha256: "not-a-hash" },
      { ...baseInput, mappingVersion: " " },
    ]) {
      expect(() => createConstructionMeasurementImportIdempotencyKey(input))
        .toThrowError(ConstructionMeasurementImportDomainError);
    }
  });
});
