import { describe, expect, test } from "vitest";
import { buildCounterpartyOverview } from "./counterparty-overview";

describe("counterparty overview", () => {
  test("summarizes receivable and payable balances by counterparty", () => {
    const rows = [
      { counterpartyName: "Müşteri", amount: 1000 },
      { counterpartyName: "Müşteri", amount: -250 },
      { counterpartyName: "Tedarikçi", amount: -400 },
    ] as never;
    expect(buildCounterpartyOverview(rows)).toEqual({
      counterparties: [
        { counterpartyName: "Müşteri", balance: 750, movementCount: 2 },
        { counterpartyName: "Tedarikçi", balance: -400, movementCount: 1 },
      ],
      movementCount: 3,
      payableTotal: 400,
      receivableTotal: 750,
    });
  });

  test("keeps same-name counterparties separate by canonical party key", () => {
    const rows = [
      { counterpartyName: "Aynı Unvan", partyKey: "customer:MUS-0001", amount: 1000 },
      { counterpartyName: "Aynı Unvan", partyKey: "customer:MUS-0002", amount: 250 },
    ] as never;

    expect(buildCounterpartyOverview(rows).counterparties).toEqual([
      {
        counterpartyName: "Aynı Unvan",
        partyKey: "customer:MUS-0001",
        balance: 1000,
        movementCount: 1,
      },
      {
        counterpartyName: "Aynı Unvan",
        partyKey: "customer:MUS-0002",
        balance: 250,
        movementCount: 1,
      },
    ]);
  });
});
