import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  buildProgressPaymentLedgerPostingCommand,
  createProgressPaymentLedgerPostingService,
  type ProgressPaymentLedgerPostingCommand,
} from "./progress-payment-ledger-posting-service";
import type { ProgressPaymentRow } from "./progress-payment-service";

function createRow(overrides: Partial<ProgressPaymentRow> = {}): ProgressPaymentRow {
  return {
    id: "progress-payment-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    documentNo: "HAK-0001",
    issueDate: "2026-07-15",
    paymentType: "Taşeron Hakedişi",
    counterpartyCode: "TAS-001",
    counterpartyName: "Örnek Taşeron",
    siteCode: "SANT-001",
    siteName: "Örnek Şantiye",
    currency: "TL",
    description: "",
    lines: [{ description: "Kaba imalat", quantity: 1, unit: "iş", unitPrice: 10000, vatRate: 20 }],
    retentionRate: 5,
    status: "Taslak",
    grossTotal: 10000,
    retentionTotal: 500,
    netTotal: 9500,
    vatTotal: 1900,
    grandTotal: 11400,
    lineCount: 1,
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("progress payment ledger posting", () => {
  test("builds a balanced subcontractor progress payment journal", () => {
    const result = buildProgressPaymentLedgerPostingCommand({
      progressPayment: createRow(),
      scope: defaultTenantScope,
      timestamp: "2026-07-15T12:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.ledgerEntry).toMatchObject({
      sourceType: "progress-payment",
      sourceId: "progress-payment-1",
      documentNo: "YVM-HAK-HAK-0001",
      debitTotal: 11400,
      creditTotal: 11400,
    });
    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "740", direction: "debit", amount: 9500 }),
      expect.objectContaining({ accountCode: "191", direction: "debit", amount: 1900 }),
      expect.objectContaining({ accountCode: "320", direction: "credit", amount: 11400 }),
    ]);
    expect(result.data.successAudits).toHaveLength(2);
  });

  test("uses receivable and sales accounts for site income progress payments", () => {
    const result = buildProgressPaymentLedgerPostingCommand({
      progressPayment: createRow({ paymentType: "Şantiye Geliri" }),
      scope: defaultTenantScope,
      timestamp: "2026-07-15T12:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.ledgerEntry.lines).toEqual([
      expect.objectContaining({ accountCode: "120", direction: "debit", amount: 11400 }),
      expect.objectContaining({ accountCode: "600", direction: "credit", amount: 9500 }),
      expect.objectContaining({ accountCode: "391", direction: "credit", amount: 1900 }),
    ]);
  });

  test("rejects viewer, closed-period and already posted progress payments", () => {
    expect(
      buildProgressPaymentLedgerPostingCommand({
        progressPayment: createRow(),
        scope: { ...defaultTenantScope, userRole: "viewer" },
        timestamp: "2026-07-15T12:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, reasonCode: "permission-denied" });

    expect(
      buildProgressPaymentLedgerPostingCommand({
        progressPayment: createRow(),
        scope: { ...defaultTenantScope, periodClosed: true },
        timestamp: "2026-07-15T12:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, reasonCode: "period-closed" });

    expect(
      buildProgressPaymentLedgerPostingCommand({
        progressPayment: createRow({ status: "Kaydedildi" }),
        scope: defaultTenantScope,
        timestamp: "2026-07-15T12:00:00.000Z",
      }),
    ).toMatchObject({ ok: false, reasonCode: "invalid-status" });
  });

  test("delegates an accepted command to the idempotent repository boundary", async () => {
    const repository = {
      commit: async (command: ProgressPaymentLedgerPostingCommand) => ({
        ok: true as const,
        data: {
          progressPayment: command.progressPayment,
          ledgerEntry: command.ledgerEntry,
          created: false,
        },
      }),
    };
    const service = createProgressPaymentLedgerPostingService({
      now: () => "2026-07-15T12:00:00.000Z",
      repository,
    });

    const result = await service.post({
      progressPayment: createRow(),
      scope: defaultTenantScope,
    });

    expect(result).toMatchObject({ ok: true, data: { created: false, ledgerEntry: { documentNo: "YVM-HAK-HAK-0001" } } });
  });
});
