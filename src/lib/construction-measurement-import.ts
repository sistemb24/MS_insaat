import { createHash } from "node:crypto";
import path from "node:path";

import type { TenantUserRole } from "./tenant-scope";

export const CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS = 500;
export const CONSTRUCTION_MEASUREMENT_IMPORT_DESCRIPTION_MAX_LENGTH = 240;
export const CONSTRUCTION_MEASUREMENT_IMPORT_FILE_NAME_MAX_LENGTH = 180;
export const CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION = "measurement-csv-v1";

export type ConstructionMeasurementImportStatus =
  | "DRAFT"
  | "VALIDATED"
  | "APPLIED"
  | "CANCELLED"
  | "FAILED";

export type ConstructionMeasurementImportOperation =
  | "read"
  | "create"
  | "validate"
  | "apply"
  | "cancel";

export type ConstructionMeasurementImportRowStatus = "READY" | "ERROR";

export type ConstructionMeasurementImportRowErrorCode =
  | "ITEM_CODE_REQUIRED"
  | "ITEM_NOT_FOUND"
  | "ITEM_INACTIVE"
  | "QUANTITY_INVALID"
  | "DUPLICATE_ITEM_CODE"
  | "UNIT_MISMATCH"
  | "DESCRIPTION_TOO_LONG";

export type ConstructionMeasurementImportFileErrorCode =
  | "FILE_NAME_INVALID"
  | "FILE_TYPE_INVALID"
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "UTF8_INVALID"
  | "NUL_CHARACTER"
  | "CSV_UNCLOSED_QUOTE"
  | "HEADER_REQUIRED"
  | "HEADER_DUPLICATE"
  | "DATA_ROW_REQUIRED"
  | "ROW_LIMIT_EXCEEDED";

export type ConstructionMeasurementImportContractItem = {
  id: string;
  itemCode: string;
  unit: string;
  isActive: boolean;
};

export type ConstructionMeasurementImportRow = {
  rowNo: number;
  sourceItemCode: string;
  contractItemId: string | null;
  description: string;
  sourceUnit: string;
  resolvedUnit: string;
  quantity: number | null;
  status: ConstructionMeasurementImportRowStatus;
  errorCode: ConstructionMeasurementImportRowErrorCode | null;
};

export type ConstructionMeasurementImportParseResult = {
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileSha256: string;
  mappingVersion: typeof CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION;
  delimiter: ";" | "," | null;
  rows: ConstructionMeasurementImportRow[];
  fileErrors: ConstructionMeasurementImportFileErrorCode[];
  summary: {
    totalRowCount: number;
    validRowCount: number;
    errorRowCount: number;
  };
  canValidate: boolean;
};

export type ConstructionMeasurementImportPermission = {
  allowed: boolean;
  reason:
    | "ALLOWED"
    | "ROLE_FORBIDDEN"
    | "PERIOD_CLOSED"
    | "INVALID_STATUS";
};

export type ConstructionMeasurementImportScope = {
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  sourceProgressPaymentId: string;
};

type ParsedCsvRecord = {
  rowNo: number;
  cells: string[];
};

type HeaderField = "itemCode" | "quantity" | "description" | "unit";

const allowedContentTypes = new Set([
  "",
  "application/csv",
  "text/csv",
  "text/plain",
]);

const headerAliases: Record<HeaderField, readonly string[]> = {
  itemCode: ["poz_no", "poz_numarasi", "poz", "item_code"],
  quantity: ["miktar", "quantity"],
  description: ["aciklama", "imalat_aciklamasi", "description"],
  unit: ["birim", "unit"],
};

const allowedTransitions: Record<
  ConstructionMeasurementImportStatus,
  readonly ConstructionMeasurementImportStatus[]
> = {
  DRAFT: ["VALIDATED", "FAILED", "CANCELLED"],
  VALIDATED: ["APPLIED", "FAILED", "CANCELLED"],
  APPLIED: [],
  CANCELLED: [],
  FAILED: [],
};

