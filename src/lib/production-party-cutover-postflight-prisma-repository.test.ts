import { expect, test, vi } from "vitest";

import { createProductionPartyCutoverPostflightPrismaRepository } from
  "./production-party-cutover-postflight-prisma-repository";

const scope = {
  companyId: "company-ms-insaat",
  periodId: "period-ms-insaat-2026",
  tenantId: "tenant-ms-insaat",
};

test("reads state, event, audit and parity in one read-only repeatable-read snapshot", async () => {
  const fixture = createFixture(true);
  const repository = createProductionPartyCutoverPostflightPrismaRepository(
    fixture.prisma as never,
  );

  const result = await repository.readExactState({ scope });

  expect(result).toMatchObject({
    audits: [],
    events: [],
    paritySnapshot: { legacyRecords: [], parties: [], roles: [] },
    state: null,
    stateCount: 0,
    transactionReadOnly: true,
  });
  expect(fixture.tx.partyCutoverState.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: scope }),
  );
  expect(fixture.tx.partyCutoverEvent.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: scope }),
  );
  expect(fixture.tx.auditLog.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        ...scope,
        entityType: "party-cutover-state",
      }),
    }),
  );
  expect(fixture.options).toEqual({
    isolationLevel: "RepeatableRead",
    maxWait: 10_000,
    timeout: 30_000,
  });
});

test("fails before scope reads when the inventory transaction is writable", async () => {
  const fixture = createFixture(false);
  const repository = createProductionPartyCutoverPostflightPrismaRepository(
    fixture.prisma as never,
  );

  await expect(repository.readExactState({ scope })).rejects.toThrow(/salt-okunur değil/);
  expect(fixture.tx.partyCutoverState.findMany).not.toHaveBeenCalled();
});

function createFixture(readOnly: boolean) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ read_only: readOnly ? "on" : "off" }]),
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    entityRecord: { findMany: vi.fn().mockResolvedValue([]) },
    party: { findMany: vi.fn().mockResolvedValue([]) },
    partyCutoverEvent: { findMany: vi.fn().mockResolvedValue([]) },
    partyCutoverState: { findMany: vi.fn().mockResolvedValue([]) },
    partyRole: { findMany: vi.fn().mockResolvedValue([]) },
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
