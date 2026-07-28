import type {
  SafetyFindingStatus,
  SafetyInspectionStatus,
  SafetyPpeIssuanceStatus,
  SafetyTrainingStatus,
  SafetyWorkAccidentStatus,
} from "./workplace-safety";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findMany(input: { orderBy: unknown; where: ScopeFields }): Promise<T[]>;
  update(input: { data: unknown; where: { id: string } }): Promise<T>;
};

export type SafetyWorkAccidentRow = ScopeFields & {
  classification: string;
  closedAt: string | null;
  createdAt: string;
  createdBy: string;
  id: string;
  occurredOn: string;
  personnelId: string | null;
  projectId: string | null;
  recordedAt: string | null;
  status: SafetyWorkAccidentStatus;
  summary: string;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyTrainingRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  durationMinutes: number;
  id: string;
  name: string;
  nextTrainingOn: string | null;
  status: SafetyTrainingStatus;
  trainerName: string;
  trainingOn: string;
  type: string;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyTrainingAttendanceRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  id: string;
  personnelId: string;
  status: "ATTENDED";
  trainingId: string;
};

export type SafetyInspectionRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  id: string;
  inspectedOn: string;
  inspectorName: string;
  projectId: string;
  status: SafetyInspectionStatus;
  summary: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyFindingRow = ScopeFields & {
  category: string;
  createdAt: string;
  createdBy: string;
  dueOn: string | null;
  id: string;
  inspectionId: string;
  ownerPersonnelId: string | null;
  resolvedAt: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: SafetyFindingStatus;
  summary: string;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyPpeIssuanceRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  id: string;
  issuanceKey: string;
  issuedOn: string;
  personnelId: string;
  ppeCode: string;
  ppeType: string;
  quantity: number;
  returnedOn: string | null;
  status: SafetyPpeIssuanceStatus;
  updatedAt: string;
  updatedBy: string;
};

type WorkAccidentRecord = Omit<SafetyWorkAccidentRow, "closedAt" | "createdAt" | "occurredOn" | "recordedAt" | "updatedAt"> & {
  closedAt: DateLike | null;
  createdAt: DateLike;
  occurredOn: DateLike;
  recordedAt: DateLike | null;
  status: string;
  updatedAt: DateLike;
};
type TrainingRecord = Omit<SafetyTrainingRow, "createdAt" | "nextTrainingOn" | "trainingOn" | "updatedAt"> & {
  createdAt: DateLike;
  nextTrainingOn: DateLike | null;
  status: string;
  trainingOn: DateLike;
  updatedAt: DateLike;
};
type AttendanceRecord = Omit<SafetyTrainingAttendanceRow, "createdAt"> & { createdAt: DateLike; status: string };
type InspectionRecord = Omit<SafetyInspectionRow, "createdAt" | "inspectedOn" | "updatedAt"> & {
  createdAt: DateLike;
  inspectedOn: DateLike;
  status: string;
  updatedAt: DateLike;
};
type FindingRecord = Omit<SafetyFindingRow, "createdAt" | "dueOn" | "resolvedAt" | "updatedAt"> & {
  createdAt: DateLike;
  dueOn: DateLike | null;
  resolvedAt: DateLike | null;
  status: string;
  updatedAt: DateLike;
};
type PpeRecord = Omit<SafetyPpeIssuanceRow, "createdAt" | "issuedOn" | "returnedOn" | "updatedAt"> & {
  createdAt: DateLike;
  issuedOn: DateLike;
  returnedOn: DateLike | null;
  status: string;
  updatedAt: DateLike;
};

export type WorkplaceSafetyPrismaClientLike = {
  safetyFinding: Delegate<FindingRecord>;
  safetyInspection: Delegate<InspectionRecord>;
  safetyPpeIssuance: Delegate<PpeRecord>;
  safetyTraining: Delegate<TrainingRecord>;
  safetyTrainingAttendance: Delegate<AttendanceRecord>;
  safetyWorkAccident: Delegate<WorkAccidentRecord>;
};

