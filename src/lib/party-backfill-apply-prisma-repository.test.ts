import { describe, expect, it, vi } from "vitest";

import { createPartyBackfillApplyPrismaRepository } from "./party-backfill-apply-prisma-repository";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
};
const occurredAt = new Date("2026-08-14T12:00:00.000Z");

describe("party backfill apply prisma repository", () => {
  it("uses a serializable snapshot for preview", async () => {
    const fixture = createFixture();
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );

    const plan = await repository.previewConsistently({ scope, version: "party-v1" });

    expect(plan.run).toMatchObject({ candidateCount: 1, sourceCount: 1 });
    expect(fixture.transactionOptions).toEqual([{ isolationLevel: "Serializable" }]);
    expect(fixture.store.runs).toHaveLength(0);
    expect(fixture.store.audits).toHaveLength(0);
  });

  it("writes and verifies a clean scope atomically, including a closed-period audit marker", async () => {
    const fixture = createFixture({ periodClosed: true });
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );
    const preview = await repository.previewConsistently({ scope, version: "party-v1" });

    const result = await repository.applyAtomically(command(preview.run.sourceChecksum));

    expect(result).toMatchObject({
      blockingIssueCount: 0,
      candidateCount: 1,
      reused: false,
      sourceCount: 1,
      status: "VERIFIED",
    });
    expect(fixture.store.parties).toHaveLength(1);
    expect(fixture.store.roles).toHaveLength(1);
    expect(fixture.store.runs).toEqual([
      expect.objectContaining({ completedAt: occurredAt, status: "VERIFIED" }),
    ]);
    expect(fixture.store.audits).toEqual([
      expect.objectContaining({
        action: "party.backfill.verified",
        metadata: expect.objectContaining({ periodClosed: true }),
      }),
    ]);
    expect(fixture.transactionOptions).toEqual([
      { isolationLevel: "Serializable" },
      { isolationLevel: "Serializable" },
    ]);
    expect(fixture.prisma.period.findFirst).toHaveBeenCalledWith({
      select: { id: true, isClosed: true },
      where: {
        companyId: scope.companyId,
        id: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
  });

  it("persists only run, quarantine and audit when a blocking issue exists", async () => {
    const fixture = createFixture({ name: "" });
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );
    const preview = await repository.previewConsistently({ scope, version: "party-v1" });

    const result = await repository.applyAtomically(command(preview.run.sourceChecksum));

    expect(result).toMatchObject({
      blockingIssueCount: 1,
      candidateCount: 0,
      status: "BLOCKED",
    });
    expect(fixture.store.parties).toHaveLength(0);
    expect(fixture.store.roles).toHaveLength(0);
    expect(fixture.store.issues).toEqual([
      expect.objectContaining({ issueCode: "INVALID_NAME", status: "OPEN" }),
    ]);
    expect(fixture.store.audits).toEqual([
      expect.objectContaining({ action: "party.backfill.blocked" }),
    ]);
  });

  it("reuses a verified run without creating a second audit or Party", async () => {
    const fixture = createFixture();
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );
    const preview = await repository.previewConsistently({ scope, version: "party-v1" });
    const input = command(preview.run.sourceChecksum);

    await repository.applyAtomically(input);
    const retry = await repository.applyAtomically(input);

    expect(retry).toMatchObject({ candidateCount: 1, reused: true, status: "VERIFIED" });
    expect(fixture.store.parties).toHaveLength(1);
    expect(fixture.store.roles).toHaveLength(1);
    expect(fixture.store.audits).toHaveLength(1);
  });

  it("verifies an empty scope without issuing empty Party createMany calls", async () => {
    const fixture = createFixture();
    fixture.store.records.splice(0);
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );
    const preview = await repository.previewConsistently({ scope, version: "party-v1" });

    const result = await repository.applyAtomically({
      ...command(preview.run.sourceChecksum),
      approvedSourceCountLimit: 0,
    });

    expect(result).toMatchObject({ candidateCount: 0, sourceCount: 0, status: "VERIFIED" });
    expect(fixture.prisma.party.createMany).not.toHaveBeenCalled();
    expect(fixture.prisma.partyRole.createMany).not.toHaveBeenCalled();
  });

  it("fails closed for changed source, row-limit overflow and missing admin access", async () => {
    const fixture = createFixture();
    const repository = createPartyBackfillApplyPrismaRepository(
      fixture.prisma as never,
      () => occurredAt,
    );
    const preview = await repository.previewConsistently({ scope, version: "party-v1" });
    fixture.store.records[0].data = { name: "Değişen Müşteri", status: "Aktif" };

    await expect(repository.applyAtomically(command(preview.run.sourceChecksum)))
      .rejects.toThrow(/preview sonrasında değişti/);
    fixture.store.records[0].data = { name: "Müşteri", status: "Aktif" };
    await expect(repository.applyAtomically({
      ...command(preview.run.sourceChecksum),
      approvedSourceCountLimit: 0,
    })).rejects.toThrow(/limiti aşıyor/);
    fixture.store.adminAccess = false;
    await expect(repository.applyAtomically(command(preview.run.sourceChecksum)))
      .rejects.toThrow(/admin yetkisi/);
    expect(fixture.store.runs).toHaveLength(0);
  });
});

