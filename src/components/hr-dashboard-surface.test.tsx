/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HrDashboardSnapshot } from "@/lib/hr-dashboard";

const mocks = vi.hoisted(() => ({ getDashboard: vi.fn() }));
vi.mock("@/app/actions/hr-dashboard-actions", () => ({
  getHrDashboardAction: mocks.getDashboard,
}));

import { HrDashboardSurface } from "./hr-dashboard-surface";

const snapshot: HrDashboardSnapshot = {
  asOfDate: "2026-07-30",
  draftTimesheets: [{
    documentNo: "PNT-2026-07",
    href: "/puantaj",
    id: "timesheet-1",
    lineCount: 3,
    month: 7,
    siteName: "Kuzey Şantiyesi",
    year: 2026,
  }],
  personnel: { active: 3, onLeaveToday: 1, passive: 1, total: 4 },
  siteDistribution: [
    { count: 2, percentage: 66.7, siteName: "Kuzey Şantiyesi" },
    { count: 1, percentage: 33.3, siteName: "Şantiye atanmamış" },
  ],
  upcomingLeaves: [{
    endDate: "2026-08-11",
    href: "/personel?leave=leave-1",
    id: "leave-1",
    leaveType: "ANNUAL",
    personnelCode: "PER-1",
    personnelName: "Ayşe Demir",
    startDate: "2026-08-10",
  }],
  upcomingTrainings: [{
    attendanceCount: 2,
    date: "2026-08-05",
    href: "/isg",
    id: "training-1",
    name: "Yüksekte Çalışma",
    status: "PLANNED",
    type: "İSG",
  }],
  windowEndDate: "2026-08-29",
  workItems: [{
    date: "2026-08-01",
    href: "/personel?transfer=transfer-1",
    id: "transfer-1",
    kind: "transfer",
    personnelCode: "PER-2",
    personnelName: "Mehmet Kaya",
    status: "SUBMITTED",
  }],
  workQueue: {
    advanceFinance: 1,
    advanceManager: 1,
    advancePayment: 0,
    advanceReceivable: 0,
    leave: 1,
    total: 4,
    transfer: 1,
  },
};

describe("HrDashboardSurface", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDashboard.mockResolvedValue({ data: snapshot, ok: true });
  });

  it("renders metrics, distribution and source-linked operational cards", async () => {
    render(<HrDashboardSurface />);
    expect(screen.getByRole("status").textContent).toContain("yükleniyor");
    expect(await screen.findByText("Şantiye bazlı personel dağılımı")).toBeTruthy();
    expect(screen.getByText("Toplam personel").parentElement?.textContent).toContain("4");
    expect(screen.getByText("Bugün izinli").parentElement?.textContent).toContain("1");
    expect(screen.getByText("Kuzey Şantiyesi").parentElement?.textContent).toContain("%66,7");
    expect(screen.getByRole("link", { name: /Mehmet Kaya/ }).getAttribute("href"))
      .toBe("/personel?transfer=transfer-1");
    expect(screen.getByRole("link", { name: /Ayşe Demir/ }).getAttribute("href"))
      .toBe("/personel?leave=leave-1");
    expect(screen.getByRole("link", { name: /Yüksekte Çalışma/ }).getAttribute("href"))
      .toBe("/isg");
  });

  it("contains no mutation controls in the loaded dashboard DOM", async () => {
    render(<HrDashboardSurface />);
    await screen.findByText("Bekleyen iş kuyruğu");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/kaydet/i)).toBeNull();
    expect(screen.queryByText(/onayla/i)).toBeNull();
  });

  it("renders safe empty states", async () => {
    mocks.getDashboard.mockResolvedValue({
      data: {
        ...snapshot,
        draftTimesheets: [],
        siteDistribution: [],
        upcomingLeaves: [],
        upcomingTrainings: [],
        workItems: [],
        workQueue: {
          advanceFinance: 0,
          advanceManager: 0,
          advancePayment: 0,
          advanceReceivable: 0,
          leave: 0,
          total: 0,
          transfer: 0,
        },
      },
      ok: true,
    });
    render(<HrDashboardSurface />);
    expect(await screen.findByText("Aktif personel dağılımı bulunmuyor.")).toBeTruthy();
    expect(screen.getByText("Bekleyen İK işi bulunmuyor.")).toBeTruthy();
    expect(screen.getByText("Taslak puantaj bulunmuyor.")).toBeTruthy();
  });

  it("renders a controlled error and retry control", async () => {
    mocks.getDashboard.mockResolvedValue({
      errors: ["İK operasyon özeti yüklenemedi."],
      ok: false,
    });
    render(<HrDashboardSurface />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "İK operasyon özeti yüklenemedi.",
    );
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeTruthy();
  });

  it("keeps responsive, theme-token and print contracts explicit", async () => {
    render(<HrDashboardSurface />);
    await screen.findByText("Şantiye bazlı personel dağılımı");
    const html = document.querySelector("[data-hr-dashboard]")?.innerHTML ?? "";
    expect(html).toContain("sm:grid-cols-2");
    expect(html).toContain("xl:grid-cols-4");
    expect(html).toContain("text-content");
    expect(html).toContain("bg-surface-raised");
    expect(html).toContain("print:");
  });
});
