import { describe, expect, it } from "vitest";

import {
  HR_DASHBOARD_LIST_LIMIT,
  buildHrDashboardSnapshot,
  type HrDashboardSources,
} from "./hr-dashboard";

const sources: HrDashboardSources = {
  advances: [
    { id: "adv-1", personnelCode: "PER-1", personnelName: "Ayşe", requestDate: "2026-07-29", status: "SUBMITTED" },
    { id: "adv-2", personnelCode: "PER-2", personnelName: "Mehmet", requestDate: "2026-07-28", status: "MANAGER_APPROVED" },
    { id: "adv-3", personnelCode: "PER-3", personnelName: "Elif", requestDate: "2026-07-27", status: "FINANCE_APPROVED" },
    { id: "adv-4", personnelCode: "PER-4", personnelName: "Can", requestDate: "2026-07-26", status: "PAID" },
    { id: "adv-5", personnelCode: "PER-5", personnelName: "Deniz", requestDate: "2026-07-25", status: "SETTLED" },
  ],
  leaves: [
    { endDate: "2026-07-31", id: "leave-today", leaveType: "ANNUAL", personnelCode: "PER-1", personnelName: "Ayşe", startDate: "2026-07-29", status: "APPROVED" },
    { endDate: "2026-08-12", id: "leave-next", leaveType: "SICK", personnelCode: "PER-2", personnelName: "Mehmet", startDate: "2026-08-10", status: "APPROVED" },
    { endDate: "2026-08-05", id: "leave-pending", leaveType: "EXCUSE", personnelCode: "PER-3", personnelName: "Elif", startDate: "2026-08-05", status: "SUBMITTED" },
  ],
  personnel: [
    { code: "PER-1", name: "Ayşe", site: "Kuzey Şantiyesi", status: "Aktif" },
    { code: "PER-2", name: "Mehmet", site: " kuzey   şantiyesi ", status: "Aktif" },
    { code: "PER-3", name: "Elif", site: "", status: "Aktif" },
    { code: "PER-4", name: "Can", site: "Güney Şantiyesi", status: "Pasif" },
  ],
  timesheets: [
    { documentNo: "PNT-2", id: "ts-2", lineCount: 4, month: 7, siteName: "Kuzey", status: "Taslak", year: 2026 },
    { documentNo: "PNT-1", id: "ts-1", lineCount: 6, month: 6, siteName: "Güney", status: "Kaydedildi", year: 2026 },
  ],
  trainingAttendances: [{ trainingId: "training-1" }, { trainingId: "training-1" }],
  trainings: [
    { id: "training-1", name: "Yüksekte Çalışma", nextTrainingOn: null, status: "PLANNED", trainingOn: "2026-08-04", type: "İSG" },
    { id: "training-2", name: "Yangın", nextTrainingOn: "2026-08-20", status: "COMPLETED", trainingOn: "2026-01-10", type: "İSG" },
    { id: "training-3", name: "Eski Taslak", nextTrainingOn: null, status: "DRAFT", trainingOn: "2026-08-02", type: "İSG" },
  ],
  transfers: [
    { effectiveDate: "2026-08-01", id: "transfer-1", personnelCode: "PER-2", personnelName: "Mehmet", status: "SUBMITTED" },
  ],
};

describe("buildHrDashboardSnapshot", () => {
  it("builds scoped personnel metrics without duplicating people", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.personnel).toEqual({
      active: 3,
      onLeaveToday: 1,
      passive: 1,
      total: 4,
    });
    expect(result.windowEndDate).toBe("2026-08-29");
  });

  it("groups active personnel by normalized site and preserves unassigned people", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.siteDistribution).toEqual([
      { count: 2, percentage: 66.7, siteName: "Kuzey Şantiyesi" },
      { count: 1, percentage: 33.3, siteName: "Şantiye atanmamış" },
    ]);
  });

  it("groups only explicit pending workflow statuses without exposing amounts or notes", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.workQueue).toEqual({
      advanceFinance: 1,
      advanceManager: 1,
      advancePayment: 1,
      advanceReceivable: 1,
      leave: 1,
      total: 6,
      transfer: 1,
    });
    expect(JSON.stringify(result)).not.toContain("amount");
    expect(JSON.stringify(result)).not.toContain("note");
    expect(result.workItems.map((row) => row.href)).toContain(
      "/personel?transfer=transfer-1",
    );
  });

  it("shows approved upcoming leave but does not treat submitted leave as upcoming", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.upcomingLeaves).toHaveLength(1);
    expect(result.upcomingLeaves[0]).toMatchObject({
      href: "/personel?leave=leave-next",
      id: "leave-next",
    });
  });

  it("uses planned or next training dates without inventing missing attendance", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.upcomingTrainings).toEqual([
      expect.objectContaining({ attendanceCount: 2, date: "2026-08-04", id: "training-1" }),
      expect.objectContaining({ attendanceCount: 0, date: "2026-08-20", id: "training-2" }),
    ]);
    expect(result.upcomingTrainings.some((row) => row.id === "training-3")).toBe(false);
  });

  it("reports only existing draft timesheets", () => {
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources });
    expect(result.draftTimesheets).toEqual([
      expect.objectContaining({ documentNo: "PNT-2", href: "/puantaj" }),
    ]);
  });

  it("caps detail lists while retaining complete queue counts", () => {
    const expanded = {
      ...sources,
      transfers: Array.from({ length: HR_DASHBOARD_LIST_LIMIT + 3 }, (_, index) => ({
        effectiveDate: "2026-08-01",
        id: `transfer-${index}`,
        personnelCode: `PER-${index}`,
        personnelName: `Personel ${index}`,
        status: "SUBMITTED",
      })),
    };
    const result = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources: expanded });
    expect(result.workItems).toHaveLength(HR_DASHBOARD_LIST_LIMIT);
    expect(result.workQueue.transfer).toBe(HR_DASHBOARD_LIST_LIMIT + 3);
    expect(result.workQueue.total).toBe(HR_DASHBOARD_LIST_LIMIT + 8);
  });

  it("rejects invalid dashboard dates", () => {
    expect(() => buildHrDashboardSnapshot({ asOfDate: "2026-02-30", sources }))
      .toThrow("Dashboard tarihi geçersizdir.");
  });
});
