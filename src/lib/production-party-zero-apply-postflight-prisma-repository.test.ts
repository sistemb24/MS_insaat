import { describe, expect, it, vi } from "vitest";

import { createProductionPartyZeroApplyPostflightPrismaRepository } from
  "./production-party-zero-apply-postflight-prisma-repository";

const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};

describe("production Party zero-apply postflight prisma repository", () => {
  it("reads the exact scope in a repeatable-read, read-only transaction", async () => {
    const transactionOptions: unknown[] = [];
    const tx = createTransactionFixture("on");
    const prisma = {
      $transaction: vi.fn(async (
        callback: (client: typeof tx) => Promise<unknown>,
        options: unknown,
      ) => {
        transactionOptions.push(options);
        return callback(tx);
      }),
    };
    const repository = createProductionPartyZeroApplyPostflightPrismaRepository(
      prisma as never,
    );

    const state = await repository.readExactState({
      actorUserId: "user-production-bootstrap",
      runId: "party-backfill-run_4115ec986dd3914547de192820ba9799",
      scope,
    });

    expect(state).toMatchObject({
      auditCount: 1,
      issueCount: 0,
      partyCount: 0,
      roleCount: 0,
      runCount: 1,
      transactionReadOnly: true,
    });
    expect(transactionOptions).toEqual([{
      isolationLevel: "RepeatableRead",
      maxWait: 10_000,
      timeout: 120_000,
    }]);
    expect(tx.partyBackfillRun.count).toHaveBeenCalledWith({ where: scope });
    expect(tx.partyBackfillRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { ...scope, id: "party-backfill-run_4115ec986dd3914547de192820ba9799" },
    }));
    expect(tx.auditLog.count).toHaveBeenCalledWith({
      where: {
        ...scope,
        action: "party.backfill.verified",
        actorUserId: "user-production-bootstrap",
        entityId: "party-backfill-run_4115ec986dd3914547de192820ba9799",
        entityType: "party-backfill-run",
      },
    });
  });

  it("fails closed when the database transaction is not read-only", async () => {
    const tx = createTransactionFixture("off");
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx)),
    };
    const repository = createProductionPartyZeroApplyPostflightPrismaRepository(
      prisma as never,
    );

    await expect(repository.readExactState({
      actorUserId: "user-production-bootstrap",
      runId: "party-backfill-run_4115ec986dd3914547de192820ba9799",
      scope,
    })).rejects.toThrow(/salt-okunur değil/);
    expect(tx.partyBackfillRun.count).not.toHaveBeenCalled();
  });
});

function createTransactionFixture(readOnly: "off" | "on") {
  const countZero = () => vi.fn().mockResolvedValue(0);
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ read_only: readOnly }]),
    auditLog: { count: vi.fn().mockResolvedValue(1) },
    cashBankMovement: { count: countZero() },
    ledgerEntry: { count: countZero() },
    party: { count: countZero() },
    partyBackfillIssue: { count: countZero() },
    partyBackfillRun: {
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue({
        candidateCount: 0,
        issueCount: 0,
        sourceChecksum: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
        sourceCount: 0,
        status: "VERIFIED",
        version: "party-v1",
      }),
    },
    partyRole: { count: countZero() },
    progressPayment: { count: countZero() },
    purchaseInvoice: { count: countZero() },
    salesInvoice: { count: countZero() },
  };
}
