import { beforeEach, describe, expect, it, vi } from "vitest";

import { createConstructionSimulationRevisionSnapshot } from "@/lib/construction-simulation-scenario";

const mocks = vi.hoisted(() => {
  const scenarioFindFirst = vi.fn();
  const scenarioFindMany = vi.fn();
  const scenarioCreate = vi.fn();
  const scenarioUpdateMany = vi.fn();
  const revisionCreate = vi.fn();
  const projectFindFirst = vi.fn();
  const paymentFindFirst = vi.fn();
  const contractItemCount = vi.fn();
  const periodFindFirst = vi.fn();
  const auditCreate = vi.fn();
  const transaction = {
    constructionSimulationScenario: {
      findFirst: scenarioFindFirst,
      findMany: scenarioFindMany,
      create: scenarioCreate,
      updateMany: scenarioUpdateMany,
    },
    constructionSimulationRevision: { create: revisionCreate },
    constructionProject: { findFirst: projectFindFirst },
    constructionProgressPayment: { findFirst: paymentFindFirst },
    constructionContractItem: { count: contractItemCount },
    period: { findFirst: periodFindFirst },
    auditLog: { create: auditCreate },
  };
  return {
    ...transaction,
    scenarioFindFirst,
    scenarioFindMany,
    scenarioCreate,
    scenarioUpdateMany,
    revisionCreate,
    projectFindFirst,
    paymentFindFirst,
    contractItemCount,
    periodFindFirst,
    auditCreate,
    context: vi.fn(),
    revalidate: vi.fn(),
    prisma: {
      ...transaction,
      $transaction: vi.fn(async (
        callback: (client: typeof transaction) => Promise<unknown>,
      ) => callback(transaction)),
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("./subscription-feature-action-guard", () => ({
  getSubscriptionFeatureActionContext: mocks.context,
}));

import {
  approveConstructionSimulationScenarioAction,
  archiveConstructionSimulationScenarioAction,
  cloneConstructionSimulationScenarioAction,
  compareConstructionSimulationScenariosAction,
  createConstructionSimulationScenarioAction,
  getConstructionSimulationScenarioAction,
  listConstructionSimulationScenariosAction,
  reviseConstructionSimulationScenarioAction,
} from "./construction-simulation-scenario-actions";

const scope = {
  tenantId: "tenant-construction",
  tenantName: "Tenant",
  companyId: "company-construction",
  companyName: "Company",
  periodId: "period-construction",
  periodLabel: "2026",
  userId: "accounting-user",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const nowIso = "2026-07-23T17:00:00.000Z";
const paymentUpdatedAt = "2026-07-23T14:00:00.000Z";

function snapshot(revisionNo = 1, directQuantity = 2) {
  return createConstructionSimulationRevisionSnapshot({
    revisionNo,
    revisionNote: `R${revisionNo}`,
    sourceProgressPaymentUpdatedAt: paymentUpdatedAt,
    sourceSnapshotAt: revisionNo === 1 ? nowIso : "2026-07-23T18:00:00.000Z",
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

function revisionRecord(revision = snapshot()) {
  return {
    id: `revision-${revision.revisionNo}`,
    scenarioId: "scenario-1",
    revisionNo: revision.revisionNo,
    revisionNote: revision.revisionNote,
    sourceProgressPaymentUpdatedAt: new Date(revision.sourceProgressPaymentUpdatedAt),
    sourceSnapshotAt: new Date(revision.sourceSnapshotAt),
    lineCount: revision.lineCount,
    proposedQuantityTotal: decimal(revision.proposedQuantityTotal),
    projectedAmountTotal: decimal(revision.projectedAmountTotal),
    overrunLineCount: revision.overrunLineCount,
    inputHash: revision.inputHash,
    createdBy: scope.userId,
    createdAt: new Date(revision.sourceSnapshotAt),
    lines: revision.lines.map((line) => ({
      id: `line-${revision.revisionNo}-${line.lineNo}`,
      revisionId: `revision-${revision.revisionNo}`,
      ...line,
      currentCumulative: decimal(line.currentCumulative),
      contractQuantity: decimal(line.contractQuantity),
      unitPrice: decimal(line.unitPrice),
      directQuantity: nullableDecimal(line.directQuantity),
      length: nullableDecimal(line.length),
      width: nullableDecimal(line.width),
      height: nullableDecimal(line.height),
      multiplier: nullableDecimal(line.multiplier),
      proposedQuantity: decimal(line.proposedQuantity),
      projectedCumulative: decimal(line.projectedCumulative),
      projectedRemaining: decimal(line.projectedRemaining),
      projectedAmount: decimal(line.projectedAmount),
    })),
  };
}

function scenarioRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "scenario-1",
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    scenarioNo: "SIM-0001",
    name: "A Blok Alternatifi",
    description: "İlk çalışma",
    status: "DRAFT",
    currentRevisionNo: 1,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: new Date(nowIso),
    updatedAt: new Date(nowIso),
    approvedBy: null,
    approvedAt: null,
    archivedBy: null,
    archivedAt: null,
    revisions: [revisionRecord()],
    ...overrides,
  };
}

function sourcePayment() {
  return {
    id: "payment-1",
    projectId: "project-1",
    currency: "TL",
    updatedAt: new Date(paymentUpdatedAt),
    snapshots: [{
      contractItemId: "item-1",
      cumulativeQuantity: decimal(10),
      contractQuantity: decimal(100),
      unitPrice: decimal(750.125),
      contractItem: {
        itemCode: "15.150.1001",
        description: "Betonarme betonu",
        unit: "m³",
        revisionNo: 2,
        isActive: true,
      },
    }],
  };
}

function createInput() {
  return {
    projectId: "project-1",
    sourceProgressPaymentId: "payment-1",
    scenarioNo: "sim-0001",
    name: "A Blok Alternatifi",
    description: "İlk çalışma",
    revisionNote: "R1",
    lines: [{ contractItemId: "item-1", directQuantity: 2 }],
  };
}

describe("construction simulation scenario actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowIso));
    mocks.context.mockResolvedValue({ ok: true, scope });
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1" });
    mocks.periodFindFirst.mockResolvedValue({ isClosed: false });
    mocks.contractItemCount.mockResolvedValue(1);
    mocks.scenarioUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({});
    mocks.paymentFindFirst.mockImplementation(async (input: {
      select?: { snapshots?: unknown; updatedAt?: boolean };
    }) => input.select?.snapshots ? sourcePayment() : {
      id: "payment-1",
      projectId: "project-1",
      updatedAt: new Date(paymentUpdatedAt),
    });
    mocks.scenarioCreate.mockResolvedValue(scenarioRecord());
    mocks.revisionCreate.mockResolvedValue(revisionRecord(snapshot(2, 3)));
  });

  it("fails subscription closed before any repository read", async () => {
    const denied = { ok: false as const, errors: ["Paket kapalı."] };
    mocks.context.mockResolvedValue({ ok: false, result: denied });

    await expect(listConstructionSimulationScenariosAction("project-1")).resolves.toBe(denied);
    expect(mocks.projectFindFirst).not.toHaveBeenCalled();
    expect(mocks.scenarioFindMany).not.toHaveBeenCalled();
  });

  it("lists only approved scenarios for viewers after a scoped project check", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });
    mocks.scenarioFindMany.mockResolvedValue([
      scenarioRecord({ status: "APPROVED" }),
    ]);

    const result = await listConstructionSimulationScenariosAction("project-1");

    expect(result).toMatchObject({
      ok: true,
      data: { canCreate: false, canApprove: false },
    });
    expect(mocks.projectFindFirst).toHaveBeenCalledWith({
      where: {
        id: "project-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
      },
      select: { id: true },
    });
    expect(mocks.scenarioFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ["APPROVED"] } }),
    }));
  });

  it("recalculates create inputs from the scoped payment snapshot and records audit", async () => {
    mocks.scenarioFindFirst.mockResolvedValue(null);

    const result = await createConstructionSimulationScenarioAction(createInput());

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result).toMatchObject({ data: { kind: "created" } });
    expect(mocks.scenarioCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        scenarioNo: "SIM-0001",
        tenantId: scope.tenantId,
        revisions: {
          create: expect.objectContaining({
            proposedQuantityTotal: 2,
            projectedAmountTotal: 1500.26,
            lineCount: 1,
          }),
        },
      }),
      include: expect.any(Object),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.create",
        metadata: expect.objectContaining({ lineCount: 1 }),
      }),
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/hakedis");
  });

  it("denies viewer create and closed-period mutations before recalculation", async () => {
    for (const deniedScope of [
      { ...scope, userRole: "viewer" as const },
      { ...scope, periodClosed: true },
    ]) {
      vi.clearAllMocks();
      mocks.context.mockResolvedValue({ ok: true, scope: deniedScope });
      const result = await createConstructionSimulationScenarioAction(createInput());
      expect(result.ok).toBe(false);
      expect(mocks.paymentFindFirst).not.toHaveBeenCalled();
      expect(mocks.scenarioCreate).not.toHaveBeenCalled();
    }
  });

  it("rejects currency mismatch and missing source item snapshots", async () => {
    mocks.paymentFindFirst.mockResolvedValueOnce({
      ...sourcePayment(),
      currency: "EUR",
    });
    await expect(createConstructionSimulationScenarioAction(createInput())).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );

    mocks.paymentFindFirst.mockResolvedValueOnce({
      ...sourcePayment(),
      snapshots: [],
    });
    await expect(createConstructionSimulationScenarioAction(createInput())).resolves.toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(mocks.scenarioCreate).not.toHaveBeenCalled();
  });

  it("revises drafts with server totals and append-only audit", async () => {
    mocks.scenarioFindFirst.mockResolvedValue(scenarioRecord());

    const result = await reviseConstructionSimulationScenarioAction({
      scenarioId: "scenario-1",
      expectedCurrentRevisionNo: 1,
      revisionNote: "R2",
      lines: [{ contractItemId: "item-1", directQuantity: 3 }],
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result).toMatchObject({
      data: { scenario: { currentRevisionNo: 2 } },
    });
    expect(mocks.revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        revisionNo: 2,
        proposedQuantityTotal: 3,
        projectedAmountTotal: 2250.39,
      }),
      include: expect.any(Object),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "construction-simulation.revise" }),
    });
  });

  it("allows only admin approval and writes one central audit in the transaction", async () => {
    mocks.scenarioFindFirst.mockResolvedValue(scenarioRecord());
    const denied = await approveConstructionSimulationScenarioAction("scenario-1");
    expect(denied.ok).toBe(false);
    expect(mocks.scenarioUpdateMany).not.toHaveBeenCalled();

    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "admin" },
    });
    const approved = await approveConstructionSimulationScenarioAction("scenario-1");

    expect(approved).toMatchObject({
      ok: true,
      data: { scenario: { status: "APPROVED" } },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.approve",
        metadata: { scenarioNo: "SIM-0001", revisionNo: 1 },
      }),
    });
  });

  it("archives draft or approved scenarios only for admin", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "admin" },
    });
    mocks.scenarioFindFirst.mockResolvedValue(scenarioRecord({ status: "APPROVED" }));

    const result = await archiveConstructionSimulationScenarioAction("scenario-1");

    expect(result).toMatchObject({
      ok: true,
      data: { scenario: { status: "ARCHIVED" } },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.archive",
        metadata: expect.objectContaining({ previousStatus: "APPROVED" }),
      }),
    });
  });

  it("returns repeated admin approval idempotently without audit or revalidation", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "admin" },
    });
    mocks.scenarioFindFirst.mockResolvedValue(scenarioRecord({
      status: "APPROVED",
      approvedBy: "admin-user",
      approvedAt: new Date(nowIso),
    }));

    const result = await approveConstructionSimulationScenarioAction("scenario-1");

    expect(result).toMatchObject({ ok: true, data: { kind: "idempotent" } });
    expect(mocks.scenarioUpdateMany).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("clones stored snapshots without trusting new client calculation totals", async () => {
    mocks.scenarioFindFirst
      .mockResolvedValueOnce(scenarioRecord({ status: "APPROVED" }))
      .mockResolvedValueOnce(null);

    const result = await cloneConstructionSimulationScenarioAction({
      sourceScenarioId: "scenario-1",
      scenarioNo: "SIM-0002",
      name: "A Blok Kopyası",
      revisionNote: "Klon",
    });

    expect(result.ok).toBe(true);
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "construction-simulation.clone",
        metadata: expect.objectContaining({ sourceScenarioId: "scenario-1" }),
      }),
    });
  });

  it("hides draft detail from viewers", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });
    mocks.scenarioFindFirst.mockResolvedValue(scenarioRecord());

    const result = await getConstructionSimulationScenarioAction("scenario-1");

    expect(result.ok).toBe(false);
    expect(mocks.paymentFindFirst).not.toHaveBeenCalled();
  });

  it("compares approved revisions read-only without producing audit", async () => {
    mocks.context.mockResolvedValue({
      ok: true,
      scope: { ...scope, userRole: "viewer" },
    });
    const left = scenarioRecord({
      id: "scenario-left",
      status: "APPROVED",
      revisions: [revisionRecord(snapshot(1, 2))],
    });
    const right = scenarioRecord({
      id: "scenario-right",
      status: "APPROVED",
      revisions: [revisionRecord(snapshot(1, 3))],
    });
    mocks.scenarioFindFirst
      .mockResolvedValueOnce(left)
      .mockResolvedValueOnce(right);

    const result = await compareConstructionSimulationScenariosAction({
      leftScenarioId: "scenario-left",
      leftRevisionNo: 1,
      rightScenarioId: "scenario-right",
      rightRevisionNo: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        comparison: {
          proposedQuantityTotalDelta: 1,
          projectedAmountTotalDelta: 750.13,
        },
      },
    });
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects comparisons across projects", async () => {
    mocks.scenarioFindFirst
      .mockResolvedValueOnce(scenarioRecord())
      .mockResolvedValueOnce(scenarioRecord({ projectId: "project-2" }));

    const result = await compareConstructionSimulationScenariosAction({
      leftScenarioId: "scenario-1",
      leftRevisionNo: 1,
      rightScenarioId: "scenario-2",
      rightRevisionNo: 1,
    });

    expect(result.ok).toBe(false);
  });
});

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value };
}

function nullableDecimal(value: number | null) {
  return value === null ? null : decimal(value);
}
