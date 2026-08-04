import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HrDashboardSources } from "@/lib/hr-dashboard";

const mocks = vi.hoisted(() => ({
  ensureScope: vi.fn(),
  loadSources: vi.fn(),
  prisma: {},
  sessionState: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: mocks.ensureScope,
}));
vi.mock("@/lib/server-active-scope", () => ({
  requireActiveSessionState: mocks.sessionState,
}));
vi.mock("@/lib/hr-dashboard-prisma-repository", () => ({
  createHrDashboardPrismaRepository: () => ({
    loadSources: mocks.loadSources,
  }),
}));

import { getHrDashboardAction } from "./hr-dashboard-actions";

const scope = {
  companyId: "company-hr",
  companyName: "Şirket",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-hr",
  periodLabel: "2026",
  tenantId: "tenant-hr",
  tenantName: "Tenant",
  userId: "viewer-hr",
  userName: "Salt Okur",
  userRole: "viewer" as const,
};
const emptySources: HrDashboardSources = {
  advances: [],
  leaves: [],
  personnel: [],
  timesheets: [],
  trainingAttendances: [],
  trainings: [],
  transfers: [],
};

describe("getHrDashboardAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope });
    mocks.loadSources.mockResolvedValue(emptySources);
  });

  it("rebuilds the active scope and returns a serializable read model for viewer", async () => {
    const result = await getHrDashboardAction();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.personnel.total).toBe(0);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, scope);
    expect(mocks.loadSources).toHaveBeenCalledWith({ scope });
    expect(JSON.parse(JSON.stringify(result.data))).toEqual(result.data);
  });

  it("fails closed when session resolution fails", async () => {
    mocks.sessionState.mockRejectedValue(new Error("session"));
    await expect(getHrDashboardAction()).resolves.toEqual({
      errors: ["İK operasyon özeti yüklenemedi."],
      ok: false,
    });
    expect(mocks.loadSources).not.toHaveBeenCalled();
  });

  it("returns a controlled error instead of partial counts", async () => {
    mocks.loadSources.mockRejectedValue(new Error("database"));
    await expect(getHrDashboardAction()).resolves.toEqual({
      errors: ["İK operasyon özeti yüklenemedi."],
      ok: false,
    });
  });
});
