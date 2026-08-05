"use server";

import { revalidatePath } from "next/cache";

import {
  ConstructionSimulationDomainError,
  compareConstructionSimulationRevisions,
  createConstructionSimulationRevisionSnapshot,
  getConstructionSimulationPermission,
  normalizeConstructionSimulationScenarioMetadata,
  normalizeConstructionSimulationText,
  type ConstructionSimulationRevisionSnapshot,
} from "@/lib/construction-simulation-scenario";
import {
  ConstructionSimulationRepositoryError,
  createConstructionSimulationScenarioPrismaRepository,
  type ConstructionSimulationPrismaClientLike,
} from "@/lib/construction-simulation-scenario-prisma-repository";
import { prisma } from "@/lib/prisma";
import { getP0BaseCurrencyTransactionValue } from "@/lib/settings-contract";
import type { TenantScope } from "@/lib/tenant-scope";
import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const repository = createConstructionSimulationScenarioPrismaRepository(
  prisma as unknown as ConstructionSimulationPrismaClientLike,
);

export type ConstructionSimulationActionLineInput = {
  contractItemId: string;
  directQuantity?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  multiplier?: number | null;
};

export type CreateConstructionSimulationScenarioActionInput = {
  projectId: string;
  sourceProgressPaymentId: string;
  scenarioNo: string;
  name: string;
  description?: string | null;
  revisionNote?: string | null;
  lines: ConstructionSimulationActionLineInput[];
};

export async function listConstructionSimulationScenariosAction(projectId: string) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const project = await findScopedProject(context.scope, projectId);
  if (!project) return failure("İnşaat projesi aktif kapsamda bulunamadı.");

  const viewer = context.scope.userRole === "viewer";
  const rows = await repository.listProjectScenarios({
    scope: context.scope,
    projectId,
    ...(viewer ? { statuses: ["APPROVED"] } : {}),
  });
  return {
    ok: true as const,
    data: {
      rows,
      canCreate: getConstructionSimulationPermission({
        role: context.scope.userRole,
        operation: "create",
        periodClosed: context.scope.periodClosed,
      }).allowed,
      canApprove: context.scope.userRole === "admin" && !context.scope.periodClosed,
      canArchive: context.scope.userRole === "admin" && !context.scope.periodClosed,
    },
  };
}

export async function getConstructionSimulationScenarioAction(scenarioId: string) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const history = await repository.findScenarioHistory({
    scope: context.scope,
    scenarioId,
  });
  if (!history) return failure("Simülasyon senaryosu aktif kapsamda bulunamadı.");
  const permission = getConstructionSimulationPermission({
    role: context.scope.userRole,
    operation: "read",
    status: history.scenario.status,
  });
  if (!permission.allowed) return failure("Bu simülasyon senaryosunu görüntüleme yetkiniz yok.");

  return {
    ok: true as const,
    data: {
      ...history,
      sourceStale: await sourceIsStale(context.scope, history.scenario),
    },
  };
}

export async function createConstructionSimulationScenarioAction(
  input: CreateConstructionSimulationScenarioActionInput,
) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const permission = getConstructionSimulationPermission({
    role: context.scope.userRole,
    operation: "create",
    periodClosed: context.scope.periodClosed,
  });
  if (!permission.allowed) return permissionFailure(permission.reason);

  try {
    const nowIso = new Date().toISOString();
    const revision = await recalculateRevision({
      scope: context.scope,
      projectId: input.projectId,
      sourceProgressPaymentId: input.sourceProgressPaymentId,
      revisionNo: 1,
      revisionNote: input.revisionNote,
      lines: input.lines,
      nowIso,
    });
    const result = await repository.createScenario({
      scope: context.scope,
      projectId: input.projectId,
      sourceProgressPaymentId: input.sourceProgressPaymentId,
      scenarioNo: normalizeScenarioNo(input.scenarioNo),
      metadata: normalizeConstructionSimulationScenarioMetadata({
        name: input.name,
        description: input.description,
      }),
      revision,
      nowIso,
    });
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return domainFailure(error);
  }
}

export async function reviseConstructionSimulationScenarioAction(input: {
  scenarioId: string;
  expectedCurrentRevisionNo: number;
  revisionNote?: string | null;
  lines: ConstructionSimulationActionLineInput[];
}) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const scenario = await repository.findScenario({
    scope: context.scope,
    scenarioId: input.scenarioId,
  });
  if (!scenario) return failure("Simülasyon senaryosu aktif kapsamda bulunamadı.");
  const permission = getConstructionSimulationPermission({
    role: context.scope.userRole,
    operation: "revise",
    status: scenario.status,
    periodClosed: context.scope.periodClosed,
  });
  if (!permission.allowed) return permissionFailure(permission.reason);

  try {
    const nowIso = new Date().toISOString();
    const revision = await recalculateRevision({
      scope: context.scope,
      projectId: scenario.projectId,
      sourceProgressPaymentId: scenario.sourceProgressPaymentId,
      revisionNo: input.expectedCurrentRevisionNo + 1,
      revisionNote: input.revisionNote,
      lines: input.lines,
      nowIso,
    });
    const result = await repository.appendRevision({
      scope: context.scope,
      scenarioId: input.scenarioId,
      expectedCurrentRevisionNo: input.expectedCurrentRevisionNo,
      revision,
      nowIso,
    });
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return domainFailure(error);
  }
}

