import { describe, expect, it, vi } from "vitest";

import { createPartyParityPrismaRepository } from
  "./party-parity-read-model-prisma-repository";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
};

describe("Party parity Prisma repository", () => {
  it("uses one read-only repeatable-read snapshot with exact scope filters", async () => {
    const fixture = createFixture("on");
    const repository = createPartyParityPrismaRepository(fixture.prisma as never);

    const result = await repository.readScope({ scope });

    expect(result).toEqual({ legacyRecords: [], parties: [], roles: [] });
    expect(fixture.options).toEqual({
      isolationLevel: "RepeatableRead",
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(fixture.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(fixture.tx.entityRecord.findMany).toHaveBeenCalledWith({
      orderBy: [{ slug: "asc" }, { code: "asc" }],
      select: {
        code: true,
        companyId: true,
        data: true,
        periodId: true,
        slug: true,
        tenantId: true,
      },
      where: {
        ...scope,
        slug: { in: ["musteriler", "taseronlar", "tedarikciler"] },
      },
    });
    expect(fixture.tx.party.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: scope,
    }));
    expect(fixture.tx.partyRole.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: scope,
    }));
  });

  it("fails before scoped reads when read-only mode cannot be proven", async () => {
    const fixture = createFixture("off");
    const repository = createPartyParityPrismaRepository(fixture.prisma as never);

    await expect(repository.readScope({ scope })).rejects.toThrow(/salt-okunur/);
    expect(fixture.tx.entityRecord.findMany).not.toHaveBeenCalled();
    expect(fixture.tx.party.findMany).not.toHaveBeenCalled();
    expect(fixture.tx.partyRole.findMany).not.toHaveBeenCalled();
  });
});

function createFixture(readOnly: "off" | "on") {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(0),
    $queryRaw: vi.fn().mockResolvedValue([{ read_only: readOnly }]),
    entityRecord: { findMany: vi.fn().mockResolvedValue([]) },
    party: { findMany: vi.fn().mockResolvedValue([]) },
    partyRole: { findMany: vi.fn().mockResolvedValue([]) },
  };
  let options: unknown;
  const prisma = {
    $transaction: vi.fn(async (
      callback: (client: typeof tx) => Promise<unknown>,
      value: unknown,
    ) => {
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