export function parseConstructionMeasurementImportCsv(input: {
  bytes: Uint8Array;
  fileName: string;
  contentType?: string | null;
  contractItems: readonly ConstructionMeasurementImportContractItem[];
}): ConstructionMeasurementImportParseResult {
  const fileErrors: ConstructionMeasurementImportFileErrorCode[] = [];
  const originalFileName = normalizeConstructionMeasurementImportFileName(
    input.fileName,
  );
  const contentType = (input.contentType ?? "").trim().toLocaleLowerCase("en-US");
  const fileSize = input.bytes.byteLength;

  if (!originalFileName || !originalFileName.toLocaleLowerCase("tr-TR").endsWith(".csv")) {
    fileErrors.push("FILE_NAME_INVALID");
  }
  if (!allowedContentTypes.has(contentType)) {
    fileErrors.push("FILE_TYPE_INVALID");
  }
  if (fileSize === 0) {
    fileErrors.push("FILE_EMPTY");
  }
  if (fileSize > CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES) {
    fileErrors.push("FILE_TOO_LARGE");
  }

  const decoded = decodeStrictUtf8(input.bytes);
  if (decoded === null) {
    fileErrors.push("UTF8_INVALID");
    return emptyParseResult({
      originalFileName,
      contentType,
      fileSize,
      fileSha256: sha256Hex(input.bytes),
      fileErrors,
    });
  }

  const normalizedText = normalizeCsvContent(decoded);
  const normalizedBytes = new TextEncoder().encode(normalizedText);
  const fileSha256 = sha256Hex(normalizedBytes);

  if (normalizedText.includes("\0")) {
    fileErrors.push("NUL_CHARACTER");
  }
  if (!normalizedText.trim()) {
    if (!fileErrors.includes("FILE_EMPTY")) fileErrors.push("FILE_EMPTY");
  }
  if (
    fileErrors.includes("FILE_TOO_LARGE")
    || fileErrors.includes("FILE_EMPTY")
    || fileErrors.includes("UTF8_INVALID")
    || fileErrors.includes("NUL_CHARACTER")
  ) {
    return emptyParseResult({
      originalFileName,
      contentType,
      fileSize,
      fileSha256,
      fileErrors,
    });
  }

  const delimiter = detectCsvDelimiter(normalizedText);
  const parsed = parseCsvRecords(normalizedText, delimiter);
  if (!parsed.ok) {
    fileErrors.push(parsed.error);
    return emptyParseResult({
      originalFileName,
      contentType,
      fileSize,
      fileSha256,
      fileErrors,
      delimiter,
    });
  }

  const records = parsed.records.filter((record) =>
    record.cells.some((cell) => cell.trim()));
  const headerRecord = records[0];
  const dataRecords = records.slice(1);
  if (!headerRecord) {
    fileErrors.push("HEADER_REQUIRED");
  }
  if (headerRecord && dataRecords.length === 0) {
    fileErrors.push("DATA_ROW_REQUIRED");
  }
  if (dataRecords.length > CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS) {
    fileErrors.push("ROW_LIMIT_EXCEEDED");
  }

  const headerMap = headerRecord
    ? mapHeaders(headerRecord.cells)
    : { indexes: null, duplicate: false };
  if (!headerMap.indexes) fileErrors.push("HEADER_REQUIRED");
  if (headerMap.duplicate) fileErrors.push("HEADER_DUPLICATE");
  if (fileErrors.length > 0 || !headerMap.indexes) {
    return emptyParseResult({
      originalFileName,
      contentType,
      fileSize,
      fileSha256,
      fileErrors: unique(fileErrors),
      delimiter,
    });
  }

  const contractItemsByCode = new Map(
    input.contractItems.map((item) => [
      normalizeItemCodeKey(item.itemCode),
      item,
    ]),
  );
  const seenItemCodes = new Set<string>();
  const rows = dataRecords.map((record) =>
    mapImportRow(record, headerMap.indexes!, contractItemsByCode, seenItemCodes));
  const validRowCount = rows.filter((row) => row.status === "READY").length;
  const errorRowCount = rows.length - validRowCount;

  return {
    originalFileName,
    contentType,
    fileSize,
    fileSha256,
    mappingVersion: CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION,
    delimiter,
    rows,
    fileErrors: [],
    summary: {
      totalRowCount: rows.length,
      validRowCount,
      errorRowCount,
    },
    canValidate: rows.length > 0 && errorRowCount === 0,
  };
}

export function canTransitionConstructionMeasurementImportStatus(
  from: ConstructionMeasurementImportStatus,
  to: ConstructionMeasurementImportStatus,
) {
  return allowedTransitions[from].includes(to);
}

export function getConstructionMeasurementImportPermission(input: {
  role: TenantUserRole;
  operation: ConstructionMeasurementImportOperation;
  periodClosed?: boolean;
  status?: ConstructionMeasurementImportStatus;
}): ConstructionMeasurementImportPermission {
  if (input.role === "viewer") {
    return { allowed: false, reason: "ROLE_FORBIDDEN" };
  }
  if (input.periodClosed && input.operation !== "read") {
    return { allowed: false, reason: "PERIOD_CLOSED" };
  }

  const status = input.status;
  const allowedByStatus =
    input.operation === "read"
    || (input.operation === "create" && status === undefined)
    || (
      input.operation === "validate"
      && (status === "DRAFT" || status === "VALIDATED")
    )
    || (
      input.operation === "apply"
      && (status === "VALIDATED" || status === "APPLIED")
    )
    || (
      input.operation === "cancel"
      && (
        status === "DRAFT"
        || status === "VALIDATED"
        || status === "CANCELLED"
      )
    );

  return allowedByStatus
    ? { allowed: true, reason: "ALLOWED" }
    : { allowed: false, reason: "INVALID_STATUS" };
}

