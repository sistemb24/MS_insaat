import type { EntityDefinition, EntityRow } from "./entities";
import { validateEntityDraft } from "./entities";
import {
  validateSupplierCategoryAssignment,
  type EffectiveSupplierCategory,
} from "./supplier-category";
import {
  validateCustomerTypeAssignment,
  type EffectiveCustomerType,
} from "./customer-type";

export type EntityImportValidationContext = {
  customerTypes?: EffectiveCustomerType[];
  supplierCategories?: EffectiveSupplierCategory[];
};

export type EntityImportPreviewRow = {
  rowNumber: number;
  values: EntityRow;
  errors: string[];
};

export type EntityImportPreview = {
  fileErrors: string[];
  rows: EntityImportPreviewRow[];
  validRows: EntityRow[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
};

export function previewEntityImportCsv(
  definition: EntityDefinition,
  existingRows: EntityRow[],
  csvText: string,
  context: EntityImportValidationContext = {},
): EntityImportPreview {
  const records = parseSemicolonCsv(csvText).filter((record) =>
    record.some((cell) => cell.trim()),
  );
  const expectedHeaders = definition.columns.map((column) => column.label);
  const headers = records[0] ?? [];

  if (!headersMatch(headers, expectedHeaders)) {
    return emptyPreview(["Şablon kolonları tanım ile eşleşmiyor."]);
  }

  const seenCodes = new Set<string>();
  const rows = records.slice(1).map((record, index) => {
    const values = Object.fromEntries(
      definition.columns.map((column, columnIndex) => [
        column.key,
        record[columnIndex]?.trim() ?? "",
      ]),
    );
    const errors = validateEntityDraft(definition, existingRows, {
      mode: "create",
      values,
    });
    const code = values.code?.trim();

    if (code && seenCodes.has(code)) {
      errors.push("Kod dosya içinde tekrar ediyor.");
    }

    if (values.status && !["Aktif", "Pasif"].includes(values.status)) {
      errors.push("Durum Aktif veya Pasif olmalıdır.");
    }
    if (definition.slug === "tedarikciler" && context.supplierCategories) {
      errors.push(...validateSupplierCategoryAssignment({
        categories: context.supplierCategories,
        value: values.category ?? "",
      }));
    }
    if (definition.slug === "musteriler" && context.customerTypes) {
      errors.push(...validateCustomerTypeAssignment({
        customerTypes: context.customerTypes,
        value: values.customerType ?? "",
      }));
    }

    if (code) {
      seenCodes.add(code);
    }

    return {
      rowNumber: index + 2,
      values,
      errors,
    };
  });
  const validRows = rows
    .filter((row) => row.errors.length === 0)
    .map((row) => row.values);

  return {
    fileErrors: [],
    rows,
    validRows,
    summary: {
      invalidRows: rows.length - validRows.length,
      totalRows: rows.length,
      validRows: validRows.length,
    },
  };
}

function emptyPreview(fileErrors: string[]): EntityImportPreview {
  return {
    fileErrors,
    rows: [],
    validRows: [],
    summary: {
      invalidRows: 0,
      totalRows: 0,
      validRows: 0,
    },
  };
}

function headersMatch(headers: string[], expectedHeaders: string[]) {
  if (headers.length !== expectedHeaders.length) {
    return false;
  }

  return expectedHeaders.every(
    (expectedHeader, index) => headers[index]?.trim() === expectedHeader,
  );
}

function parseSemicolonCsv(csvText: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"') {
      if (isQuoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === ";" && !isQuoted) {
      record.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell || record.length > 0) {
    record.push(cell);
    records.push(record);
  }

  return records;
}
