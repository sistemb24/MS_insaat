import * as XLSX from "xlsx";

import type { EntityDefinition, EntityRow } from "./entities";
import type { EntityImportPreview } from "./entity-import";
import { previewEntityImportCsv } from "./entity-import";

export type EntityImportXlsxHeaderInspection = {
  fileErrors: string[];
  headers: string[];
};

export type EntityImportXlsxWorkbookInspection = EntityImportXlsxHeaderInspection & {
  sheetNames: string[];
};

export function previewEntityImportXlsx(
  definition: EntityDefinition,
  existingRows: EntityRow[],
  workbookData: ArrayBuffer | Uint8Array,
  headerMapping?: Record<string, string>,
  sheetName?: string,
): EntityImportPreview {
  const workbook = XLSX.read(workbookData, { type: "array" });
  const selectedSheetName = resolveSheetName(workbook, sheetName);

  if (!selectedSheetName) {
    return emptyPreview(["XLSX çalışma sayfası bulunamadı."]);
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  const records = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(
    worksheet,
    {
      blankrows: false,
      defval: "",
      header: 1,
      raw: false,
    },
  );

  return previewEntityImportCsv(
    definition,
    existingRows,
    buildSemicolonCsv(mapRecordsByExpectedHeaders(definition, records, headerMapping)),
  );
}

export function readEntityImportXlsxHeaders(
  workbookData: ArrayBuffer | Uint8Array,
  sheetName?: string,
): EntityImportXlsxHeaderInspection {
  return inspectEntityImportXlsxWorkbook(workbookData, sheetName);
}

export function inspectEntityImportXlsxWorkbook(
  workbookData: ArrayBuffer | Uint8Array,
  sheetName?: string,
): EntityImportXlsxWorkbookInspection {
  const workbook = XLSX.read(workbookData, { type: "array" });
  const selectedSheetName = resolveSheetName(workbook, sheetName);

  if (!selectedSheetName) {
    return {
      fileErrors: ["XLSX çalışma sayfası bulunamadı."],
      headers: [],
      sheetNames: [],
    };
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  const records = XLSX.utils.sheet_to_json<Array<string | number | boolean>>(
    worksheet,
    {
      blankrows: false,
      defval: "",
      header: 1,
      raw: false,
    },
  );
  const [headers] = records;

  if (!headers) {
    return {
      fileErrors: ["XLSX başlık satırı bulunamadı."],
      headers: [],
      sheetNames: workbook.SheetNames,
    };
  }

  return {
    fileErrors: [],
    headers: headers.map((header) => String(header).trim()).filter(Boolean),
    sheetNames: workbook.SheetNames,
  };
}

function resolveSheetName(workbook: XLSX.WorkBook, requestedSheetName?: string) {
  if (requestedSheetName && workbook.Sheets[requestedSheetName]) {
    return requestedSheetName;
  }

  return workbook.SheetNames[0];
}

function emptyPreview(fileErrors: string[]): EntityImportPreview {
  return {
    fileErrors,
    rows: [],
    summary: {
      invalidRows: 0,
      totalRows: 0,
      validRows: 0,
    },
    validRows: [],
  };
}

function buildSemicolonCsv(records: Array<Array<string | number | boolean>>) {
  return records
    .map((record) => record.map((cell) => escapeCsvCell(cell)).join(";"))
    .join("\r\n");
}

function mapRecordsByExpectedHeaders(
  definition: EntityDefinition,
  records: Array<Array<string | number | boolean>>,
  headerMapping?: Record<string, string>,
) {
  const [headers, ...rows] = records;

  if (!headers) {
    return records;
  }

  const expectedHeaders = definition.columns.map((column) => column.label);
  const headerIndexes = new Map(
    headers.map((header, index) => [String(header).trim(), index]),
  );
  const canMapHeaders =
    headers.length === expectedHeaders.length &&
    headerIndexes.size === expectedHeaders.length &&
    expectedHeaders.every((header) => headerIndexes.has(header));

  const mappedSourceHeaders = expectedHeaders.map(
    (expectedHeader) => headerMapping?.[expectedHeader] ?? expectedHeader,
  );
  const canUseManualMapping =
    mappedSourceHeaders.length === expectedHeaders.length &&
    new Set(mappedSourceHeaders).size === expectedHeaders.length &&
    mappedSourceHeaders.every((header) => headerIndexes.has(header));

  if (!canMapHeaders && !canUseManualMapping) {
    return records;
  }

  const sourceHeaders = canUseManualMapping ? mappedSourceHeaders : expectedHeaders;

  return [
    expectedHeaders,
    ...rows.map((row) =>
      sourceHeaders.map((header) => row[headerIndexes.get(header)!] ?? ""),
    ),
  ];
}

function escapeCsvCell(value: string | number | boolean) {
  const cell = String(value);

  if (!/[;"\r\n]/.test(cell)) {
    return cell;
  }

  return `"${cell.replaceAll('"', '""')}"`;
}