export async function cloneConstructionSimulationScenarioAction(input: {
  sourceScenarioId: string;
  scenarioNo: string;
  name: string;
  description?: string | null;
  revisionNote?: string | null;
}) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const source = await repository.findScenario({
    scope: context.scope,
    scenarioId: input.sourceScenarioId,
  });
  if (!source) return failure("Klonlanacak simülasyon senaryosu bulunamadı.");
  const permission = getConstructionSimulationPermission({
    role: context.scope.userRole,
    operation: "clone",
    status: source.status,
    periodClosed: context.scope.periodClosed,
  });
  if (!permission.allowed) return permissionFailure(permission.reason);

  try {
    const nowIso = new Date().toISOString();
    const revision: ConstructionSimulationRevisionSnapshot = {
      ...source.currentRevision,
      revisionNo: 1,
      revisionNote: normalizeConstructionSimulationText(
        input.revisionNote ?? "",
        500,
      ) || null,
      sourceSnapshotAt: nowIso,
    };
    const result = await repository.createScenario({
      scope: context.scope,
      projectId: source.projectId,
      sourceProgressPaymentId: source.sourceProgressPaymentId,
      scenarioNo: normalizeScenarioNo(input.scenarioNo),
      metadata: normalizeConstructionSimulationScenarioMetadata({
        name: input.name,
        description: input.description,
      }),
      revision,
      nowIso,
      auditAction: "construction-simulation.clone",
      sourceScenarioId: source.id,
    });
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return domainFailure(error);
  }
}

export async function approveConstructionSimulationScenarioAction(scenarioId: string) {
  return transitionConstructionSimulationScenario(scenarioId, "APPROVED");
}

export async function archiveConstructionSimulationScenarioAction(scenarioId: string) {
  return transitionConstructionSimulationScenario(scenarioId, "ARCHIVED");
}

export async function compareConstructionSimulationScenariosAction(input: {
  leftScenarioId: string;
  leftRevisionNo: number;
  rightScenarioId: string;
  rightRevisionNo: number;
}) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const [left, right] = await Promise.all([
    repository.findScenarioHistory({
      scope: context.scope,
      scenarioId: input.leftScenarioId,
    }),
    repository.findScenarioHistory({
      scope: context.scope,
      scenarioId: input.rightScenarioId,
    }),
  ]);
  if (!left || !right) return failure("Karşılaştırılacak simülasyon revizyonları bulunamadı.");
  if (left.scenario.projectId !== right.scenario.projectId) {
    return failure("Yalnız aynı projedeki simülasyon senaryoları karşılaştırılabilir.");
  }
  for (const history of [left, right]) {
    const permission = getConstructionSimulationPermission({
      role: context.scope.userRole,
      operation: "compare",
      status: history.scenario.status,
    });
    if (!permission.allowed) return failure("Bu simülasyonları karşılaştırma yetkiniz yok.");
  }
  const leftRevision = left.revisions.find(
    (revision) => revision.revisionNo === input.leftRevisionNo,
  );
  const rightRevision = right.revisions.find(
    (revision) => revision.revisionNo === input.rightRevisionNo,
  );
  if (!leftRevision || !rightRevision) {
    return failure("Karşılaştırılacak simülasyon revizyonları bulunamadı.");
  }

  return {
    ok: true as const,
    data: {
      leftScenario: scenarioReference(left.scenario),
      rightScenario: scenarioReference(right.scenario),
      comparison: compareConstructionSimulationRevisions(leftRevision, rightRevision),
    },
  };
}

async function transitionConstructionSimulationScenario(
  scenarioId: string,
  nextStatus: "APPROVED" | "ARCHIVED",
) {
  const context = await getSimulationContext();
  if (!context.ok) return context.result;
  const scenario = await repository.findScenario({
    scope: context.scope,
    scenarioId,
  });
  if (!scenario) return failure("Simülasyon senaryosu aktif kapsamda bulunamadı.");
  const operation = nextStatus === "APPROVED" ? "approve" : "archive";
  if (scenario.status === nextStatus) {
    if (context.scope.userRole !== "admin") {
      return failure("Bu simülasyon işlemi için yetkiniz yok.");
    }
    try {
      const result = await repository.transitionStatus({
        scope: context.scope,
        scenarioId,
        expectedStatus: scenario.status,
        nextStatus,
        nowIso: new Date().toISOString(),
      });
      return { ok: true as const, data: result };
    } catch (error) {
      return domainFailure(error);
    }
  }
  const permission = getConstructionSimulationPermission({
    role: context.scope.userRole,
    operation,
    status: scenario.status,
    periodClosed: context.scope.periodClosed,
  });
  if (!permission.allowed) return permissionFailure(permission.reason);

  try {
    const result = await repository.transitionStatus({
      scope: context.scope,
      scenarioId,
      expectedStatus: scenario.status,
      nextStatus,
      nowIso: new Date().toISOString(),
    });
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return domainFailure(error);
  }
}

