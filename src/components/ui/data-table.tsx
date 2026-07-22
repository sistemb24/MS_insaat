import type { Key, ReactNode } from "react";

import { classNames } from "./class-names";

export type DataTableColumn<Row> = {
  align?: "center" | "left" | "right";
  cell: (row: Row) => ReactNode;
  className?: string;
  header: ReactNode;
  id: string;
  numeric?: boolean;
  rowHeader?: boolean;
};

type DataTableProps<Row> = {
  caption: string;
  captionVisible?: boolean;
  className?: string;
  columns: readonly DataTableColumn<Row>[];
  emptyMessage?: ReactNode;
  getRowKey: (row: Row, index: number) => Key;
  rows: readonly Row[];
};

const alignmentClasses = {
  center: "text-center",
  left: "text-left",
  right: "text-right",
} as const;

export function DataTable<Row>({
  caption,
  captionVisible = false,
  className,
  columns,
  emptyMessage = "Gösterilecek kayıt bulunamadı.",
  getRowKey,
  rows,
}: DataTableProps<Row>) {
  return (
    <div className={classNames("overflow-x-auto rounded-ui-panel border border-divider", className)}>
      <table className="w-full min-w-max border-collapse text-sm text-content">
        <caption
          className={
            captionVisible
              ? "border-b border-divider bg-surface-raised px-3 py-2 text-left font-semibold"
              : "sr-only"
          }
        >
          {caption}
        </caption>
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-subtle">
          <tr>
            {columns.map((column) => (
              <th
                className={classNames(
                  "h-10 border-b border-divider px-3 py-2 font-semibold",
                  alignmentClasses[column.align ?? (column.numeric ? "right" : "left")],
                  column.className,
                )}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider bg-surface-raised">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-content-subtle" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr className="hover:bg-surface-muted" key={getRowKey(row, rowIndex)}>
                {columns.map((column) => {
                  const cellClassName = classNames(
                    "h-10 px-3 py-2",
                    alignmentClasses[column.align ?? (column.numeric ? "right" : "left")],
                    column.numeric && "font-mono tabular-nums",
                    column.className,
                  );

                  return column.rowHeader ? (
                    <th className={classNames(cellClassName, "font-semibold")} key={column.id} scope="row">
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td className={cellClassName} key={column.id}>
                      {column.cell(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
