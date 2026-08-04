import {
  normalizeEmployeeLeaveStatus,
  normalizeEmployeeLeaveType,
  type EmployeeLeaveStatus,
  type EmployeeLeaveType,
} from "./employee-leave";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type DecimalLike = { toNumber(): number } | number | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findFirst(input: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(input: { orderBy?: unknown; where: Record<string, unknown> }): Promise<T[]>;
  updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type EmployeeLeaveRow = ScopeFields & {
  approveRequestKey: string | null;
  approvedAt: string | null;
  cancelRequestKey: string | null;
  cancelledAt: string | null;
  chargeableDays: number;
  createRequestKey: string;
  createdAt: string;
  createdBy: string;
  documentFileId: string | null;
  endDate: string;
  id: string;
  lastUpdateKey: string | null;
  leaveType: EmployeeLeaveType;
  note: string;
  personnelCode: string;
  personnelName: string;
  rejectRequestKey: string | null;
  rejectedAt: string | null;
  revisionNo: number;
  startDate: string;
  status: EmployeeLeaveStatus;
  submitRequestKey: string | null;
  submittedAt: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type EmployeeLeaveBalanceRow = ScopeFields & {
  adjustmentDays: number;
  createdAt: string;
  createdBy: string;
  id: string;
  lastMutationKey: string | null;
  openingDays: number;
  personnelCode: string;
  personnelName: string;
  revisionNo: number;
  updatedAt: string;
  updatedBy: string;
  usedDays: number;
  year: number;
};

type LeaveRecord = Omit<
  EmployeeLeaveRow,
  | "approvedAt"
  | "cancelledAt"
  | "chargeableDays"
  | "createdAt"
  | "endDate"
  | "leaveType"
  | "rejectedAt"
  | "startDate"
  | "status"
  | "submittedAt"
  | "updatedAt"
> & {
  approvedAt: DateLike | null;
  cancelledAt: DateLike | null;
  chargeableDays: DecimalLike;
  createdAt: DateLike;
  endDate: DateLike;
  leaveType: string;
  rejectedAt: DateLike | null;
  startDate: DateLike;
  status: string;
  submittedAt: DateLike | null;
  updatedAt: DateLike;
};
type BalanceRecord = Omit<
  EmployeeLeaveBalanceRow,
  "adjustmentDays" | "createdAt" | "openingDays" | "updatedAt" | "usedDays"
> & {
  adjustmentDays: DecimalLike;
  createdAt: DateLike;
  openingDays: DecimalLike;
  updatedAt: DateLike;
  usedDays: DecimalLike;
};

type TransactionClient = {
  employeeLeaveBalance: Delegate<BalanceRecord>;
  employeeLeaveRequest: Delegate<LeaveRecord>;
};

export type EmployeeLeavePrismaClientLike = TransactionClient & {
  $transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T>;
};

export type EmployeeLeaveRepository = {
  createLeave(row: EmployeeLeaveRow): Promise<EmployeeLeaveRow>;
  findLeaveByCreateKey(input: {
    createRequestKey: string;
    scope: TenantScope;
  }): Promise<EmployeeLeaveRow | null>;
  findLeaveById(input: {
    id: string;
    scope: TenantScope;
  }): Promise<EmployeeLeaveRow | null>;
  findBalance(input: {
    personnelCode: string;
    scope: TenantScope;
    year: number;
  }): Promise<EmployeeLeaveBalanceRow | null>;
  listBalances(input: { scope: TenantScope }): Promise<EmployeeLeaveBalanceRow[]>;
  listLeaves(input: { scope: TenantScope }): Promise<EmployeeLeaveRow[]>;
  listPersonnelLeaves(input: {
    personnelCode: string;
    scope: TenantScope;
  }): Promise<EmployeeLeaveRow[]>;
  saveBalance(input: {
    expectedRevisionNo?: number;
    row: EmployeeLeaveBalanceRow;
  }): Promise<EmployeeLeaveBalanceRow>;
  transition(input: {
    balance?: {
      expectedRevisionNo: number;
      row: EmployeeLeaveBalanceRow;
    };
    expectedRevisionNo: number;
    fromStatus: EmployeeLeaveStatus;
    row: EmployeeLeaveRow;
  }): Promise<{
    balance?: EmployeeLeaveBalanceRow;
    leave: EmployeeLeaveRow;
  }>;
  updateDraft(input: {
    expectedRevisionNo: number;
    row: EmployeeLeaveRow;
  }): Promise<EmployeeLeaveRow>;
};

export class EmployeeLeaveRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeLeaveRepositoryError";
  }
}

