import { describe, expect, it, vi } from "vitest";

import {
  PartyCutoverError,
  type PartyCutoverEvidence,
  type PartyCutoverTransitionCommand,
} from "./party-cutover";
import { createPartyCutoverPrismaRepository } from
  "./party-cutover-prisma-repository";
import { buildPartyParityReadModel } from "./party-parity-read-model";

const scope = {
  companyId: "company-1",
  periodId: "period-1",
  tenantId: "tenant-1",
};
const occurredAt = new Date("2026-08-14T13:00:00.000Z");
const emptyParity = buildPartyParityReadModel({
  scope,
  snapshot: { legacyRecords: [], parties: [], roles: [] },
});
const evidence: PartyCutoverEvidence = {
  issueChecksum: emptyParity.issueChecksum,
  legacyChecksum: emptyParity.legacyChecksum,
  legacyCount: emptyParity.legacyCount,
  matchedCount: emptyParity.matchedCount,
  parityChecksum: emptyParity.parityChecksum,
  partyChecksum: emptyParity.partyChecksum,
  partyCount: emptyParity.partyCount,
  roleCount: emptyParity.roleCount,
};

describe("Party cutover Prisma repository", () => {
  it("activates SHADOW_READ atomically after current parity verification", async () => {
    const fixture = createFixture();
    const repository = createPartyCutoverPrismaRepository(
      fixture.prisma,
      () => occurredAt,
    );

    const result = await repository.transition(activationCommand());

    expect(result).toMatchObject({
      mode: "SHADOW_READ",
      parityChecksum: evidence.parityChecksum,
      replayed: false,
      revisionNo: 1,
      status: "ACTIVATED",
    });
    expect(fixture.options).toEqual({
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(fixture.tx.partyCutoverState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ...scope,
        ...evidence,
        createdBy: "admin-1",
        lastVerifiedAt: occurredAt,
        mode: "SHADOW_READ",
        revisionNo: 1,
        updatedBy: "admin-1",
      }),
    });
    expect(fixture.tx.partyCutoverEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ACTIVATE_SHADOW",
        fromMode: "LEGACY_ONLY",
        stateRevisionNo: 1,
        toMode: "SHADOW_READ",
      }),
    });
    expect(fixture.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "party-cutover.shadow-activated",
        actorUserId: "admin-1",
        entityLabel: "Party Cutover State",
      }),
    });
  });

  it("returns an exact operation retry without writing a second event or audit", async () => {
    const fixture = createFixture();
    fixture.tx.partyCutoverState.findFirst.mockResolvedValue(stateRecord());
    fixture.tx.partyCutoverEvent.findUnique.mockResolvedValue(eventRecord());
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    const result = await repository.transition({
      ...activationCommand(),
      expectedRevisionNo: 0,
    });

    expect(result).toMatchObject({
      mode: "SHADOW_READ",
      replayed: true,
      revisionNo: 1,
      status: "UNCHANGED",
    });
    expect(fixture.tx.partyCutoverState.create).not.toHaveBeenCalled();
    expect(fixture.tx.partyCutoverState.updateMany).not.toHaveBeenCalled();
    expect(fixture.tx.partyCutoverEvent.create).not.toHaveBeenCalled();
    expect(fixture.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rolls back to LEGACY_ONLY without requiring or reading clean parity", async () => {
    const fixture = createFixture();
    fixture.tx.partyCutoverState.findFirst.mockResolvedValue(stateRecord());
    fixture.tx.entityRecord.findMany.mockRejectedValue(new Error("parity must not run"));
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    const result = await repository.transition(rollbackCommand());

    expect(result).toMatchObject({
      mode: "LEGACY_ONLY",
      replayed: false,
      revisionNo: 2,
      status: "ROLLED_BACK",
    });
    expect(fixture.tx.entityRecord.findMany).not.toHaveBeenCalled();
    expect(fixture.tx.partyCutoverState.updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mode: "LEGACY_ONLY",
        revisionNo: 2,
      }),
      where: expect.objectContaining({
        mode: "SHADOW_READ",
        revisionNo: 1,
      }),
    });
  });

  it("fails closed before writes when expected parity drifted", async () => {
    const fixture = createFixture();
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    await expect(repository.transition({
      ...activationCommand(),
      expectedParity: { ...evidence, parityChecksum: "f".repeat(64) },
    })).rejects.toMatchObject({ reasonCode: "PARITY_DRIFT" });
    expect(fixture.tx.partyCutoverState.create).not.toHaveBeenCalled();
    expect(fixture.tx.partyCutoverEvent.create).not.toHaveBeenCalled();
    expect(fixture.tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects a current parity snapshot with blockers", async () => {
    const fixture = createFixture();
    fixture.tx.entityRecord.findMany.mockResolvedValue([{
      ...scope,
      code: "MUS-0001",
      data: { name: "Müşteri", status: "Aktif" },
      slug: "musteriler",
    }]);
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    await expect(repository.transition(activationCommand()))
      .rejects.toMatchObject({ reasonCode: "PARITY_NOT_READY" });
    expect(fixture.tx.partyCutoverState.create).not.toHaveBeenCalled();
  });

  it("rejects conflicting and stale operation retries", async () => {
    const conflict = createFixture();
    conflict.tx.partyCutoverState.findFirst.mockResolvedValue(stateRecord());
    conflict.tx.partyCutoverEvent.findUnique.mockResolvedValue({
      ...eventRecord(),
      reasonCode: "DIFFERENT_REASON",
    });
    const conflictRepository = createPartyCutoverPrismaRepository(conflict.prisma);
    await expect(conflictRepository.transition(activationCommand()))
      .rejects.toMatchObject({ reasonCode: "OPERATION_CONFLICT" });

    const stale = createFixture();
    stale.tx.partyCutoverState.findFirst.mockResolvedValue({
      ...stateRecord(),
      mode: "LEGACY_ONLY",
      revisionNo: 2,
    });
    stale.tx.partyCutoverEvent.findUnique.mockResolvedValue(eventRecord());
    const staleRepository = createPartyCutoverPrismaRepository(stale.prisma);
    await expect(staleRepository.transition(activationCommand()))
      .rejects.toMatchObject({ reasonCode: "OPERATION_STALE" });
  });

  it("requires an active admin in the exact scope", async () => {
    const fixture = createFixture();
    fixture.tx.appUserScopeAccess.findFirst.mockResolvedValue(null);
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    await expect(repository.transition(activationCommand()))
      .rejects.toMatchObject({ reasonCode: "ACTIVE_ADMIN_REQUIRED" });
    expect(fixture.tx.partyCutoverState.findFirst).not.toHaveBeenCalled();
  });

  it("turns optimistic update conflicts into a fail-closed result", async () => {
    const fixture = createFixture();
    fixture.tx.partyCutoverState.findFirst.mockResolvedValue(stateRecord());
    fixture.tx.partyCutoverState.updateMany.mockResolvedValue({ count: 0 });
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    await expect(repository.transition(rollbackCommand()))
      .rejects.toMatchObject({ reasonCode: "REVISION_CONFLICT" });
    expect(fixture.tx.partyCutoverEvent.create).not.toHaveBeenCalled();
  });

  it("makes audit failure a transaction-failing domain error", async () => {
    const fixture = createFixture();
    fixture.tx.auditLog.create.mockRejectedValue(new Error("forced audit failure"));
    const repository = createPartyCutoverPrismaRepository(fixture.prisma);

    await expect(repository.transition(activationCommand()))
      .rejects.toEqual(expect.objectContaining({
        reasonCode: "AUDIT_WRITE_FAILED",
      } satisfies Partial<PartyCutoverError>));
    expect(fixture.tx.partyCutoverEvent.create).toHaveBeenCalledOnce();
  });
});

