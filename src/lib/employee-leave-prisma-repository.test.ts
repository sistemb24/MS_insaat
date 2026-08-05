import { describe, expect, test, vi } from "vitest";

import {
  createEmployeeLeavePrismaRepository,
  type EmployeeLeavePrismaClientLike,
  type EmployeeLeaveRow,
} from "./employee-leave-prisma-repository";
import type { TenantScope } from "./tenant-scope";

const scope: TenantScope = {
  companyId: "company-1",
  companyName: "Firma",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-1",
  periodLabel: "2026",
  tenantId: "tenant-1",
  tenantName: "Tenant",
  userId: "user-admin",
  userName: "Admin",
  userRole: "admin",
};
const leave: EmployeeLeaveRow = {
  approveRequestKey: null,
  approvedAt: null,
  cancelRequestKey: null,
  cancelledAt: null,
  chargeableDays: 2,
  companyId: scope.companyId,
  createRequestKey: "user-admin::create-1",
  createdAt: "2026-07-30T10:00:00.000Z",
  createdBy: scope.userId,
  documentFileId: null,
  endDate: "2026-08-11",
  id: "leave-1",
  lastUpdateKey: null,
  leaveType: "ANNUAL",
  note: "",
  periodId: scope.periodId,
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  rejectRequestKey: null,
  rejectedAt: null,
  revisionNo: 1,
  startDate: "2026-08-10",
  status: "DRAFT",
  submitRequestKey: null,
  submittedAt: null,
  tenantId: scope.tenantId,
  updatedAt: "2026-07-30T10:00:00.000Z",
  updatedBy: scope.userId,
};

function record(row = leave) {
  return {
    ...row,
    chargeableDays: { toNumber: () => row.chargeableDays },
    createdAt: new Date(row.createdAt),
    endDate: new Date(`${row.endDate}T00:00:00.000Z`),
    startDate: new Date(`${row.startDate}T00:00:00.000Z`),
    updatedAt: new Date(row.updatedAt),
  };
}

describe("employee leave prisma repository", () => {
  test("applies tenant, company and period scope to leave reads", async () => {
    const findFirst = vi.fn().mockResolvedValue(record());
    const repository = createEmployeeLeavePrismaRepository({
      employeeLeaveRequest: { findFirst },
    } as unknown as EmployeeLeavePrismaClientLike);
    await repository.findLeaveById({ id: leave.id, scope });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        companyId: scope.companyId,
        id: leave.id,
        periodId: scope.periodId,
        tenantId: scope.tenantId,
      },
    });
  });

  test("orders scoped leave and balance lists deterministically", async () => {
    const leaveFindMany = vi.fn().mockResolvedValue([record()]);
    const balanceFindMany = vi.fn().mockResolvedValue([]);
    const repository = createEmployeeLeavePrismaRepository({
      employeeLeaveBalance: { findMany: balanceFindMany },
      employeeLeaveRequest: { findMany: leaveFindMany },
    } as unknown as EmployeeLeavePrismaClientLike);
    expect((await repository.listLeaves({ scope }))[0]?.id).toBe(leave.id);
    await repository.listBalances({ scope });
    expect(leaveFindMany.mock.calls[0]?.[0].where).toEqual({
      companyId: scope.companyId,
      periodId: scope.periodId,
      tenantId: scope.tenantId,
    });
    expect(balanceFindMany.mock.calls[0]?.[0].where).toEqual({
      companyId: scope.companyId,
      periodId: scope.periodId,
      tenantId: scope.tenantId,
    });
  });

  test("uses optimistic scope/status/revision conditions for draft updates", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue(record({ ...leave, revisionNo: 2 }));
    const repository = createEmployeeLeavePrismaRepository({
      employeeLeaveRequest: { findFirst, updateMany },
    } as unknown as EmployeeLeavePrismaClientLike);
    await repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...leave, revisionNo: 2 },
    });
    expect(updateMany.mock.calls[0]?.[0].where).toEqual({
      companyId: scope.companyId,
      id: leave.id,
      periodId: scope.periodId,
      revisionNo: 1,
      status: "DRAFT",
      tenantId: scope.tenantId,
    });
  });

  test("fails closed when an optimistic leave update matches no row", async () => {
    const repository = createEmployeeLeavePrismaRepository({
      employeeLeaveRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as EmployeeLeavePrismaClientLike);
    await expect(repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...leave, revisionNo: 2 },
    })).rejects.toThrow("beklenen durumda veya revizyonda");
  });
});
