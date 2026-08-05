import { describe, expect, it, vi } from "vitest";

import {
  createConstructionSimulationRevisionSnapshot,
  normalizeConstructionSimulationScenarioMetadata,
} from "./construction-simulation-scenario";
import {
  ConstructionSimulationRepositoryError,
  createConstructionSimulationScenarioPrismaRepository,
  type ConstructionSimulationPrismaClientLike,
} from "./construction-simulation-scenario-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const firstTimestamp = "2026-07-23T15:00:00.000Z";
const secondTimestamp = "2026-07-23T16:00:00.000Z";

function revisionSnapshot(revisionNo = 1, directQuantity = 2) {
  return createConstructionSimulationRevisionSnapshot({
    revisionNo,
    revisionNote: revisionNo === 1 ? "İlk alternatif" : "İkinci alternatif",
    sourceProgressPaymentUpdatedAt: "2026-07-23T14:00:00.000Z",
    sourceSnapshotAt: revisionNo === 1 ? firstTimestamp : secondTimestamp,
    lines: [{
      contractItemId: "item-1",
      itemCode: "15.150.1001",
      description: "Betonarme betonu",
      unit: "m³",
      contractItemRevisionNo: 2,
      currentCumulative: 10,
      contractQuantity: 100,
      unitPrice: 750.125,
      isActive: true,
      directQuantity,
    }],
  });
}

function lineRecord(snapshot = revisionSnapshot().lines[0]) {
  return {
    id: `line-${snapshot.lineNo}`,
    revisionId: "revision-1",
    ...snapshot,
    currentCumulative: decimal(snapshot.currentCumulative),
    contractQuantity: decimal(snapshot.contractQuantity),
    unitPrice: decimal(snapshot.unitPrice),
    directQuantity: nullableDecimal(snapshot.directQuantity),
    length: nullableDecimal(snapshot.length),
    width: nullableDecimal(snapshot.width),
    height: nullableDecimal(snapshot.height),
    multiplier: nullableDecimal(snapshot.multiplier),
    proposedQuantity: decimal(snapshot.proposedQuantity),
    projectedCumulative: decimal(snapshot.projectedCumulative),
    projectedRemaining: decimal(snapshot.projectedRemaining),
    projectedAmount: decimal(snapshot.projectedAmount),
  };
}

function revisionRecord(snapshot = revisionSnapshot(), overrides: Record<string, unknown> = {}) {
  return {
    id: `revision-${snapshot.revisionNo}`,
    scenarioId: "scenario-1",
    revisionNo: snapshot.revisionNo,
    revisionNote: snapshot.revisionNote,
    sourceProgressPaymentUpdatedAt: new Date(snapshot.sourceProgressPaymentUpdatedAt),
    sourceSnapshotAt: new Date(snapshot.sourceSnapshotAt),
    lineCount: snapshot.lineCount,
    proposedQuantityTotal: decimal(snapshot.proposedQuantityTotal),
    projectedAmountTotal: decimal(snapshot.projectedAmountTotal),
    overrunLineCount: snapshot.overrunLineCount,
    inputHash: snapshot.inputHash,
    createdBy: defaultTenantScope.userId,
    createdAt: new Date(snapshot.sourceSnapshotAt),
    lines: snapshot.lines.map((line) => lineRecord(line)),
    ...overrides,
  };
}

function scenarioRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "scenario-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    scenarioNo: "SIM-0001",
    name: "A Blok Alternatifi",
    description: "İlk çalışma",
    status: "DRAFT",
    currentRevisionNo: 1,
    createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId,
    createdAt: new Date(firstTimestamp),
    updatedAt: new Date(firstTimestamp),
    approvedBy: null,
    approvedAt: null,
    archivedBy: null,
    archivedAt: null,
    revisions: [revisionRecord()],
    ...overrides,
  };
}