export type WorkplaceSafetyRepository = {
  createFinding(row: SafetyFindingRow): Promise<SafetyFindingRow>;
  createInspection(row: SafetyInspectionRow): Promise<SafetyInspectionRow>;
  createPpeIssuance(row: SafetyPpeIssuanceRow): Promise<SafetyPpeIssuanceRow>;
  createTraining(row: SafetyTrainingRow): Promise<SafetyTrainingRow>;
  createTrainingAttendance(row: SafetyTrainingAttendanceRow): Promise<SafetyTrainingAttendanceRow>;
  createWorkAccident(row: SafetyWorkAccidentRow): Promise<SafetyWorkAccidentRow>;
  listOverview(input: { scope: TenantScope }): Promise<WorkplaceSafetyOverview>;
  updateFinding(row: SafetyFindingRow): Promise<SafetyFindingRow>;
  updateInspection(row: SafetyInspectionRow): Promise<SafetyInspectionRow>;
  updatePpeIssuance(row: SafetyPpeIssuanceRow): Promise<SafetyPpeIssuanceRow>;
  updateTraining(row: SafetyTrainingRow): Promise<SafetyTrainingRow>;
  updateWorkAccident(row: SafetyWorkAccidentRow): Promise<SafetyWorkAccidentRow>;
};

export type WorkplaceSafetyOverview = {
  findings: SafetyFindingRow[];
  inspections: SafetyInspectionRow[];
  ppeIssuances: SafetyPpeIssuanceRow[];
  trainingAttendances: SafetyTrainingAttendanceRow[];
  trainings: SafetyTrainingRow[];
  workAccidents: SafetyWorkAccidentRow[];
};

export function createWorkplaceSafetyPrismaRepository(
  prisma: WorkplaceSafetyPrismaClientLike,
): WorkplaceSafetyRepository {
  return {
    async createFinding(row) { return findingFromRecord(await prisma.safetyFinding.create({ data: findingData(row) })); },
    async createInspection(row) { return inspectionFromRecord(await prisma.safetyInspection.create({ data: inspectionData(row) })); },
    async createPpeIssuance(row) { return ppeFromRecord(await prisma.safetyPpeIssuance.create({ data: ppeData(row) })); },
    async createTraining(row) { return trainingFromRecord(await prisma.safetyTraining.create({ data: trainingData(row) })); },
    async createTrainingAttendance(row) { return attendanceFromRecord(await prisma.safetyTrainingAttendance.create({ data: attendanceData(row) })); },
    async createWorkAccident(row) { return workAccidentFromRecord(await prisma.safetyWorkAccident.create({ data: workAccidentData(row) })); },
    async listOverview({ scope }) {
      const where = scopedWhere(scope);
      const [workAccidents, trainings, trainingAttendances, inspections, findings, ppeIssuances] = await Promise.all([
        prisma.safetyWorkAccident.findMany({ where, orderBy: [{ occurredOn: "desc" }, { id: "asc" }] }),
        prisma.safetyTraining.findMany({ where, orderBy: [{ trainingOn: "desc" }, { name: "asc" }] }),
        prisma.safetyTrainingAttendance.findMany({ where, orderBy: [{ createdAt: "desc" }, { personnelId: "asc" }] }),
        prisma.safetyInspection.findMany({ where, orderBy: [{ inspectedOn: "desc" }, { id: "asc" }] }),
        prisma.safetyFinding.findMany({ where, orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }] }),
        prisma.safetyPpeIssuance.findMany({ where, orderBy: [{ issuedOn: "desc" }, { ppeCode: "asc" }] }),
      ]);
      return {
        findings: findings.map(findingFromRecord),
        inspections: inspections.map(inspectionFromRecord),
        ppeIssuances: ppeIssuances.map(ppeFromRecord),
        trainingAttendances: trainingAttendances.map(attendanceFromRecord),
        trainings: trainings.map(trainingFromRecord),
        workAccidents: workAccidents.map(workAccidentFromRecord),
      };
    },
    async updateFinding(row) { return findingFromRecord(await prisma.safetyFinding.update({ data: findingData(row), where: { id: row.id } })); },
    async updateInspection(row) { return inspectionFromRecord(await prisma.safetyInspection.update({ data: inspectionData(row), where: { id: row.id } })); },
    async updatePpeIssuance(row) { return ppeFromRecord(await prisma.safetyPpeIssuance.update({ data: ppeData(row), where: { id: row.id } })); },
    async updateTraining(row) { return trainingFromRecord(await prisma.safetyTraining.update({ data: trainingData(row), where: { id: row.id } })); },
    async updateWorkAccident(row) { return workAccidentFromRecord(await prisma.safetyWorkAccident.update({ data: workAccidentData(row), where: { id: row.id } })); },
  };
}