export function createConstructionMeasurementImportIdempotencyKey(input: {
  scope: ConstructionMeasurementImportScope;
  fileSha256: string;
  mappingVersion?: string;
}) {
  const scopeParts = [
    input.scope.tenantId,
    input.scope.companyId,
    input.scope.periodId,
    input.scope.projectId,
    input.scope.sourceProgressPaymentId,
  ].map((value) => value.trim());
  const mappingVersion = (
    input.mappingVersion ?? CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION
  ).trim();
  const fileSha256 = input.fileSha256.trim().toLocaleLowerCase("en-US");

  if (
    scopeParts.some((value) => !value)
    || !mappingVersion
    || !/^[a-f0-9]{64}$/.test(fileSha256)
  ) {
    throw new ConstructionMeasurementImportDomainError(
      "IDEMPOTENCY_INPUT_INVALID",
      "Import idempotency kapsamı, mapping sürümü veya dosya özeti geçersiz.",
    );
  }

  const opaqueHash = createHash("sha256")
    .update([...scopeParts, fileSha256, mappingVersion].join("\u001f"), "utf8")
    .digest("hex");
  return `measurement-import-v1-${opaqueHash}`;
}

export class ConstructionMeasurementImportDomainError extends Error {
  constructor(
    public readonly code: "IDEMPOTENCY_INPUT_INVALID",
    message: string,
  ) {
    super(message);
    this.name = "ConstructionMeasurementImportDomainError";
  }
}

export function normalizeConstructionMeasurementImportFileName(value: string) {
  const plainValue = normalizePlainText(value, 4096);
  const baseName = path.win32.basename(path.posix.basename(plainValue));
  return normalizePlainText(
    baseName,
    CONSTRUCTION_MEASUREMENT_IMPORT_FILE_NAME_MAX_LENGTH,
  );
}

function mapImportRow(
  record: ParsedCsvRecord,
  indexes: Record<HeaderField, number>,
  contractItemsByCode: ReadonlyMap<
    string,
    ConstructionMeasurementImportContractItem
  >,
  seenItemCodes: Set<string>,
): ConstructionMeasurementImportRow {
  const sourceItemCode = normalizePlainText(record.cells[indexes.itemCode] ?? "", 100);
  const itemCodeKey = normalizeItemCodeKey(sourceItemCode);
  const contractItem = contractItemsByCode.get(itemCodeKey);
  const sourceUnit = indexes.unit >= 0
    ? normalizePlainText(record.cells[indexes.unit] ?? "", 30)
    : "";
  const rawDescription = indexes.description >= 0
    ? record.cells[indexes.description] ?? ""
    : "";
  const normalizedDescription = normalizePlainText(
    neutralizeSpreadsheetFormula(rawDescription),
    CONSTRUCTION_MEASUREMENT_IMPORT_DESCRIPTION_MAX_LENGTH + 1,
  );
  const quantity = parseImportQuantity(record.cells[indexes.quantity] ?? "");

  let errorCode: ConstructionMeasurementImportRowErrorCode | null = null;
  if (!sourceItemCode) errorCode = "ITEM_CODE_REQUIRED";
  else if (!contractItem) errorCode = "ITEM_NOT_FOUND";
  else if (!contractItem.isActive) errorCode = "ITEM_INACTIVE";
  else if (quantity === null) errorCode = "QUANTITY_INVALID";
  else if (seenItemCodes.has(itemCodeKey)) errorCode = "DUPLICATE_ITEM_CODE";
  else if (
    sourceUnit
    && normalizeUnitKey(sourceUnit) !== normalizeUnitKey(contractItem.unit)
  ) {
    errorCode = "UNIT_MISMATCH";
  } else if (
    normalizedDescription.length
    > CONSTRUCTION_MEASUREMENT_IMPORT_DESCRIPTION_MAX_LENGTH
  ) {
    errorCode = "DESCRIPTION_TOO_LONG";
  }

  if (itemCodeKey) seenItemCodes.add(itemCodeKey);

  return {
    rowNo: record.rowNo,
    sourceItemCode,
    contractItemId: contractItem?.id ?? null,
    description: normalizedDescription.slice(
      0,
      CONSTRUCTION_MEASUREMENT_IMPORT_DESCRIPTION_MAX_LENGTH,
    ),
    sourceUnit,
    resolvedUnit: contractItem?.unit ?? "",
    quantity,
    status: errorCode ? "ERROR" : "READY",
    errorCode,
  };
}

