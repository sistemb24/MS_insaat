import { describe, expect, it } from "vitest";

import {
  aggregateConstructionMeasurementQuantities,
  calculateConstructionMeasurementLineQuantity,
  calculateConstructionItemSnapshot,
  calculateConstructionPaymentTotals,
  calculateConstructionSupplementarySummary,
  canTransitionConstructionPayment,
  reconcileConstructionPrimaryMeasurementQuantities,
  nextConstructionPaymentSequence,
  shouldCloseConstructionProject,
  validateConstructionPaymentChain,
} from "./construction-progress-payment-service";

describe("construction progress payment calculation", () => {
  it("calculates dimension-based measurement rows and aggregates corrections by contract item", () => {
    expect(calculateConstructionMeasurementLineQuantity({ quantity: 0, length: 5, width: 2.5, height: 0.2, multiplier: 3 })).toBe(7.5);
    expect(calculateConstructionMeasurementLineQuantity({ quantity: -1.25, multiplier: 99 })).toBe(-1.25);
    expect(aggregateConstructionMeasurementQuantities([
      { contractItemId: "item-1", quantity: 7.5 },
      { contractItemId: "item-1", quantity: -1.25 },
      { contractItemId: "item-2", quantity: 3 },
    ])).toEqual([
      { contractItemId: "item-1", quantity: 6.25 },
      { contractItemId: "item-2", quantity: 3 },
    ]);
  });

  it("reconciles the primary summary sheet without deleting detailed sheet quantities", () => {
    expect(reconcileConstructionPrimaryMeasurementQuantities(
      [{ contractItemId: "item-1", quantity: 12 }, { contractItemId: "item-2", quantity: 5 }],
      [{ contractItemId: "item-1", quantity: 3 }, { contractItemId: "item-1", quantity: 2 }, { contractItemId: "item-2", quantity: 7 }],
    )).toEqual([
      { contractItemId: "item-1", quantity: 7 },
      { contractItemId: "item-2", quantity: -2 },
    ]);
  });

  it("carries the approved cumulative quantity and amount into the next payment", () => {
    const first = calculateConstructionItemSnapshot(
      { id: "item-1", contractQuantity: 100, unitPrice: 750 },
      [{ contractItemId: "item-1", quantity: 12.5 }],
    );
    const second = calculateConstructionItemSnapshot(
      { id: "item-1", contractQuantity: 100, unitPrice: 800 },
      [{ contractItemId: "item-1", quantity: 7.5 }],
      {
        contractItemId: "item-1",
        cumulativeQuantity: first.cumulativeQuantity,
        cumulativeAmount: first.cumulativeAmount,
      },
    );

    expect(first.cumulativeQuantity).toBe(12.5);
    expect(first.cumulativeAmount).toBe(9375);
    expect(second.previousQuantity).toBe(12.5);
    expect(second.periodAmount).toBe(6000);
    expect(second.cumulativeQuantity).toBe(20);
    expect(second.cumulativeAmount).toBe(15375);
  });

  it("flags contract quantity overruns without changing the calculated values", () => {
    const snapshot = calculateConstructionItemSnapshot(
      { id: "item-1", contractQuantity: 10, unitPrice: 100 },
      [{ contractItemId: "item-1", quantity: 12 }],
    );

    expect(snapshot.cumulativeQuantity).toBe(12);
    expect(snapshot.exceededContract).toBe(true);
  });

  it("snapshots VAT and carries prior VAT without repricing it at the current rate", () => {
    const first = calculateConstructionItemSnapshot({ id: "item-1", contractQuantity: 100, unitPrice: 100, vatRate: 20 }, [{ contractItemId: "item-1", quantity: 10 }]);
    const second = calculateConstructionItemSnapshot({ id: "item-1", contractQuantity: 100, unitPrice: 100, vatRate: 10 }, [{ contractItemId: "item-1", quantity: 5 }], { contractItemId: "item-1", cumulativeQuantity: first.cumulativeQuantity, cumulativeAmount: first.cumulativeAmount, cumulativeVatAmount: first.cumulativeVatAmount });

    expect(first.periodVatAmount).toBe(200);
    expect(second.previousVatAmount).toBe(200);
    expect(second.periodVatAmount).toBe(50);
    expect(second.cumulativeVatAmount).toBe(250);
    expect(calculateConstructionPaymentTotals([second]).periodVatTotal).toBe(50);
  });

  it("sums current and cumulative totals from item snapshots", () => {
    const totals = calculateConstructionPaymentTotals([
      {
        contractItemId: "item-1",
        previousQuantity: 0,
        periodQuantity: 10,
        cumulativeQuantity: 10,
        unitPrice: 100,
        vatRate: 0,
        previousAmount: 0,
        periodAmount: 1000,
        cumulativeAmount: 1000,
        previousVatAmount: 0,
        periodVatAmount: 0,
        cumulativeVatAmount: 0,
        contractQuantity: 100,
        exceededContract: false,
        calculationVersion: "construction-v1",
      },
      {
        contractItemId: "item-2",
        previousQuantity: 5,
        periodQuantity: 2,
        cumulativeQuantity: 7,
        unitPrice: 250,
        vatRate: 0,
        previousAmount: 1250,
        periodAmount: 500,
        cumulativeAmount: 1750,
        previousVatAmount: 0,
        periodVatAmount: 0,
        cumulativeVatAmount: 0,
        contractQuantity: 100,
        exceededContract: false,
        calculationVersion: "construction-v1",
      },
    ]);

    expect(totals.periodGrossTotal).toBe(1500);
    expect(totals.cumulativeGrossTotal).toBe(2750);
  });

  it("calculates extra work, additions, deductions and payable totals cumulatively", () => {
    const summary = calculateConstructionSupplementarySummary({
      periodBaseTotal: 10000,
      previous: { cumulativeExtraWorkTotal: 1000, cumulativeAdditionTotal: 200, cumulativeDeductionTotal: 500, cumulativePayableTotal: 10700 },
      extraWorks: [{ amount: 2500 }],
      deductions: [{ amount: 600 }, { amount: 120 }],
      financialMovements: [{ direction: "ADDITION", amount: 300 }, { direction: "DEDUCTION", amount: 450 }],
    });

    expect(summary).toEqual({
      periodExtraWorkTotal: 2500,
      periodAdditionTotal: 300,
      periodDeductionTotal: 1170,
      periodPayableTotal: 11630,
      cumulativeExtraWorkTotal: 3500,
      cumulativeAdditionTotal: 500,
      cumulativeDeductionTotal: 1670,
      cumulativePayableTotal: 22330,
    });
  });
});