function command(expectedSourceChecksum: string) {
  return {
    actorUserId: "admin-1",
    approvedSourceCountLimit: 10,
    expectedSourceChecksum,
    scope,
    version: "party-v1",
  };
}

function createFixture({
  name = "Müşteri",
  periodClosed = false,
}: { name?: string; periodClosed?: boolean } = {}) {
  const store = {
    adminAccess: true,
    audits: [] as Array<Record<string, unknown>>,
    issues: [] as Array<Record<string, unknown>>,
    parties: [] as Array<Record<string, unknown>>,
    records: [{
      ...scope,
      code: "MUS-001",
      createdAt: new Date("2026-08-14T09:00:00.000Z"),
      createdBy: "admin-1",
      data: { name, status: "Aktif" },
      slug: "musteriler",
      updatedAt: new Date("2026-08-14T10:00:00.000Z"),
      updatedBy: "admin-1",
    }],
    roles: [] as Array<Record<string, unknown>>,
    runs: [] as Array<Record<string, unknown>>,
  };
  const transactionOptions: unknown[] = [];
  const transaction = {
    appUserScopeAccess: {
      findFirst: vi.fn(async () => store.adminAccess ? { id: "access-1" } : null),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.audits.push(data);
        return data;
      }),
    },
    entityRecord: {
      findMany: vi.fn(async () => store.records),
    },
    party: {
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        store.parties.push(...data);
        return { count: data.length };
      }),
    },
    partyBackfillIssue: {
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        store.issues.push(...data);
        return { count: data.length };
      }),
    },
    partyBackfillRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        store.runs.push(data);
        return data;
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        store.runs.find((run) =>
          run.tenantId === where.tenantId
          && run.companyId === where.companyId
          && run.periodId === where.periodId
          && run.version === where.version
          && run.sourceChecksum === where.sourceChecksum,
        ) ?? null),
      updateMany: vi.fn(async ({ data, where }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) => {
        const run = store.runs.find((row) => row.id === where.id && row.status === where.status);
        if (!run) return { count: 0 };
        Object.assign(run, data);
        return { count: 1 };
      }),
    },
    partyRole: {
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        store.roles.push(...data);
        return { count: data.length };
      }),
      findMany: vi.fn(async () => store.roles.map((role) => ({
        ...role,
        party: store.parties.find((party) => party.id === role.partyId),
      }))),
    },
    period: {
      findFirst: vi.fn(async () => ({ id: scope.periodId, isClosed: periodClosed })),
    },
  };
  const prisma = {
    ...transaction,
    $transaction: vi.fn(async (
      callback: (client: typeof transaction) => Promise<unknown>,
      options: unknown,
    ) => {
      transactionOptions.push(options);
      return callback(transaction);
    }),
  };
  return { prisma, store, transactionOptions };
}