function createFixture() {
  const tx = {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce([{ read_only: "off" }])
      .mockResolvedValueOnce([{ lock_result: "" }]),
    appUserScopeAccess: { findFirst: vi.fn().mockResolvedValue({ id: "access-1" }) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
    company: { findFirst: vi.fn().mockResolvedValue({ id: scope.companyId }) },
    entityRecord: { findMany: vi.fn().mockResolvedValue([]) },
    party: { findMany: vi.fn().mockResolvedValue([]) },
    partyCutoverEvent: {
      create: vi.fn().mockResolvedValue(eventRecord()),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    partyCutoverState: {
      create: vi.fn().mockResolvedValue(stateRecord()),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    partyRole: { findMany: vi.fn().mockResolvedValue([]) },
    period: { findFirst: vi.fn().mockResolvedValue({ id: scope.periodId, isClosed: true }) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ lifecycleStatus: "ACTIVE" }) },
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
    prisma: prisma as never,
    tx,
  };
}

function activationCommand(): PartyCutoverTransitionCommand {
  return {
    actorUserId: "admin-1",
    expectedParity: evidence,
    expectedRevisionNo: 0,
    operationId: "party-cutover-operation-1",
    reasonCode: "SHADOW_VALIDATION",
    releaseId: "3c90539a7f8ce06cc4c72604782412464731deef",
    scope,
    targetMode: "SHADOW_READ",
  };
}

function rollbackCommand(): PartyCutoverTransitionCommand {
  return {
    ...activationCommand(),
    expectedParity: undefined,
    expectedRevisionNo: 1,
    operationId: "party-cutover-operation-2",
    reasonCode: "PARITY_DRIFT",
    targetMode: "LEGACY_ONLY",
  };
}

function stateRecord() {
  return {
    ...scope,
    ...evidence,
    createdBy: "admin-1",
    id: "party-cutover-state-id",
    lastVerifiedAt: occurredAt,
    mode: "SHADOW_READ",
    releaseId: activationCommand().releaseId,
    revisionNo: 1,
    updatedBy: "admin-1",
  };
}

function eventRecord() {
  return {
    ...scope,
    ...evidence,
    action: "ACTIVATE_SHADOW",
    actorUserId: "admin-1",
    fromMode: "LEGACY_ONLY",
    operationId: activationCommand().operationId,
    reasonCode: activationCommand().reasonCode,
    releaseId: activationCommand().releaseId,
    stateId: "party-cutover-state-id",
    stateRevisionNo: 1,
    toMode: "SHADOW_READ",
  };
}
