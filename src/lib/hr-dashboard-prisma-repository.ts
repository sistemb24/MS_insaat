import type {
  HrDashboardSources,
} from "./hr-dashboard";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type FindManyDelegate<T> = {
  findMany(input: Record<string, unknown>): Promise<T[]>;
};
type EntityRecord = {
  code: string;
  data: unknown;
};
type LeaveRecord = {
  endDate: DateLike;
  id: string;
  leaveType: string;
  personnelCode: string;
  personnelName: string;
  startDate: DateLike;
  status: string;
};
type AdvanceRecord = {
  id: string;
  personnelCode: string;
  personnelName: string;
  requestDate: DateLike;
  status: string;
};
type TransferRecord = {
  effectiveDate: DateLike;
  id: string;
  personnelCode: string;
  personnelName: string;
  status: string;
};
type TrainingRecord = {
  id: string;
  name: string;
  nextTrainingOn: DateLike | null;
  status: string;
  trainingOn: DateLike;
  type: string;
};
type TrainingAttendanceRecord = {
  trainingId: string;
};
type TimesheetRecord = {
  documentNo: string;
  id: string;
  lineCount: number;
  month: number;
  siteName: string;
  status: string;
  year: number;
};

export type HrDashboardPrismaClientLike = {
  employeeAdvanceRequest: FindManyDelegate<AdvanceRecord>;
  employeeLeaveRequest: FindManyDelegate<LeaveRecord>;
  employeeTransfer: FindManyDelegate<TransferRecord>;
  entityRecord: FindManyDelegate<EntityRecord>;
  safetyTraining: FindManyDelegate<TrainingRecord>;
  safetyTrainingAttendance: FindManyDelegate<TrainingAttendanceRecord>;
  timesheet: FindManyDelegate<TimesheetRecord>;
};

export type HrDashboardRepository = {
  loadSources(input: { scope: TenantScope }): Promise<HrDashboardSources>;
};

export function createHrDashboardPrismaRepository(
  prisma: HrDashboardPrismaClientLike,
): HrDashboardRepository {
  return {
    async loadSources({ scope }) {
      const where = scopeFields(scope);
      const [
        personnel,
        leaves,
        advances,
        transfers,
        trainings,
        trainingAttendances,
        timesheets,
      ] = await Promise.all([
        prisma.entityRecord.findMany({
          orderBy: [{ code: "asc" }],
          select: { code: true, data: true },
          where: { ...where, slug: "personel" },
        }),
        prisma.employeeLeaveRequest.findMany({
          orderBy: [{ startDate: "asc" }, { id: "asc" }],
          select: {
            endDate: true,
            id: true,
            leaveType: true,
            personnelCode: true,
            personnelName: true,
            startDate: true,
            status: true,
          },
          where,
        }),
        prisma.employeeAdvanceRequest.findMany({
          orderBy: [{ requestDate: "asc" }, { id: "asc" }],
          select: {
            id: true,
            personnelCode: true,
            personnelName: true,
            requestDate: true,
            status: true,
          },
          where,
        }),
        prisma.employeeTransfer.findMany({
          orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
          select: {
            effectiveDate: true,
            id: true,
            personnelCode: true,
            personnelName: true,
            status: true,
          },
          where,
        }),
        prisma.safetyTraining.findMany({
          orderBy: [{ trainingOn: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            nextTrainingOn: true,
            status: true,
            trainingOn: true,
            type: true,
          },
          where,
        }),
        prisma.safetyTrainingAttendance.findMany({
          orderBy: [{ trainingId: "asc" }],
          select: { trainingId: true },
          where,
        }),
        prisma.timesheet.findMany({
          orderBy: [{ year: "desc" }, { month: "desc" }, { documentNo: "asc" }],
          select: {
            documentNo: true,
            id: true,
            lineCount: true,
            month: true,
            siteName: true,
            status: true,
            year: true,
          },
          where,
        }),
      ]);

      return {
        advances: advances.map((row) => ({
          ...row,
          requestDate: day(row.requestDate),
        })),
        leaves: leaves.map((row) => ({
          ...row,
          endDate: day(row.endDate),
          startDate: day(row.startDate),
        })),
        personnel: personnel.map((row) => {
          const data = jsonObject(row.data);
          return {
            code: row.code,
            name: stringValue(data.name),
            site: stringValue(data.site),
            status: stringValue(data.status),
          };
        }),
        timesheets,
        trainingAttendances,
        trainings: trainings.map((row) => ({
          ...row,
          nextTrainingOn: row.nextTrainingOn ? day(row.nextTrainingOn) : null,
          trainingOn: day(row.trainingOn),
        })),
        transfers: transfers.map((row) => ({
          ...row,
          effectiveDate: day(row.effectiveDate),
        })),
      };
    },
  };
}

function scopeFields(scope: TenantScope) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}
function day(value: DateLike) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}
function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
function stringValue(value: unknown) {
  return String(value ?? "").trim();
}