function setup(input: {
  existing?: ReturnType<typeof scenarioRecord> | null;
  project?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  contractItemCount?: number;
  updateCount?: number;
  period?: { isClosed: boolean } | null;
} = {}) {
  const constructionSimulationScenario = {
    findFirst: vi.fn().mockResolvedValue(input.existing ?? null),
    findMany: vi.fn().mockResolvedValue([scenarioRecord()]),
    create: vi.fn().mockResolvedValue(scenarioRecord()),
    updateMany: vi.fn().mockResolvedValue({ count: input.updateCount ?? 1 }),
  };
  const constructionSimulationRevision = {
    create: vi.fn().mockResolvedValue(revisionRecord(revisionSnapshot(2, 3))),
  };
  const constructionProject = {
    findFirst: vi.fn().mockResolvedValue(
      input.project === undefined ? { id: "project-1" } : input.project,
    ),
  };
  const constructionProgressPayment = {
    findFirst: vi.fn().mockResolvedValue(
      input.payment === undefined
        ? { id: "payment-1", projectId: "project-1", updatedAt: new Date(firstTimestamp) }
        : input.payment,
    ),
  };
  const constructionContractItem = {
    count: vi.fn().mockResolvedValue(input.contractItemCount ?? 1),
  };
  const auditLog = {
    create: vi.fn().mockResolvedValue({}),
  };
  const period = {
    findFirst: vi.fn().mockResolvedValue(
      input.period === undefined ? { isClosed: false } : input.period,
    ),
  };
  const transaction = {
    constructionSimulationScenario,
    constructionSimulationRevision,
    constructionProject,
    constructionProgressPayment,
    constructionContractItem,
    period,
    auditLog,
  };
  const $transaction = vi.fn(async (
    callback: (client: typeof transaction) => Promise<unknown>,
  ) => callback(transaction));
  const prisma = {
    ...transaction,
    $transaction,
  } as unknown as ConstructionSimulationPrismaClientLike;
  let idSequence = 0;
  const repository = createConstructionSimulationScenarioPrismaRepository(prisma, {
    createId: () => `generated-${++idSequence}`,
  });

  return {
    repository,
    $transaction,
    constructionSimulationScenario,
    constructionSimulationRevision,
    constructionProject,
    constructionProgressPayment,
    constructionContractItem,
    period,
    auditLog,
  };
}

function createInput() {
  return {
    scope: defaultTenantScope,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    scenarioNo: "SIM-0001",
    metadata: normalizeConstructionSimulationScenarioMetadata({
      name: "A Blok Alternatifi",
      description: "İlk çalışma",
    }),
    revision: revisionSnapshot(),
    nowIso: firstTimestamp,
  };
}

describe("construction simulation Prisma repository reads", () => {
  it("lists only project scenarios inside tenant, company and period scope", async () => {
    const { repository, constructionSimulationScenario } = setup();
    const rows = await repository.listProjectScenarios({
      scope: defaultTenantScope,
      projectId: "project-1",
      statuses: ["DRAFT", "APPROVED"],
    });

    expect(constructionSimulationScenario.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "project-1",
        status: { in: ["DRAFT", "APPROVED"] },
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      orderBy: [{ updatedAt: "desc" }, { scenarioNo: "asc" }],
      include: {
        revisions: {
          orderBy: { revisionNo: "desc" },
          take: 1,
        },
      },
    });
    expect(rows[0].currentRevision).not.toHaveProperty("lines");
    expect(rows[0]).toEqual(expect.objectContaining({
      id: "scenario-1",
      currentRevision: expect.objectContaining({ projectedAmountTotal: 1500.26 }),
    }));
  });

  it("finds and hydrates a scenario only through the active scope", async () => {
    const { repository, constructionSimulationScenario } = setup({
      existing: scenarioRecord(),
    });
    const row = await repository.findScenario({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
    });

    expect(constructionSimulationScenario.findFirst).toHaveBeenCalledWith({
      where: {
        id: "scenario-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      include: {
        revisions: {
          orderBy: { revisionNo: "desc" },
          include: { lines: { orderBy: { lineNo: "asc" } } },
        },
      },
    });
    expect(row?.currentRevision.lines[0]).toEqual(expect.objectContaining({
      contractItemId: "item-1",
      directQuantity: 2,
      unitPrice: 750.13,
    }));
  });

  it("returns null instead of leaking a scenario outside the active scope", async () => {
    const { repository } = setup({ existing: null });
    await expect(repository.findScenario({
      scope: { ...defaultTenantScope, tenantId: "other-tenant" },
      scenarioId: "scenario-1",
    })).resolves.toBeNull();
  });
});

