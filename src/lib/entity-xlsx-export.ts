import * as XLSX from "xlsx";

import type { EntityDefinition } from "./entities";

const xlsxMimeType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function buildEntityImportTemplateXlsxBase64(
  definition: EntityDefinition,
) {
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([
    definition.columns.map((column) => column.label),
    definition.columns.map((column) => getTemplateCellValue(definition, column.key)),
  ]);
  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["Kolon", "Durum", "Açıklama"],
    ...definition.columns.map((column) => [
      column.label,
      isRequiredTemplateColumn(column.key) ? "Zorunlu" : "Opsiyonel",
      getInstructionText(column.key),
    ]),
  ]);

  XLSX.utils.book_append_sheet(
    workbook,
    dataSheet,
    normalizeSheetName(definition.title),
  );
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Açıklamalar");

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "base64",
  }) as string;
}

export function buildEntityImportTemplateXlsxHref(definition: EntityDefinition) {
  return `data:${xlsxMimeType};base64,${buildEntityImportTemplateXlsxBase64(
    definition,
  )}`;
}

export function buildEntityImportTemplateXlsxFileName(
  definition: EntityDefinition,
) {
  return `tanimlar-${definition.slug}-sablon.xlsx`;
}

function getTemplateCellValue(definition: EntityDefinition, columnKey: string) {
  if (columnKey === "code") {
    return `${definition.codePrefix}-0001`;
  }

  if (columnKey === "name") {
    return "Zorunlu";
  }

  if (columnKey === "status") {
    return "Aktif";
  }

  return "Opsiyonel";
}

function isRequiredTemplateColumn(columnKey: string) {
  return columnKey === "code" || columnKey === "name" || columnKey === "status";
}

function getInstructionText(columnKey: string) {
  if (columnKey === "code") {
    return "Benzersiz kod. Boş bırakılırsa kayıt alınmaz.";
  }

  if (columnKey === "name") {
    return "Kart adı/tanımı. Boş bırakılırsa kayıt alınmaz.";
  }

  if (columnKey === "status") {
    return "Aktif veya Pasif olmalıdır.";
  }

  return "Boş bırakılabilir; varsa mevcut kart bilgisi olarak alınır.";
}

function normalizeSheetName(title: string) {
  return title.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31);
}