export function createEmployeeLeavePrismaRepository(
  prisma: EmployeeLeavePrismaClientLike,
): EmployeeLeaveRepository {
  return {
    async createLeave(row) {
      return fromLeaveRecord(await prisma.employeeLeaveRequest.create({
        data: leaveData(row),
      }));
    },
    async findLeaveByCreateKey({ createRequestKey, scope }) {
      const record = await prisma.employeeLeaveRequest.findFirst({
        where: { ...scopeFields(scope), createRequestKey },
      });
      return record ? fromLeaveRecord(record) : null;
    },
    async findLeaveById({ id, scope }) {
      const record = await prisma.employeeLeaveRequest.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return record ? fromLeaveRecord(record) : null;
    },
    async findBalance({ personnelCode, scope, year }) {
      const record = await prisma.employeeLeaveBalance.findFirst({
        where: { ...scopeFields(scope), personnelCode, year },
      });
      return record ? fromBalanceRecord(record) : null;
    },
    async listBalances({ scope }) {
      return (await prisma.employeeLeaveBalance.findMany({
        orderBy: [{ year: "desc" }, { personnelName: "asc" }, { id: "asc" }],
        where: scopeFields(scope),
      })).map(fromBalanceRecord);
    },
    async listLeaves({ scope }) {
      return (await prisma.employeeLeaveRequest.findMany({
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        where: scopeFields(scope),
      })).map(fromLeaveRecord);
    },
    async listPersonnelLeaves({ personnelCode, scope }) {
      return (await prisma.employeeLeaveRequest.findMany({
        orderBy: { startDate: "desc" },
        where: { ...scopeFields(scope), personnelCode },
      })).map(fromLeaveRecord);
    },
    async saveBalance({ expectedRevisionNo, row }) {
      if (expectedRevisionNo === undefined) {
        return fromBalanceRecord(await prisma.employeeLeaveBalance.create({
          data: balanceData(row),
        }));
      }
      await updateBalance(prisma, { expectedRevisionNo, row });
      return readBalance(prisma, row);
    },
    async transition(input) {
      return prisma.$transaction(async (tx) => {
        await updateLeave(tx, {
          expectedRevisionNo: input.expectedRevisionNo,
          fromStatus: input.fromStatus,
          row: input.row,
        });
        let balance: EmployeeLeaveBalanceRow | undefined;
        if (input.balance) {
          await updateBalance(tx, input.balance);
          balance = await readBalance(tx, input.balance.row);
        }
        return {
          ...(balance ? { balance } : {}),
          leave: await readLeave(tx, input.row),
        };
      });
    },
    async updateDraft({ expectedRevisionNo, row }) {
      await updateLeave(prisma, {
        expectedRevisionNo,
        fromStatus: "DRAFT",
        row,
      });
      return readLeave(prisma, row);
    },
  };
}

async function updateLeave(
  client: TransactionClient,
  input: {
    expectedRevisionNo: number;
    fromStatus: EmployeeLeaveStatus;
    row: EmployeeLeaveRow;
  },
) {
  const result = await client.employeeLeaveRequest.updateMany({
    data: leaveMutableData(input.row),
    where: {
      ...scopeFields(input.row),
      id: input.row.id,
      revisionNo: input.expectedRevisionNo,
      status: input.fromStatus,
    },
  });
  if (result.count !== 1) {
    throw new EmployeeLeaveRepositoryError(
      "İzin kaydı aktif kapsamda, beklenen durumda veya revizyonda bulunamadı.",
    );
  }
}

async function updateBalance(
  client: TransactionClient,
  input: {
    expectedRevisionNo: number;
    row: EmployeeLeaveBalanceRow;
  },
) {
  const result = await client.employeeLeaveBalance.updateMany({
    data: balanceMutableData(input.row),
    where: {
      ...scopeFields(input.row),
      id: input.row.id,
      revisionNo: input.expectedRevisionNo,
    },
  });
  if (result.count !== 1) {
    throw new EmployeeLeaveRepositoryError(
      "İzin bakiyesi aktif kapsamda veya beklenen revizyonda bulunamadı.",
    );
  }
}