describe("construction simulation Prisma repository create", () => {
  it("creates scenario, R1 and normalized lines in one transaction", async () => {
    const {
      repository,
      $transaction,
      constructionSimulationScenario,
      constructionProject,
      constructionProgressPayment,
      constructionContractItem,
      auditLog,
    } = setup();

    await expect(repository.createScenario(createInput())).resolves.toEqual(
      expect.objectContaining({ kind: "created" }),
    );

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(constructionProject.findFirst).toHaveBeenCalledWith({
      where: {
        id: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      select: { id: true },
    });
    expect(constructionProgressPayment.findFirst).toHaveBeenCalledWith({
      where: {
        id: "payment-1",
        projectId: "project-1",
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      select: { id: true, projectId: true, updatedAt: true },
    });
    expect(constructionContractItem.count).toHaveBeenCalledWith({
      where: {
        id: { in: ["item-1"] },
        projectId: "project-1",
        isActive: true,
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
    });
    expect(constructionSimulationScenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "generated-1",
        scenarioNo: "SIM-0001",
        status: "DRAFT",
        currentRevisionNo: 1,
        revisions: {
          create: expect.objectContaining({
            id: "generated-2",
            revisionNo: 1,
            inputHash: revisionSnapshot().inputHash,
            lines: {
              createMany: {
                data: [expect.objectContaining({
                  id: "generated-3",
                  contractItemId: "item-1",
                  proposedQuantity: 2,
                })],
              },
            },
          }),
        },
      }),
      include: expect.any(Object),
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.create",
        entityType: "construction-simulation",
        entityId: "scenario-1",
        metadata: {
          scenarioNo: "SIM-0001",
          projectId: "project-1",
          revisionNo: 1,
          lineCount: 1,
        },
      }),
    });
  });

  it("returns an idempotent result for the same scenario number and input hash", async () => {
    const { repository, constructionSimulationScenario, constructionProject } = setup({
      existing: scenarioRecord(),
    });

    await expect(repository.createScenario(createInput())).resolves.toEqual(
      expect.objectContaining({ kind: "idempotent" }),
    );
    expect(constructionSimulationScenario.create).not.toHaveBeenCalled();
    expect(constructionProject.findFirst).not.toHaveBeenCalled();
  });

  it("rejects reuse of the same scenario number with different input", async () => {
    const { repository } = setup({ existing: scenarioRecord() });
    const input = createInput();
    input.revision = revisionSnapshot(1, 4);

    await expect(repository.createScenario(input)).rejects.toEqual(
      expect.objectContaining({ code: "REVISION_CONFLICT" }),
    );
  });

  it("fails closed when project, payment or active items do not match scope", async () => {
    for (const setupInput of [
      { project: null },
      { payment: null },
      { contractItemCount: 0 },
    ]) {
      const { repository, constructionSimulationScenario } = setup(setupInput);
      await expect(repository.createScenario(createInput())).rejects.toEqual(
        expect.objectContaining({ code: "SCOPE_MISMATCH" }),
      );
      expect(constructionSimulationScenario.create).not.toHaveBeenCalled();
    }
  });

  it("fails closed inside the transaction when the scoped period is closed", async () => {
    const { repository, constructionSimulationScenario, auditLog } = setup({
      period: { isClosed: true },
    });

    await expect(repository.createScenario(createInput())).rejects.toEqual(
      expect.objectContaining({ code: "SCOPE_MISMATCH" }),
    );
    expect(constructionSimulationScenario.create).not.toHaveBeenCalled();
    expect(auditLog.create).not.toHaveBeenCalled();
  });
});