describe("construction progress payment chain", () => {
  it("continues from an imported opening balance sequence instead of the visible row count", () => {
    expect(nextConstructionPaymentSequence([])).toBe(1);
    expect(nextConstructionPaymentSequence([{ sequenceNo: 3 }])).toBe(4);
    expect(nextConstructionPaymentSequence([{ sequenceNo: 1 }, { sequenceNo: 5 }])).toBe(6);
  });

  it("requires FIRST without a previous payment", () => {
    expect(
      validateConstructionPaymentChain({ sequenceNo: 1, kind: "FIRST" }),
    ).toEqual([]);
    expect(
      validateConstructionPaymentChain({ sequenceNo: 1, kind: "INTERIM" }),
    ).toContain("İlk hakediş önceki hakediş olmadan FIRST türünde olmalıdır.");
  });

  it("requires the immediately previous approved payment", () => {
    expect(
      validateConstructionPaymentChain({
        sequenceNo: 2,
        kind: "INTERIM",
        previous: { id: "p1", sequenceNo: 1, status: "APPROVED" },
      }),
    ).toEqual([]);
    expect(
      validateConstructionPaymentChain({
        sequenceNo: 3,
        kind: "INTERIM",
        previous: { id: "p1", sequenceNo: 1, status: "APPROVED" },
      }),
    ).toContain("Hakediş sıra numarası zincir içinde ardışık olmalıdır.");
  });

  it("locks finalized payments and permits only the planned transitions", () => {
    expect(canTransitionConstructionPayment("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionConstructionPayment("SUBMITTED", "RETURNED")).toBe(true);
    expect(canTransitionConstructionPayment("APPROVED", "FINALIZED")).toBe(true);
    expect(canTransitionConstructionPayment("FINALIZED", "DRAFT")).toBe(false);
  });

  it("closes the project only when a FINAL payment is finalized", () => {
    expect(shouldCloseConstructionProject({ kind: "INTERIM", targetStatus: "FINALIZED" })).toBe(false);
    expect(shouldCloseConstructionProject({ kind: "FINAL", targetStatus: "APPROVED" })).toBe(false);
    expect(shouldCloseConstructionProject({ kind: "FINAL", targetStatus: "FINALIZED" })).toBe(true);
  });
});