function scopedWhere(scope: TenantScope): ScopeFields {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function workAccidentData(row: SafetyWorkAccidentRow) {
  return {
    ...scopedRow(row), classification: row.classification, closedAt: nullableDate(row.closedAt),
    createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id, occurredOn: date(row.occurredOn),
    personnelId: row.personnelId, projectId: row.projectId, recordedAt: nullableDate(row.recordedAt),
    status: row.status, summary: row.summary, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function trainingData(row: SafetyTrainingRow) {
  return {
    ...scopedRow(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy,
    durationMinutes: row.durationMinutes, id: row.id, name: row.name, nextTrainingOn: nullableDate(row.nextTrainingOn),
    status: row.status, trainerName: row.trainerName, trainingOn: date(row.trainingOn), type: row.type,
    updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function attendanceData(row: SafetyTrainingAttendanceRow) {
  return {
    ...scopedRow(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id,
    personnelId: row.personnelId, status: row.status, trainingId: row.trainingId,
  };
}

function inspectionData(row: SafetyInspectionRow) {
  return {
    ...scopedRow(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id,
    inspectedOn: date(row.inspectedOn), inspectorName: row.inspectorName, projectId: row.projectId,
    status: row.status, summary: row.summary, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function findingData(row: SafetyFindingRow) {
  return {
    ...scopedRow(row), category: row.category, createdAt: dateTime(row.createdAt), createdBy: row.createdBy,
    dueOn: nullableDate(row.dueOn), id: row.id, inspectionId: row.inspectionId, ownerPersonnelId: row.ownerPersonnelId,
    resolvedAt: nullableDate(row.resolvedAt), riskLevel: row.riskLevel, status: row.status, summary: row.summary,
    updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function ppeData(row: SafetyPpeIssuanceRow) {
  return {
    ...scopedRow(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy, id: row.id,
    issuanceKey: row.issuanceKey, issuedOn: date(row.issuedOn), personnelId: row.personnelId,
    ppeCode: row.ppeCode, ppeType: row.ppeType, quantity: row.quantity, returnedOn: nullableDate(row.returnedOn),
    status: row.status, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function scopedRow(row: ScopeFields) { return { companyId: row.companyId, periodId: row.periodId, tenantId: row.tenantId }; }
function date(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function dateTime(value: string) { return new Date(value); }
function nullableDate(value: string | null) { return value ? date(value) : null; }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function day(value: DateLike | null) { return value ? iso(value).slice(0, 10) : null; }

function workAccidentFromRecord(row: WorkAccidentRecord): SafetyWorkAccidentRow {
  return { ...row, closedAt: day(row.closedAt), createdAt: iso(row.createdAt), occurredOn: day(row.occurredOn)!, recordedAt: day(row.recordedAt), status: workAccidentStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function trainingFromRecord(row: TrainingRecord): SafetyTrainingRow {
  return { ...row, createdAt: iso(row.createdAt), nextTrainingOn: day(row.nextTrainingOn), status: trainingStatus(row.status), trainingOn: day(row.trainingOn)!, updatedAt: iso(row.updatedAt) };
}
function attendanceFromRecord(row: AttendanceRecord): SafetyTrainingAttendanceRow {
  return { ...row, createdAt: iso(row.createdAt), status: "ATTENDED" };
}
function inspectionFromRecord(row: InspectionRecord): SafetyInspectionRow {
  return { ...row, createdAt: iso(row.createdAt), inspectedOn: day(row.inspectedOn)!, status: inspectionStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function findingFromRecord(row: FindingRecord): SafetyFindingRow {
  return { ...row, createdAt: iso(row.createdAt), dueOn: day(row.dueOn), resolvedAt: day(row.resolvedAt), status: findingStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function ppeFromRecord(row: PpeRecord): SafetyPpeIssuanceRow {
  return { ...row, createdAt: iso(row.createdAt), issuedOn: day(row.issuedOn)!, returnedOn: day(row.returnedOn), status: ppeStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function workAccidentStatus(value: string): SafetyWorkAccidentStatus { return value === "RECORDED" || value === "CLOSED" ? value : "DRAFT"; }
function trainingStatus(value: string): SafetyTrainingStatus { return value === "PLANNED" || value === "COMPLETED" ? value : "DRAFT"; }
function inspectionStatus(value: string): SafetyInspectionStatus { return value === "COMPLETED" ? value : "DRAFT"; }
function findingStatus(value: string): SafetyFindingStatus { return value === "RESOLVED" ? value : "OPEN"; }
function ppeStatus(value: string): SafetyPpeIssuanceStatus { return value === "RETURNED" ? value : "ISSUED"; }