function parseImportQuantity(value: string) {
  const compact = value.trim().replace(/\s/g, "");
  if (!compact || !/^\+?\d+(?:[.,]\d+)?(?:[.,]\d+)?$/.test(compact)) return null;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const integerPart = decimalIndex >= 0 ? compact.slice(0, decimalIndex) : compact;
  const decimalPart = decimalIndex >= 0 ? compact.slice(decimalIndex + 1) : "";
  const normalizedInteger = integerPart.replace(/[.,]/g, "").replace(/^\+/, "");

  if (
    !normalizedInteger
    || (decimalPart && !/^\d+$/.test(decimalPart))
    || decimalPart.length > 4
  ) {
    return null;
  }

  const parsed = Number(`${normalizedInteger}${decimalPart ? `.${decimalPart}` : ""}`);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCsvRecords(
  text: string,
  delimiter: ";" | ",",
):
  | { ok: true; records: ParsedCsvRecord[] }
  | { ok: false; error: "CSV_UNCLOSED_QUOTE" } {
  const records: ParsedCsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let lineNo = 1;
  let recordStartLine = 1;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (quoted && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell);
      cell = "";
    } else if (character === "\n" && !quoted) {
      cells.push(cell);
      records.push({ rowNo: recordStartLine, cells });
      cells = [];
      cell = "";
      lineNo += 1;
      recordStartLine = lineNo;
    } else {
      cell += character;
      if (character === "\n") lineNo += 1;
    }
  }

  if (quoted) return { ok: false, error: "CSV_UNCLOSED_QUOTE" };
  if (cell || cells.length > 0) {
    cells.push(cell);
    records.push({ rowNo: recordStartLine, cells });
  }
  return { ok: true, records };
}

function mapHeaders(cells: string[]) {
  const indexes: Record<HeaderField, number> = {
    itemCode: -1,
    quantity: -1,
    description: -1,
    unit: -1,
  };
  let duplicate = false;

  cells.map(normalizeHeader).forEach((header, index) => {
    for (const field of Object.keys(headerAliases) as HeaderField[]) {
      if (!headerAliases[field].includes(header)) continue;
      if (indexes[field] >= 0) duplicate = true;
      else indexes[field] = index;
    }
  });

  return {
    indexes: indexes.itemCode >= 0 && indexes.quantity >= 0 ? indexes : null,
    duplicate,
  };
}

function detectCsvDelimiter(text: string): ";" | "," {
  const header = text.split("\n", 1)[0] ?? "";
  const semicolons = countDelimiterOutsideQuotes(header, ";");
  const commas = countDelimiterOutsideQuotes(header, ",");
  return semicolons >= commas ? ";" : ",";
}

function countDelimiterOutsideQuotes(value: string, delimiter: ";" | ",") {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "\"") {
      if (quoted && value[index + 1] === "\"") index += 1;
      else quoted = !quoted;
    } else if (value[index] === delimiter && !quoted) {
      count += 1;
    }
  }
  return count;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeItemCodeKey(value: string) {
  return value.trim().toLocaleUpperCase("tr-TR");
}

function normalizeUnitKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, "");
}

function neutralizeSpreadsheetFormula(value: string) {
  const normalized = value.normalize("NFC");
  const leadingWhitespace = normalized.match(/^\s*/)?.[0] ?? "";
  const remainder = normalized.slice(leadingWhitespace.length);
  return /^[=+\-@]/.test(remainder)
    ? `${leadingWhitespace}'${remainder}`
    : normalized;
}

function normalizePlainText(value: string, maxLength: number) {
  return Array.from(value.normalize("NFC"), (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  })
    .join("")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeCsvContent(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .normalize("NFC");
}

function decodeStrictUtf8(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function sha256Hex(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function emptyParseResult(input: {
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileSha256: string;
  fileErrors: ConstructionMeasurementImportFileErrorCode[];
  delimiter?: ";" | ",";
}): ConstructionMeasurementImportParseResult {
  return {
    originalFileName: input.originalFileName,
    contentType: input.contentType,
    fileSize: input.fileSize,
    fileSha256: input.fileSha256,
    mappingVersion: CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION,
    delimiter: input.delimiter ?? null,
    rows: [],
    fileErrors: unique(input.fileErrors),
    summary: {
      totalRowCount: 0,
      validRowCount: 0,
      errorRowCount: 0,
    },
    canValidate: false,
  };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
