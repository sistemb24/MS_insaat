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
});
