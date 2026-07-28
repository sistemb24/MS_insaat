import { describe, expect, it, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log";
import {
  type WorkplaceSafetyOverview,
  type WorkplaceSafetyRepository,
} from "./workplace-safety-prisma-repository";
import { createWorkplaceSafetyService } from "./workplace-safety-service";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-28T10:00:00.000Z";

function setup() {
  const store: WorkplaceSafetyOverview = {
    findings: [], inspections: [], ppeIssuances: [], trainingAttendances: [], trainings: [], workAccidents: [],
  };
  const repository: WorkplaceSafetyRepository = {
    async createFinding(row) { store.findings.push(copy(row)); return copy(row); },
    async createInspection(row) { store.inspections.push(copy(row)); return copy(row); },
    async createPpeIssuance(row) { store.ppeIssuances.push(copy(row)); return copy(row); },
    async createTraining(row) { store.trainings.push(copy(row)); return copy(row); },
    async createTrainingAttendance(row) { store.trainingAttendances.push(copy(row)); return copy(row); },
    async createWorkAccident(row) { store.workAccidents.push(copy(row)); return copy(row); },
    async listOverview({ scope }) {
      return {
        findings: store.findings.filter(inScope(scope)).map(copy),
        inspections: store.inspections.filter(inScope(scope)).map(copy),
        ppeIssuances: store.ppeIssuances.filter(inScope(scope)).map(copy),
        trainingAttendances: store.trainingAttendances.filter(inScope(scope)).map(copy),
        trainings: store.trainings.filter(inScope(scope)).map(copy),
        workAccidents: store.workAccidents.filter(inScope(scope)).map(copy),
      };
    },
    async updateFinding(row) { return replace(store.findings, row); },
    async updateInspection(row) { return replace(store.inspections, row); },
    async updatePpeIssuance(row) { return replace(store.ppeIssuances, row); },
    async updateTraining(row) { return replace(store.trainings, row); },
    async updateWorkAccident(row) { return replace(store.workAccidents, row); },
  };
  const auditRecord = vi.fn().mockResolvedValue(undefined);
  const audit: AuditLogRepository = { record: auditRecord };
  let id = 0;
  const service = createWorkplaceSafetyService({
    auditLogRepository: audit,
    createId: ({ kind, stableKey }) => `${kind}-${stableKey ?? ++id}`,
    now: () => timestamp,
    repository,
  });
  return { auditRecord, service, store };
}

describe("workplace safety service mutations", () => {
  it("creates and transitions an accident with minimal audit metadata", async () => {
    const { auditRecord, service } = setup();
    const created = await service.createWorkAccident({
      scope: defaultTenantScope,
      values: { classification: "Hafif olay", occurredOn: "2026-07-28", personnelId: "P-001", projectId: "project-1", summary: "Hassas serbest not" },
    });
    expect(created).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ status: "DRAFT" }) }));
    if (!created.ok) throw new Error("expected accident");
    const recorded = await service.recordWorkAccident({ id: created.data.id, scope: defaultTenantScope });
    expect(recorded).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ status: "RECORDED" }) }));
    const closed = await service.closeWorkAccident({ id: created.data.id, scope: defaultTenantScope });
    expect(closed).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ closedAt: "2026-07-28", status: "CLOSED" }) }));
    expect(auditRecord).toHaveBeenCalledTimes(3);
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      action: "workplace-safety.work-accident.create",
      metadata: { classification: "Hafif olay", statusTo: "DRAFT" },
    }));
    expect(JSON.stringify(auditRecord.mock.calls)).not.toContain("Hassas serbest not");
  });

  it("rejects viewer and closed-period mutations before persistence or audit", async () => {
    const { auditRecord, service, store } = setup();
    await expect(service.createTraining({
      scope: { ...defaultTenantScope, userRole: "viewer" },
      values: trainingValues(),
    })).resolves.toEqual(expect.objectContaining({ ok: false }));
    await expect(service.createTraining({
      scope: { ...defaultTenantScope, periodClosed: true },
      values: trainingValues(),
    })).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(store.trainings).toHaveLength(0);
    expect(auditRecord).not.toHaveBeenCalled();
  });

  it("preserves attendance and PPE idempotency without duplicate audit records", async () => {
    const { auditRecord, service, store } = setup();
    const training = await service.createTraining({ scope: defaultTenantScope, values: trainingValues() });
    if (!training.ok) throw new Error("expected training");
    const firstAttendance = await service.recordTrainingAttendance({
      scope: defaultTenantScope, values: { personnelId: "P-001", trainingId: training.data.id },
    });
    const secondAttendance = await service.recordTrainingAttendance({
      scope: defaultTenantScope, values: { personnelId: "P-001", trainingId: training.data.id },
    });
    expect(firstAttendance).toEqual(expect.objectContaining({ ok: true, data: { idempotent: false, row: expect.any(Object) } }));
    expect(secondAttendance).toEqual(expect.objectContaining({ ok: true, data: { idempotent: true, row: expect.any(Object) } }));
    const firstPpe = await service.createPpeIssuance({
      scope: defaultTenantScope, values: { issuedOn: "2026-07-28", personnelId: "P-001", ppeCode: "KKB-001", ppeType: "Baret", quantity: 1 },
    });
    const secondPpe = await service.createPpeIssuance({
      scope: defaultTenantScope, values: { issuedOn: "2026-07-28", personnelId: "P-001", ppeCode: "KKB-001", ppeType: "Baret", quantity: 1 },
    });
    expect(firstPpe).toEqual(expect.objectContaining({ ok: true, data: { idempotent: false, row: expect.any(Object) } }));
    expect(secondPpe).toEqual(expect.objectContaining({ ok: true, data: { idempotent: true, row: expect.any(Object) } }));
    expect(store.trainingAttendances).toHaveLength(1);
    expect(store.ppeIssuances).toHaveLength(1);
    expect(auditRecord).toHaveBeenCalledTimes(3);
  });

  it("requires a scoped inspection before creating and resolving a finding", async () => {
    const { auditRecord, service } = setup();
    await expect(service.createFinding({
      scope: defaultTenantScope,
      values: findingValues("missing-inspection"),
    })).resolves.toEqual(expect.objectContaining({ ok: false }));
    const inspection = await service.createInspection({
      scope: defaultTenantScope,
      values: { inspectedOn: "2026-07-28", inspectorName: "Kontrolör", projectId: "project-1" },
    });
    if (!inspection.ok) throw new Error("expected inspection");
    const finding = await service.createFinding({ scope: defaultTenantScope, values: findingValues(inspection.data.id) });
    if (!finding.ok) throw new Error("expected finding");
    await expect(service.resolveFinding({ id: finding.data.id, scope: { ...defaultTenantScope, tenantId: "other" } }))
      .resolves.toEqual(expect.objectContaining({ ok: false }));
    await expect(service.resolveFinding({ id: finding.data.id, scope: defaultTenantScope }))
      .resolves.toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ status: "RESOLVED" }) }));
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      action: "workplace-safety.finding.resolve",
      metadata: { riskLevel: "HIGH", statusFrom: "OPEN", statusTo: "RESOLVED" },
    }));
  });
});

function trainingValues() {
  return { durationMinutes: 90, name: "Temel İSG", trainerName: "Uzman", trainingOn: "2026-07-28", type: "Periyodik" };
}
function findingValues(inspectionId: string) {
  return { category: "Yüksekte çalışma", inspectionId, riskLevel: "HIGH" as const, summary: "Korkuluk tamamlanmalı" };
}
function inScope(scope: typeof defaultTenantScope) {
  return (row: { companyId: string; periodId: string; tenantId: string }) => row.tenantId === scope.tenantId && row.companyId === scope.companyId && row.periodId === scope.periodId;
}
function copy<T>(value: T): T { return structuredClone(value); }
function replace<T extends { id: string }>(rows: T[], row: T): T {
  const index = rows.findIndex((item) => item.id === row.id);
  rows[index] = copy(row);
  return copy(row);
}