async function recalculateRevision(input: {
  scope: TenantScope;
  projectId: string;
  sourceProgressPaymentId: string;
  revisionNo: number;
  revisionNote?: string | null;
  lines: ConstructionSimulationActionLineInput[];
  nowIso: string;
}) {
  const contractItemIds = [...new Set(input.lines.map((line) => line.contractItemId.trim()))];
  const payment = await prisma.constructionProgressPayment.findFirst({
    where: {
      id: input.sourceProgressPaymentId,
      projectId: input.projectId,
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
    },
    select: {
      id: true,
      projectId: true,
      currency: true,
      updatedAt: true,
      snapshots: {
        where: { contractItemId: { in: contractItemIds } },
        select: {
          contractItemId: true,
          cumulativeQuantity: true,
          contractQuantity: true,
          unitPrice: true,
          contractItem: {
            select: {
              itemCode: true,
              description: true,
              unit: true,
              revisionNo: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
  if (!payment) {
    throw new ConstructionSimulationActionError(
      "Kaynak hakediş aktif proje kapsamında bulunamadı.",
    );
  }
  if (payment.currency !== getP0BaseCurrencyTransactionValue()) {
    throw new ConstructionSimulationActionError(
      "Kaynak hakediş para birimi aktif temel para birimiyle eşleşmiyor.",
    );
  }
  const snapshotByItem = new Map(
    payment.snapshots.map((snapshot) => [snapshot.contractItemId, snapshot]),
  );
  const revisionLines = input.lines.map((line) => {
    const snapshot = snapshotByItem.get(line.contractItemId.trim());
    if (!snapshot) {
      throw new ConstructionSimulationActionError(
        "Seçilen sözleşme pozu kaynak hakediş snapshot'ında bulunamadı.",
      );
    }
    return {
      contractItemId: snapshot.contractItemId,
      itemCode: snapshot.contractItem.itemCode,
      description: snapshot.contractItem.description,
      unit: snapshot.contractItem.unit,
      contractItemRevisionNo: snapshot.contractItem.revisionNo,
      currentCumulative: Number(snapshot.cumulativeQuantity),
      contractQuantity: Number(snapshot.contractQuantity),
      unitPrice: Number(snapshot.unitPrice),
      isActive: snapshot.contractItem.isActive,
      directQuantity: line.directQuantity,
      length: line.length,
      width: line.width,
      height: line.height,
      multiplier: line.multiplier,
    };
  });

  return createConstructionSimulationRevisionSnapshot({
    revisionNo: input.revisionNo,
    revisionNote: input.revisionNote,
    sourceProgressPaymentUpdatedAt: payment.updatedAt.toISOString(),
    sourceSnapshotAt: input.nowIso,
    lines: revisionLines,
  });
}

async function sourceIsStale(
  scope: TenantScope,
  scenario: { sourceProgressPaymentId: string; currentRevision: ConstructionSimulationRevisionSnapshot },
) {
  const source = await prisma.constructionProgressPayment.findFirst({
    where: {
      id: scenario.sourceProgressPaymentId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
    },
    select: { updatedAt: true },
  });
  return !source
    || source.updatedAt.toISOString()
      !== scenario.currentRevision.sourceProgressPaymentUpdatedAt;
}

async function findScopedProject(scope: TenantScope, projectId: string) {
  return prisma.constructionProject.findFirst({
    where: {
      id: projectId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
    },
    select: { id: true },
  });
}

async function getSimulationContext() {
  return getSubscriptionFeatureActionContext("progress-payments");
}

function normalizeScenarioNo(value: string) {
  const normalized = value.normalize("NFC").trim().toUpperCase();
  if (!/^[A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9._/-]{0,39}$/.test(normalized)) {
    throw new ConstructionSimulationActionError(
      "Senaryo numarası 1-40 karakter olmalı ve yalnız harf, rakam, nokta, tire, alt çizgi veya eğik çizgi içermelidir.",
    );
  }
  return normalized;
}

function scenarioReference(scenario: {
  id: string;
  scenarioNo: string;
  name: string;
  status: string;
}) {
  return {
    id: scenario.id,
    scenarioNo: scenario.scenarioNo,
    name: scenario.name,
    status: scenario.status,
  };
}

function permissionFailure(reason: string) {
  if (reason === "PERIOD_CLOSED") {
    return failure("Kapalı mali dönemde simülasyon değiştirilemez.");
  }
  if (reason === "INVALID_STATUS") {
    return failure("Simülasyon senaryosu bu işlem için uygun durumda değil.");
  }
  return failure("Bu simülasyon işlemi için yetkiniz yok.");
}

function domainFailure(error: unknown) {
  if (
    error instanceof ConstructionSimulationDomainError
    || error instanceof ConstructionSimulationRepositoryError
    || error instanceof ConstructionSimulationActionError
  ) {
    return failure(error.message);
  }
  return failure("Simülasyon işlemi tamamlanamadı.");
}

function failure(message: string) {
  return { ok: false as const, errors: [message] };
}

class ConstructionSimulationActionError extends Error {}
