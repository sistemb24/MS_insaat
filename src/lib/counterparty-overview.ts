import type { OperationalReportCounterpartyStatementDetailRow } from "./reports-service";

export type CounterpartyOverviewRow = {
  counterpartyName: string;
  balance: number;
  movementCount: number;
};

export function buildCounterpartyOverview(rows: OperationalReportCounterpartyStatementDetailRow[]) {
  const byName = new Map<string, CounterpartyOverviewRow>();
  for (const row of rows) {
    const current = byName.get(row.counterpartyName) ?? { counterpartyName: row.counterpartyName, balance: 0, movementCount: 0 };
    current.balance += row.amount;
    current.movementCount += 1;
    byName.set(row.counterpartyName, current);
  }
  const counterparties = [...byName.values()].map((row) => ({ ...row, balance: Math.round(row.balance * 100) / 100 })).sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
  return {
    counterparties,
    receivableTotal: counterparties.filter((row) => row.balance > 0).reduce((total, row) => total + row.balance, 0),
    payableTotal: counterparties.filter((row) => row.balance < 0).reduce((total, row) => total + Math.abs(row.balance), 0),
    movementCount: rows.length,
  };
}
