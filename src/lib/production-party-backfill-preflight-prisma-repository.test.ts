import { describe, expect, it, vi } from "vitest";

import { createProductionPartyPreflightPrismaRepository } from
  "./production-party-backfill-preflight-prisma-repository";

const scope = { companyId: "company-1", periodId: "period-1", tenantId: "tenant-1" };

describe("production party preflight prisma repository", () => {
  it("fails before scoped reads when the DB transaction is not read-only", async () => {
    const fixture = createFixture("off");
    const repository = createProductionPartyPreflightPrismaRepository(
      fixture.prisma as never,
    );

    await expect(repository.readScope({ actorUserId: "admin-1", scope }))
      .rejects.toThrow(/salt-okunur değil/);
    expect(fixture.tx.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("uses one repeatable-read snapshot and exact tenant/company/period scope", async () => {
    const fixture = createFixture("on");
    const repository = createProductionPartyPreflightPrismaRepository(
      fixture.prisma as never,
    );

    const result = await repository.readScope({ actorUserId: "admin-1", scope });

    expect(result).toMatchObject({
      actorHasActiveAdminAccess: true,
      companyExists: true,
      migrationTableExists: true,
      transactionReadOnly: true,
    });
    expect(fixture.options).toEqual({
      isolationLevel: "RepeatableRead",
      maxWait: 10_000,
      timeout: 120_000,
    });
    expect(fixture.tx.period.findFirst).toHaveBeenCalledWith({
      select: { isClosed: true },
      where: { companyId: "company-1", id: "period-1", tenantId: "tenant-1" },
    });
    expect(fixture.tx.entityRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining(scope),
    }));
    expect(fixture.tx.partyRole.findMany).not.toHaveBeenCalled();
  });
});

function createFixture(readOnly: "off" | "on") {
  const queryRaw = vi.fn()
    .mockResolvedValueOnce([{ read_only: readOnly }])
    .mockResolvedValueOnce([
      { table_name: "_prisma_migrations" },
      { table_name: "EntityRecord" },
    ])
    .mockResolvedValueOnce([{
      finished: true,
      migration_name: "20260801120000_previous_migration",
      rolled_back: false,
    }]);
  const tx = {
    $queryRaw: queryRaw,
    appUserScopeAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    cashBankMovement: { count: vi.fn().mockResolvedValue(0) },
    company: { findFirst: vi.fn().mockResolvedValue({ id: scope.companyId }) },
    entityRecord: { findMany: vi.fn().mockResolvedValue([]) },
    ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
    partyRole: { findMany: vi.fn().mockResolvedValue([]) },
    period: { findFirst: vi.fn().mockResolvedValue({ isClosed: false }) },
    progressPayment: { count: vi.fn().mockResolvedValue(0) },
    purchaseInvoice: { count: vi.fn().mockResolvedValue(0) },
    salesInvoice: { count: vi.fn().mockResolvedValue(0) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ lifecycleStatus: "ACTIVE" }) },
  };
  let options: unknown;
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>, value: unknown) => {
      options = value;
      return callback(tx);
    }),
  };
  return {
    get options() { return options; },
    prisma,
    tx,
  };
}
