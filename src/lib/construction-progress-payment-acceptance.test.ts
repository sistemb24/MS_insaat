import { describe, expect, it } from "vitest";

import { buildProgressPaymentLedgerPostingCommand } from "./progress-payment-ledger-posting-service";
import {
  calculateProgressPaymentTotals,
  createProgressPaymentId,
  type ProgressPaymentRow,
} from "./progress-payment-service";
import { buildConstructionProgressPaymentProjectionDraft } from "./construction-progress-payment-projection";
import {
  calculateConstructionItemSnapshot,
  canTransitionConstructionPayment,
  shouldCloseConstructionProject,
  validateConstructionPaymentChain,
} from "./construction-progress-payment-service";
import { defaultTenantScope } from "./tenant-scope";

describe("native cumulative construction progress payment acceptance chain", () => {
  it("carries payment 1 into a returned and re-approved payment 2, then builds a balanced financial projection", () => {
    const first = calculateConstructionItemSnapshot(
      { id: "item-1", contractQuantity: 100, unitPrice: 100, vatRate: 20 },
      [{ contractItemId: "item-1", quantity: 10 }],
    );
    expect(first).toMatchObject({ previousQuantity: 0, periodQuantity: 10, cumulativeQuantity: 10, cumulativeAmount: 1000, cumulativeVatAmount: 200 });

    expect(validateConstructionPaymentChain({ sequenceNo: 2, kind: "INTERIM", previous: { id: "payment-1", sequenceNo: 1, status: "APPROVED" } })).toEqual([]);
    const second = calculateConstructionItemSnapshot(
      { id: "item-1", contractQuantity: 100, unitPrice: 120, vatRate: 20 },
      [{ contractItemId: "item-1", quantity: 5 }],
      { contractItemId: "item-1", cumulativeQuantity: first.cumulativeQuantity, cumulativeAmount: first.cumulativeAmount, cumulativeVatAmount: first.cumulativeVatAmount },
    );
    expect(second).toMatchObject({ previousQuantity: 10, periodQuantity: 5, cumulativeQuantity: 15, previousAmount: 1000, periodAmount: 600, cumulativeAmount: 1600, cumulativeVatAmount: 320 });

    const workflow = [
      ["DRAFT", "SUBMITTED"],
      ["SUBMITTED", "RETURNED"],
      ["RETURNED", "SUBMITTED"],
      ["SUBMITTED", "APPROVED"],
      ["APPROVED", "FINALIZED"],
    ] as const;
    expect(workflow.every(([from, to]) => canTransitionConstructionPayment(from, to))).toBe(true);

    const draft = buildConstructionProgressPaymentProjectionDraft({
      documentNo: "HAK-002",
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
      description: "İkinci hakediş",
      periodDeductionTotal: 60,
      project: { paymentType: "Taşeron Hakedişi", counterpartyCode: "TAS-001", counterpartyName: "Örnek Taşeron", name: "NOA Projesi", siteCode: "SNT-001", siteName: "NOA Şantiyesi" },
      snapshots: [{ periodQuantity: second.periodQuantity, unitPrice: second.unitPrice, vatRate: second.vatRate, contractItem: { description: "Beton imalatı", unit: "m3" } }],
      extraWorks: [],
      financialMovements: [],
    });
    const totals = calculateProgressPaymentTotals(draft);
    expect(totals).toMatchObject({ grossTotal: 600, retentionTotal: 60, netTotal: 540, vatTotal: 108, grandTotal: 648 });

    const timestamp = "2026-07-31T12:00:00.000Z";
    const financial: ProgressPaymentRow = {
      ...draft,
      id: createProgressPaymentId(defaultTenantScope, draft.documentNo),
      tenantId: defaultTenantScope.tenantId,
      companyId: defaultTenantScope.companyId,
      periodId: defaultTenantScope.periodId,
      status: "Taslak",
      grossTotal: totals.grossTotal,
      retentionTotal: totals.retentionTotal,
      netTotal: totals.netTotal,
      vatTotal: totals.vatTotal,
      grandTotal: totals.grandTotal,
      lineCount: draft.lines.length,
      createdBy: defaultTenantScope.userId,
      updatedBy: defaultTenantScope.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const ledger = buildProgressPaymentLedgerPostingCommand({ progressPayment: financial, scope: defaultTenantScope, timestamp });
    expect(ledger).toMatchObject({ ok: true, data: { ledgerEntry: { sourceType: "progress-payment", sourceId: financial.id, debitTotal: 648, creditTotal: 648 } } });
  });

  it("accepts a final payment only after the approved prior sequence and closes the project on finalization", () => {
    expect(validateConstructionPaymentChain({ sequenceNo: 3, kind: "FINAL", previous: { id: "payment-2", sequenceNo: 2, status: "APPROVED" } })).toEqual([]);
    expect(shouldCloseConstructionProject({ kind: "FINAL", targetStatus: "FINALIZED" })).toBe(true);
    expect(shouldCloseConstructionProject({ kind: "INTERIM", targetStatus: "FINALIZED" })).toBe(false);
  });
});
