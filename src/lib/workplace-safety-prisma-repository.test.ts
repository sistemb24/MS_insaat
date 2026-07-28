import { describe, expect, it, vi } from "vitest";

import {
  createWorkplaceSafetyPrismaRepository,
  type SafetyPpeIssuanceRow,
  type WorkplaceSafetyPrismaClientLike,
} from "./workplace-safety-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-28T09:30:00.000Z";

function setup() {
  const safetyWorkAccident = delegate({
    id: "accident-1", ...scope(), projectId: "project-1", personnelId: "person-1", occurredOn: date("2026-07-27"),
    classification: "Hafif olay", summary: "Kayma riski", status: "RECORDED", recordedAt: date("2026-07-28"),
    closedAt: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: dateTime(), updatedAt: dateTime(),
  });
  const safetyTraining = delegate({
    id: "training-1", ...scope(), name: "Temel İSG", type: "Periyodik", trainerName: "Uzman", trainingOn: date("2026-07-28"),
    durationMinutes: 90, nextTrainingOn: date("2027-07-28"), status: "PLANNED", createdBy: defaultTenantScope.userId,
    updatedBy: defaultTenantScope.userId, createdAt: dateTime(), updatedAt: dateTime(),
  });
  const safetyTrainingAttendance = delegate({
    id: "attendance-1", ...scope(), trainingId: "training-1", personnelId: "person-1", status: "ATTENDED",
    createdBy: defaultTenantScope.userId, createdAt: dateTime(),
  });
  const safetyInspection = delegate({
    id: "inspection-1", ...scope(), projectId: "project-1", inspectedOn: date("2026-07-28"), inspectorName: "Kontrolör",
    summary: null, status: "COMPLETED", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId,
    createdAt: dateTime(), updatedAt: dateTime(),
  });
  const safetyFinding = delegate({
    id: "finding-1", ...scope(), inspectionId: "inspection-1", ownerPersonnelId: "person-1", category: "Yüksekte çalışma",
    riskLevel: "HIGH", summary: "Korkuluk tamamlanmalı", dueOn: date("2026-08-01"), status: "OPEN", resolvedAt: null,
    createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: dateTime(), updatedAt: dateTime(),
  });
  const safetyPpeIssuance = delegate({
    id: "ppe-1", ...scope(), personnelId: "person-1", issuanceKey: "person-1::KKB-001::2026-07-28",
    ppeCode: "KKB-001", ppeType: "Baret", quantity: 1, issuedOn: date("2026-07-28"), returnedOn: null,
    status: "ISSUED", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId,
    createdAt: dateTime(), updatedAt: dateTime(),
  });
  const prisma = {
    safetyFinding,
    safetyInspection,
    safetyPpeIssuance,
    safetyTraining,
    safetyTrainingAttendance,
    safetyWorkAccident,
  } as unknown as WorkplaceSafetyPrismaClientLike;
  return { repository: createWorkplaceSafetyPrismaRepository(prisma), safetyFinding, safetyInspection, safetyPpeIssuance, safetyTraining, safetyTrainingAttendance, safetyWorkAccident };
}

describe("workplace safety Prisma repository", () => {
  it("reads every safety surface with the active tenant, company and period scope", async () => {
    const { repository, safetyFinding, safetyTrainingAttendance, safetyWorkAccident } = setup();
    const result = await repository.listOverview({ scope: defaultTenantScope });

    expect(safetyWorkAccident.findMany).toHaveBeenCalledWith({
      where: scope(), orderBy: [{ occurredOn: "desc" }, { id: "asc" }],
    });
    expect(safetyFinding.findMany).toHaveBeenCalledWith({
      where: scope(), orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }],
    });
    expect(safetyTrainingAttendance.findMany).toHaveBeenCalledWith({
      where: scope(), orderBy: [{ createdAt: "desc" }, { personnelId: "asc" }],
    });
    expect(result).toEqual(expect.objectContaining({
      workAccidents: [expect.objectContaining({ occurredOn: "2026-07-27", status: "RECORDED" })],
      trainings: [expect.objectContaining({ trainingOn: "2026-07-28", nextTrainingOn: "2027-07-28" })],
      findings: [expect.objectContaining({ dueOn: "2026-08-01", riskLevel: "HIGH" })],
      ppeIssuances: [expect.objectContaining({ issuanceKey: "person-1::KKB-001::2026-07-28", status: "ISSUED" })],
    }));
  });

  it("preserves date-only values and maps unknown persisted statuses to safe defaults", async () => {
    const { repository, safetyWorkAccident } = setup();
    safetyWorkAccident.findMany.mockResolvedValueOnce([{
      id: "accident-stale", ...scope(), projectId: null, personnelId: null, occurredOn: date("2026-07-28"),
      classification: "Olay", summary: "Özet", status: "UNKNOWN", recordedAt: null, closedAt: null,
      createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: dateTime(), updatedAt: dateTime(),
    }]);
    const result = await repository.listOverview({ scope: defaultTenantScope });
    expect(result.workAccidents[0]).toEqual(expect.objectContaining({ occurredOn: "2026-07-28", status: "DRAFT" }));
  });

  it("creates PPE issuance with scoped idempotency key and UTC dates", async () => {
    const { repository, safetyPpeIssuance } = setup();
    const row: SafetyPpeIssuanceRow = {
      id: "ppe-1", ...scope(), personnelId: "person-1", issuanceKey: "person-1::KKB-001::2026-07-28",
      ppeCode: "KKB-001", ppeType: "Baret", quantity: 1, issuedOn: "2026-07-28", returnedOn: null,
      status: "ISSUED", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId,
      createdAt: timestamp, updatedAt: timestamp,
    };
    await expect(repository.createPpeIssuance(row)).resolves.toEqual(expect.objectContaining({ issuedOn: "2026-07-28" }));
    expect(safetyPpeIssuance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issuanceKey: row.issuanceKey,
        issuedOn: new Date("2026-07-28T00:00:00.000Z"),
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      }),
    });
  });
});

function delegate<T>(row: T) {
  return {
    create: vi.fn().mockResolvedValue(row),
    findMany: vi.fn().mockResolvedValue([row]),
    update: vi.fn().mockResolvedValue(row),
  };
}

function scope() {
  return {
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
  };
}

function date(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function dateTime() { return new Date(timestamp); }