describe("construction simulation Prisma repository append-only revisions", () => {
  it("returns the current snapshot without writing when input hash already exists", async () => {
    const { repository, constructionSimulationScenario, constructionSimulationRevision } = setup({
      existing: scenarioRecord(),
    });

    await expect(repository.appendRevision({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedCurrentRevisionNo: 1,
      revision: revisionSnapshot(),
      nowIso: secondTimestamp,
    })).resolves.toEqual(expect.objectContaining({ kind: "idempotent" }));
    expect(constructionSimulationScenario.updateMany).not.toHaveBeenCalled();
    expect(constructionSimulationRevision.create).not.toHaveBeenCalled();
  });

  it("rejects revisions for approved or archived scenarios", async () => {
    for (const status of ["APPROVED", "ARCHIVED"]) {
      const { repository } = setup({ existing: scenarioRecord({ status }) });
      await expect(repository.appendRevision({
        scope: defaultTenantScope,
        scenarioId: "scenario-1",
        expectedCurrentRevisionNo: 1,
        revision: revisionSnapshot(2, 3),
        nowIso: secondTimestamp,
      })).rejects.toEqual(expect.objectContaining({ code: "INVALID_STATUS" }));
    }
  });

  it("rejects stale expected or non-sequential revision numbers", async () => {
    const { repository } = setup({ existing: scenarioRecord() });
    await expect(repository.appendRevision({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedCurrentRevisionNo: 0,
      revision: revisionSnapshot(2, 3),
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "REVISION_CONFLICT" }));
  });

  it("advances currentRevisionNo with a fully scoped optimistic update before append", async () => {
    const {
      repository,
      constructionSimulationScenario,
      constructionSimulationRevision,
      auditLog,
    } = setup({ existing: scenarioRecord() });

    const result = await repository.appendRevision({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedCurrentRevisionNo: 1,
      revision: revisionSnapshot(2, 3),
      nowIso: secondTimestamp,
    });

    expect(constructionSimulationScenario.updateMany).toHaveBeenCalledWith({
      where: {
        id: "scenario-1",
        projectId: "project-1",
        status: "DRAFT",
        currentRevisionNo: 1,
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      data: {
        currentRevisionNo: 2,
        updatedBy: defaultTenantScope.userId,
        updatedAt: new Date(secondTimestamp),
      },
    });
    expect(constructionSimulationRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scenarioId: "scenario-1",
        revisionNo: 2,
        createdBy: defaultTenantScope.userId,
      }),
      include: { lines: { orderBy: { lineNo: "asc" } } },
    });
    expect(result).toEqual(expect.objectContaining({
      kind: "created",
      scenario: expect.objectContaining({ currentRevisionNo: 2 }),
    }));
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.revise",
        entityId: "scenario-1",
        metadata: expect.objectContaining({
          fromRevisionNo: 1,
          toRevisionNo: 2,
          inputHash: revisionSnapshot(2, 3).inputHash,
        }),
      }),
    });
  });

  it("aborts before revision insert when the optimistic update loses the race", async () => {
    const { repository, constructionSimulationRevision } = setup({
      existing: scenarioRecord(),
      updateCount: 0,
    });

    await expect(repository.appendRevision({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedCurrentRevisionNo: 1,
      revision: revisionSnapshot(2, 3),
      nowIso: secondTimestamp,
    })).rejects.toEqual(expect.objectContaining({ code: "REVISION_CONFLICT" }));
    expect(constructionSimulationRevision.create).not.toHaveBeenCalled();
  });

  it("rejects a broken current-revision persistence invariant", async () => {
    const { repository } = setup({
      existing: scenarioRecord({ currentRevisionNo: 2, revisions: [revisionRecord()] }),
    });
    await expect(repository.findScenario({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
    })).rejects.toBeInstanceOf(ConstructionSimulationRepositoryError);
  });
});

describe("construction simulation Prisma repository lifecycle audit", () => {
  it("approves the current draft with a scoped optimistic update and one audit", async () => {
    const { repository, constructionSimulationScenario, auditLog } = setup({
      existing: scenarioRecord(),
    });

    const result = await repository.transitionStatus({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedStatus: "DRAFT",
      nextStatus: "APPROVED",
      nowIso: secondTimestamp,
    });

    expect(result.kind).toBe("updated");
    expect(result.scenario).toEqual(expect.objectContaining({
      status: "APPROVED",
      approvedBy: defaultTenantScope.userId,
      approvedAt: secondTimestamp,
    }));
    expect(constructionSimulationScenario.updateMany).toHaveBeenCalledWith({
      where: {
        id: "scenario-1",
        projectId: "project-1",
        status: "DRAFT",
        currentRevisionNo: 1,
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      },
      data: {
        status: "APPROVED",
        updatedBy: defaultTenantScope.userId,
        updatedAt: new Date(secondTimestamp),
        approvedBy: defaultTenantScope.userId,
        approvedAt: new Date(secondTimestamp),
      },
    });
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.approve",
        metadata: { scenarioNo: "SIM-0001", revisionNo: 1 },
      }),
    });
  });

  it("archives approved scenarios and records the previous status", async () => {
    const { repository, auditLog } = setup({
      existing: scenarioRecord({ status: "APPROVED" }),
    });
    const result = await repository.transitionStatus({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedStatus: "APPROVED",
      nextStatus: "ARCHIVED",
      nowIso: secondTimestamp,
    });

    expect(result.scenario.status).toBe("ARCHIVED");
    expect(auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.archive",
        metadata: { scenarioNo: "SIM-0001", previousStatus: "APPROVED" },
      }),
    });
  });

  it("makes repeated transitions idempotent without duplicate audit", async () => {
    const { repository, constructionSimulationScenario, auditLog } = setup({
      existing: scenarioRecord({
        status: "APPROVED",
        approvedBy: defaultTenantScope.userId,
        approvedAt: new Date(secondTimestamp),
      }),
    });
    const result = await repository.transitionStatus({
      scope: defaultTenantScope,
      scenarioId: "scenario-1",
      expectedStatus: "DRAFT",
      nextStatus: "APPROVED",
      nowIso: secondTimestamp,
    });

    expect(result.kind).toBe("idempotent");
    expect(constructionSimulationScenario.updateMany).not.toHaveBeenCalled();
    expect(auditLog.create).not.toHaveBeenCalled();
  });
});

function decimal(value: number) {
  return { toNumber: () => value };
}

function nullableDecimal(value: number | null) {
  return value === null ? null : decimal(value);
}
