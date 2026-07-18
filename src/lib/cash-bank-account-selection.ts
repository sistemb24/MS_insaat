import type { CashBankAccountOption } from "./cash-bank-movement-service";
import type { EntityRow } from "./entities";

export type CashBankAccountSelectionResult =
  | {
      ok: true;
      data: {
        account?: CashBankAccountOption;
      };
      errors?: never;
    }
  | {
      ok: false;
      errors: string[];
      data?: never;
    };

export function resolveActiveCashBankAccountOption({
  account,
  rows,
}: {
  account?: CashBankAccountOption;
  rows: EntityRow[];
}): CashBankAccountSelectionResult {
  const activeRows = rows.filter(isSelectableCashBankAccount);

  if (account) {
    const selectedCode = account.code.trim();
    const selectedRow = activeRows.find((row) => row.code === selectedCode);

    if (!selectedRow) {
      return {
        ok: false,
        errors: ["Ödeme hesabı aktif kasa/banka tanımlarında bulunamadı."],
      };
    }

    return {
      ok: true,
      data: {
        account: {
          code: selectedRow.code,
          name: selectedRow.name,
        },
      },
    };
  }

  const fallbackRow =
    activeRows.find((row) => row.code === "KASA-0001") ?? activeRows[0];

  return {
    ok: true,
    data: {
      account: fallbackRow
        ? {
            code: fallbackRow.code,
            name: fallbackRow.name,
          }
        : undefined,
    },
  };
}

function isSelectableCashBankAccount(row: EntityRow) {
  return row.status !== "Pasif" && Boolean(row.code?.trim() && row.name?.trim());
}
