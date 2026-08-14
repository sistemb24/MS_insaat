import { describe, expect, test, vi } from "vitest";

import {
  runProductionPartyZeroApplyPostflight,
  type ProductionPartyZeroApplyPostflightRepository,
} from "./production-party-zero-apply-postflight";

const config = {
  actorUserId: "user-production-bootstrap",
  databaseUrl: "postgresql://reader:secret@production.example/noa",
  expectedPostMigrationManifestChecksum: "a".repeat(64),
  expectedRunId: "party-backfill-run_4115ec986dd3914547de192820ba9799",
  expectedSourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  releaseId: "8b31f6116f000dabd7a6d908ac552724b558bcce",
  scope: {
    companyId: "company-ms-insaat",
    periodId: "period-ms-insaat-2026",
    tenantId: "tenant-ms-insaat",
  },
};

function repository(overrides: Record<string, unknown> = {}) {
  return {
    readExactState: vi.fn().mockResolvedValue({
      auditCount: 1,
      financialCounts: {
        cashBankMovement: 0,
        ledgerEntry: 0,
        progressPayment: 0,
        purchaseInvoice: 0,
        salesInvoice: 0,
      },
      issueCount: 0,
      partyCount: 0,
      roleCount: 0,
      run: {
        candidateCount: 0,
        issueCount: 0,
        sourceChecksum: config.expectedSourceChecksum,
        sourceCount: 0,
        status: "VERIFIED",
        version: "party-v1",
      },
      runCount: 1,
      transactionReadOnly: true,
      ...overrides,
    }),
  } satisfies ProductionPartyZeroApplyPostflightRepository;
}

describe("production Party zero-apply postflight", () => {
  test("accepts exactly one verified run/audit and no business rows", async () => {
    await expect(runProductionPartyZeroApplyPostflight({
      config,
      repository: repository(),
    })).resolves.toMatchObject({ blockers: [], ready: true, runCount: 1 });
  });

  test("fails closed on duplicate audit, Party rows or financial drift", async () => {
    const result = await runProductionPartyZeroApplyPostflight({
      config,
      repository: repository({
        auditCount: 2,
        financialCounts: {
          cashBankMovement: 0,
          ledgerEntry: 1,
          progressPayment: 0,
          purchaseInvoice: 0,
          salesInvoice: 0,
        },
        partyCount: 1,
      }),
    });
    expect(result).toMatchObject({
      blockers: expect.arrayContaining([
        "AUDIT_COUNT_MISMATCH",
        "FINANCIAL_COUNTS_NOT_ZERO",
        "PARTY_COUNT_NOT_ZERO",
      ]),
      ready: false,
    });
  });
});