async function readLeave(client: TransactionClient, row: EmployeeLeaveRow) {
  const record = await client.employeeLeaveRequest.findFirst({
    where: { ...scopeFields(row), id: row.id },
  });
  if (!record) throw new EmployeeLeaveRepositoryError("Güncellenen izin kaydı okunamadı.");
  return fromLeaveRecord(record);
}

async function readBalance(client: TransactionClient, row: EmployeeLeaveBalanceRow) {
  const record = await client.employeeLeaveBalance.findFirst({
    where: { ...scopeFields(row), id: row.id },
  });
  if (!record) throw new EmployeeLeaveRepositoryError("Güncellenen izin bakiyesi okunamadı.");
  return fromBalanceRecord(record);
}

function leaveData(row: EmployeeLeaveRow) {
  return {
    ...scopeFields(row),
    ...leaveMutableData(row),
    createRequestKey: row.createRequestKey,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
  };
}

function leaveMutableData(row: EmployeeLeaveRow) {
  return {
    approveRequestKey: row.approveRequestKey,
    approvedAt: nullableDateTime(row.approvedAt),
    cancelRequestKey: row.cancelRequestKey,
    cancelledAt: nullableDateTime(row.cancelledAt),
    chargeableDays: row.chargeableDays,
    documentFileId: row.documentFileId,
    endDate: dateOnly(row.endDate),
    lastUpdateKey: row.lastUpdateKey,
    leaveType: row.leaveType,
    note: row.note,
    personnelCode: row.personnelCode,
    personnelName: row.personnelName,
    rejectRequestKey: row.rejectRequestKey,
    rejectedAt: nullableDateTime(row.rejectedAt),
    revisionNo: row.revisionNo,
    startDate: dateOnly(row.startDate),
    status: row.status,
    submitRequestKey: row.submitRequestKey,
    submittedAt: nullableDateTime(row.submittedAt),
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function balanceData(row: EmployeeLeaveBalanceRow) {
  return {
    ...scopeFields(row),
    ...balanceMutableData(row),
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    personnelCode: row.personnelCode,
    year: row.year,
  };
}

function balanceMutableData(row: EmployeeLeaveBalanceRow) {
  return {
    adjustmentDays: row.adjustmentDays,
    lastMutationKey: row.lastMutationKey,
    openingDays: row.openingDays,
    personnelName: row.personnelName,
    revisionNo: row.revisionNo,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
    usedDays: row.usedDays,
  };
}

function fromLeaveRecord(row: LeaveRecord): EmployeeLeaveRow {
  return {
    ...row,
    approvedAt: nullableIso(row.approvedAt),
    cancelledAt: nullableIso(row.cancelledAt),
    chargeableDays: decimal(row.chargeableDays),
    createdAt: iso(row.createdAt),
    endDate: dateOnlyString(row.endDate),
    leaveType: normalizeEmployeeLeaveType(row.leaveType),
    rejectedAt: nullableIso(row.rejectedAt),
    startDate: dateOnlyString(row.startDate),
    status: normalizeEmployeeLeaveStatus(row.status),
    submittedAt: nullableIso(row.submittedAt),
    updatedAt: iso(row.updatedAt),
  };
}

function fromBalanceRecord(row: BalanceRecord): EmployeeLeaveBalanceRow {
  return {
    ...row,
    adjustmentDays: decimal(row.adjustmentDays),
    createdAt: iso(row.createdAt),
    openingDays: decimal(row.openingDays),
    updatedAt: iso(row.updatedAt),
    usedDays: decimal(row.usedDays),
  };
}

function scopeFields(scope: ScopeFields) {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function dateTime(value: string) {
  return new Date(value);
}
function nullableDateTime(value: string | null) {
  return value ? dateTime(value) : null;
}
function iso(value: DateLike) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function nullableIso(value: DateLike | null) {
  return value ? iso(value) : null;
}
function dateOnlyString(value: DateLike) {
  return iso(value).slice(0, 10);
}
function decimal(value: DecimalLike) {
  return typeof value === "object" ? value.toNumber() : Number(value);
}
