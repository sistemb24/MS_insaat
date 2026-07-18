import type { EntityDefinition, EntityRow } from "./entities";
import type { EntityImportPreview } from "./entity-import";

export function buildEntityRowsCsv(
  definition: EntityDefinition,
  rows: EntityRow[],
) {
  return [
    definition.columns.map((column) => column.label).join(";"),
    ...rows.map((row) =>
      definition.columns
        .map((column) => escapeCsvCell(row[column.key] ?? ""))
        .join(";"),
    ),
  ].join("\r\n");
}

export function buildEntityImportErrorReportCsv(preview: EntityImportPreview) {
  const rows = preview.rows.filter((row) => row.errors.length > 0);

  return [
    "Satır No;Kod;Tanım;Hatalar",
    ...rows.map((row) =>
      [
        String(row.rowNumber),
        row.values.code ?? "",
        row.values.name ?? "",
        row.errors.join(" "),
      ]
        .map(escapeCsvCell)
        .join(";"),
    ),
  ].join("\r\n");
}

export function buildEntityImportErrorReportCsvHref(
  preview: EntityImportPreview,
) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildEntityImportErrorReportCsv(preview),
  )}`;
}

export function buildEntityImportErrorReportCsvFileName(
  definition: EntityDefinition,
) {
  return `tanimlar-${definition.slug}-hata-raporu.csv`;
}
export function buildEntityImportTemplateCsv(definition: EntityDefinition) {
  const templateRow = Object.fromEntries(
    definition.columns.map((column) => {
      if (column.key === "code") {
        return [column.key, `${definition.codePrefix}-0001`];
      }

      if (column.key === "name") {
        return [column.key, "Zorunlu"];
      }

      if (column.key === "status") {
        return [column.key, "Aktif"];
      }

      return [column.key, "Opsiyonel"];
    }),
  );

  return buildEntityRowsCsv(definition, [templateRow]);
}

export function buildEntityImportTemplateCsvHref(definition: EntityDefinition) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildEntityImportTemplateCsv(definition),
  )}`;
}

export function buildEntityImportTemplateCsvFileName(
  definition: EntityDefinition,
) {
  return `tanimlar-${definition.slug}-sablon.csv`;
}
export function buildEntityRowsCsvHref(
  definition: EntityDefinition,
  rows: EntityRow[],
) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildEntityRowsCsv(definition, rows),
  )}`;
}

export function buildEntityRowsCsvFileName(definition: EntityDefinition) {
  return `tanimlar-${definition.slug}.csv`;
}

function escapeCsvCell(value: string) {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

