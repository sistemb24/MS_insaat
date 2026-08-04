import { describe, expect, it, vi } from "vitest";

import {
  createHrDashboardPrismaRepository,
  type HrDashboardPrismaClientLike,
} from "./hr-dashboard-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

function delegate<T>(rows: T[]) {
  return { findMany: vi.fn(async () => rows) };
}

describe("createHrDashboardPrismaRepository", () => {
  it("loads seven safe sources with the same tenant scope", async () => {
    const prisma = {
      employeeAdvanceRequest: delegate([{
        id: "advance-1",
        personnelCode: "PER-1",
        personnelName: "Ayşe",
        requestDate: new Date("2026-07-29T00:00:00.000Z"),
        status: "SUBMITTED",
      }]),
      employeeLeaveRequest: delegate([{
        endDate: new Date("2026-08-02T00:00:00.000Z"),
        id: "leave-1",
        leaveType: "ANNUAL",
        personnelCode: "PER-1",
        personnelName: "Ayşe",
        startDate: new Date("2026-08-01T00:00:00.000Z"),
        status: "APPROVED",
      }]),
      employeeTransfer: delegate([{
        effectiveDate: new Date("2026-08-03T00:00:00.000Z"),
        id: "transfer-1",
        personnelCode: "PER-1",
        personnelName: "Ayşe",
        status: "SUBMITTED",
      }]),
      entityRecord: delegate([{
        code: "PER-1",
        data: { name: "Ayşe", phone: "gizli", site: "Kuzey", status: "Aktif" },
      }]),
      safetyTraining: delegate([{
        id: "training-1",
        name: "İSG",
        nextTrainingOn: null,
        status: "PLANNED",
        trainingOn: new Date("2026-08-04T00:00:00.000Z"),
        type: "İSG",
      }]),
      safetyTrainingAttendance: delegate([{ trainingId: "training-1" }]),
      timesheet: delegate([{
        documentNo: "PNT-1",
        id: "timesheet-1",
        lineCount: 2,
        month: 7,
        siteName: "Kuzey",
        status: "Taslak",
        year: 2026,
      }]),
    } satisfies HrDashboardPrismaClientLike;

    const sources = await createHrDashboardPrismaRepository(prisma)
      .loadSources({ scope: defaultTenantScope });

    expect(sources.personnel).toEqual([{
      code: "PER-1",
      name: "Ayşe",
      site: "Kuzey",
      status: "Aktif",
    }]);
    expect(JSON.stringify(sources)).not.toContain("gizli");
    expect(sources.leaves[0]?.startDate).toBe("2026-08-01");
    expect(sources.advances[0]?.requestDate).toBe("2026-07-29");
    expect(sources.transfers[0]?.effectiveDate).toBe("2026-08-03");
    expect(sources.trainings[0]?.trainingOn).toBe("2026-08-04");

    const scoped = {
      companyId: defaultTenantScope.companyId,
      periodId: defaultTenantScope.periodId,
      tenantId: defaultTenantScope.tenantId,
    };
    for (const source of Object.values(prisma)) {
      expect(source.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining(scoped) }),
      );
    }
    expect(prisma.entityRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ...scoped, slug: "personel" } }),
    );
  });

  it("maps malformed personnel json to safe empty fields", async () => {
    const prisma = {
      employeeAdvanceRequest: delegate([]),
      employeeLeaveRequest: delegate([]),
      employeeTransfer: delegate([]),
      entityRecord: delegate([{ code: "PER-1", data: null }]),
      safetyTraining: delegate([]),
      safetyTrainingAttendance: delegate([]),
      timesheet: delegate([]),
    } satisfies HrDashboardPrismaClientLike;
    const result = await createHrDashboardPrismaRepository(prisma)
      .loadSources({ scope: defaultTenantScope });
    expect(result.personnel[0]).toEqual({
      code: "PER-1",
      name: "",
      site: "",
      status: "",
    });
  });
});
