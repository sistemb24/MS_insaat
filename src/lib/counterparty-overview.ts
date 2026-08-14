import type { OperationalReportCounterpartyStatementDetailRow } from "./reports-service";

export type CounterpartyOverviewRow = {
  counterpartyName: string;
  balance: number;
  movementCount: number;
  partyKey?: string;
};

export function buildCounterpartyOverview(rows: OperationalReportCounterpartyStatementDetailRow[]) {
  const byName = new Map<string, CounterpartyOverviewRow>();
  for (const row of rows) {
    const groupingKey = row.partyKey ?? `legacy-name:${row.counterpartyName}`;
    const current = byName.get(groupingKey) ?? {
      counterpartyName: row.counterpartyName,
      balance: 0,
      movementCount: 0,
      ...(row.partyKey ? { partyKey: row.partyKey } : {}),
    };
    current.balance += row.amount;
    current.movementCount += 1;
    byName.set(groupingKey, current);
  }
  const counterparties = [...byName.values()].map((row) => ({ ...row, balance: Math.round(row.balance * 100) / 100 })).sort((left, right) => Math.abs(right.balance) - Math.abs(left.balance));
  return {
    counterparties,
    receivableTotal: counterparties.filter((row) => row.balance > 0).reduce((total, row) => total + row.balance, 0),
    payableTotal: counterparties.filter((row) => row.balance < 0).reduce((total, row) => total + Math.abs(row.balance), 0),
    movementCount: rows.length,
  };
}
