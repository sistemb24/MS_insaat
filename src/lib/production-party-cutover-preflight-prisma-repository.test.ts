import { expect, test, vi } from "vitest";

import { createProductionPartyCutoverPreflightPrismaRepository } from
  "./production-party-cutover-preflight-prisma-repository";

const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};

test("reads PRE migration evidence without touching absent cutover tables", async () => {
  const fixture = createFixture(false);
  const repository = createProductionPartyCutoverPreflightPrismaRepository(
    fixture.prisma as never,
  );

  const read = await repository.readScope({
    actorUserId: "user-production-bootstrap",
    scope,
  });

  expect(read).toMatchObject({
    cutoverAuditCount: 0,
    cutoverEventCount: 0,
    cutoverState: null,
    cutoverStateCount: 0,
    transactionReadOnly: true,
  });
  expect(fixture.tx.partyCutoverState.count).not.toHaveBeenCalled();
  expect(fixture.tx.partyCutoverEvent.count).not.toHaveBeenCalled();
  expect(fixture.options).toEqual({
    isolationLevel: "RepeatableRead",
    maxWait: 10_000,
    timeout: 120_000,
  });
});

test("reads exact cutover state only when both migration tables exist", async () => {
  const fixture = createFixture(true);
  fixture.tx.partyCutoverState.count.mockResolvedValue(1);
  fixture.tx.partyCutoverEvent.count.mockResolvedValue(1);
  fixture.tx.partyCutoverState.findFirst.mockResolvedValue({
    mode: "SHADOW_READ",
    parityChecksum: "a".repeat(64),
    revisionNo: 1,
  });
  const repository = createProductionPartyCutoverPreflightPrismaRepository(
    fixture.prisma as never,
  );

  const read = await repository.readScope({
    actorUserId: "user-production-bootstrap",
    scope,
  });

  expect(read).toMatchObject({
    cutoverEventCount: 1,
    cutoverState: { mode: "SHADOW_READ", revisionNo: 1 },
    cutoverStateCount: 1,
  });
  expect(fixture.tx.partyCutoverState.count).toHaveBeenCalledWith({ where: scope });
  expect(fixture.tx.partyCutoverEvent.count).toHaveBeenCalledWith({ where: scope });
});

test("fails before scope reads when the inventory transaction is writable", async () => {
  const fixture = createFixture(false, false);
  const repository = createProductionPartyCutoverPreflightPrismaRepository(
    fixture.prisma as never,
  );

  await expect(repository.readScope({
    actorUserId: "user-production-bootstrap",
    scope,
  })).rejects.toThrow(/salt-okunur değil/);
  expect(fixture.tx.tenant.findUnique).not.toHaveBeenCalled();
});

function createFixture(hasCutoverTables: boolean, readOnly = true) {
  const tableNames = [
    "_prisma_migrations",
    "Party",
    "PartyBackfillIssue",
    "PartyBackfillRun",
    "PartyRole",
    ...(hasCutoverTables ? ["PartyCutoverEvent", "PartyCutoverState"] : []),
  ];
  const tx = {
    $queryRaw: vi.fn(async (query: { strings?: readonly string[] }) => {
      const sql = query.strings?.join("?") ?? "";
      if (sql.includes("transaction_read_only")) {
        return [{ read_only: readOnly ? "on" : "off" }];
      }
      if (sql.includes("pg_catalog.pg_tables")) {
        return tableNames.map((table_name) => ({ table_name }));
      }
      if (sql.includes("_prisma_migrations")) return [];
      throw new Error(`Unexpected query: ${sql}`);
    }),
    appUserScopeAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    auditLog: { count: vi.fn().mockResolvedValue(1) },
    cashBankMovement: { count: vi.fn().mockResolvedValue(0) },
    company: { findFirst: vi.fn().mockResolvedValue({ id: scope.companyId }) },
    entityRecord: { findMany: vi.fn().mockResolvedValue([]) },
    ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
    party: { findMany: vi.fn().mockResolvedValue([]) },
    partyBackfillIssue: { count: vi.fn().mockResolvedValue(0) },
    partyBackfillRun: {
      findMany: vi.fn().mockResolvedValue([{
        candidateCount: 0,
        issueCount: 0,
        sourceChecksum: "a".repeat(64),
        sourceCount: 0,
        status: "VERIFIED",
        version: "party-v1",
      }]),
    },
    partyCutoverEvent: { count: vi.fn().mockResolvedValue(0) },
    partyCutoverState: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    partyRole: { findMany: vi.fn().mockResolvedValue([]) },
    period: { findFirst: vi.fn().mockResolvedValue({ isClosed: false }) },
    progressPayment: { count: vi.fn().mockResolvedValue(0) },
    purchaseInvoice: { count: vi.fn().mockResolvedValue(0) },
    salesInvoice: { count: vi.fn().mockResolvedValue(0) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ lifecycleStatus: "ACTIVE" }) },
  };
  let options: unknown;
  const prisma = {
    $transaction: vi.fn(async (
      callback: (transaction: typeof tx) => Promise<unknown>,
      value: unknown,
    ) => {
      options = value;
      return callback(tx);
    }),
  };
  return { get options() { return options; }, prisma, tx };
}
