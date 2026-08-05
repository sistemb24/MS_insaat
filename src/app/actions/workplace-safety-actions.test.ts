import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const scope = vi.fn();
  const ensureScope = vi.fn();
  const projectFindFirst = vi.fn();
  const projectFindMany = vi.fn();
  const entityList = vi.fn();
  const auditRecord = vi.fn();
  const auditList = vi.fn();
  const repository = {
    createFinding: vi.fn(), createInspection: vi.fn(), createPpeIssuance: vi.fn(), createTraining: vi.fn(),
    createTrainingAttendance: vi.fn(), createWorkAccident: vi.fn(async (row) => row),
    listOverview: vi.fn(async () => emptyOverview()),
    updateFinding: vi.fn(), updateInspection: vi.fn(), updatePpeIssuance: vi.fn(), updateTraining: vi.fn(), updateWorkAccident: vi.fn(),
  };
  return {
    auditList, auditRecord, ensureScope, entityList, projectFindFirst, projectFindMany, repository, scope,
    prisma: { constructionProject: { findFirst: projectFindFirst, findMany: projectFindMany } },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: mocks.scope }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: () => ({}) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: () => ({ list: mocks.entityList }) }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ listByEntityType: mocks.auditList, record: mocks.auditRecord }),
}));
vi.mock("@/lib/workplace-safety-prisma-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workplace-safety-prisma-repository")>("@/lib/workplace-safety-prisma-repository");
  return { ...actual, createWorkplaceSafetyPrismaRepository: () => mocks.repository };
});

import {
  createSafetyWorkAccidentAction,
  listWorkplaceSafetyAuditLogsAction,
  listWorkplaceSafetyLookupsAction,
} from "./workplace-safety-actions";

const activeScope = {
  tenantId: "tenant-isg", tenantName: "Tenant", companyId: "company-isg", companyName: "Şirket",
  periodId: "period-2026", periodLabel: "2026", userId: "accounting-user", userName: "Muhasebe",
  userRole: "accounting" as const, licenseLabel: "Kurumsal", periodClosed: false,
};

describe("workplace safety actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scope.mockResolvedValue(activeScope);
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1" });
    mocks.projectFindMany.mockResolvedValue([{ code: "PRJ-001", id: "project-1", name: "A Blok" }]);
    mocks.entityList.mockResolvedValue({ ok: true, data: { rows: [{ code: "PER-001", status: "Aktif" }] } });
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.auditList.mockResolvedValue([]);
  });

  it("re-resolves scope, validates references and writes metadata-only central audit", async () => {
    const result = await createSafetyWorkAccidentAction({
      classification: "Kayma", occurredOn: "2026-07-28", personnelId: "PER-001", projectId: "project-1",
      summary: "Islak zemindeki olay kaydı",
    });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mocks.scope).toHaveBeenCalledOnce();
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith({
      where: { id: "project-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId },
      select: { id: true },
    });
    expect(mocks.entityList).toHaveBeenCalledWith({ scope: activeScope, slug: "personel" });
    expect(mocks.repository.createWorkAccident).toHaveBeenCalledOnce();
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      action: "workplace-safety.work-accident.create",
      metadata: { classification: "Kayma", statusTo: "DRAFT" },
    }));
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0][0])).not.toContain("Islak zemindeki olay kaydı");
  });

  it("denies a viewer before scoped reference reads or writes", async () => {
    mocks.scope.mockResolvedValue({ ...activeScope, userRole: "viewer" as const });

    const result = await createSafetyWorkAccidentAction({
      classification: "Kayma", occurredOn: "2026-07-28", personnelId: "PER-001", projectId: "project-1", summary: "Olay",
    });

    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(mocks.projectFindFirst).not.toHaveBeenCalled();
    expect(mocks.entityList).not.toHaveBeenCalled();
    expect(mocks.repository.createWorkAccident).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("does not mutate or audit when a project is outside the active scope", async () => {
    mocks.projectFindFirst.mockResolvedValue(null);

    const result = await createSafetyWorkAccidentAction({
      classification: "Kayma", occurredOn: "2026-07-28", projectId: "foreign-project", summary: "Olay",
    });

    expect(result).toEqual({ errors: ["İnşaat projesi aktif kapsamda bulunamadı."], ok: false });
    expect(mocks.repository.createWorkAccident).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("lists audit entries only through the active tenant scope", async () => {
    const result = await listWorkplaceSafetyAuditLogsAction();

    expect(result).toEqual({ data: { rows: [] }, ok: true });
    expect(mocks.auditList).toHaveBeenCalledTimes(6);
    expect(mocks.auditList).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, scope: activeScope }));
  });

  it("returns only open scoped projects and active personnel for the UI", async () => {
    mocks.entityList.mockResolvedValue({ ok: true, data: { rows: [
      { code: "PER-001", name: "Ayşe", status: "Aktif" },
      { code: "PER-002", name: "Eski", status: "Pasif" },
    ] } });

    const result = await listWorkplaceSafetyLookupsAction();

    expect(result).toEqual({ data: { personnel: [{ code: "PER-001", name: "Ayşe" }], projects: [{ code: "PRJ-001", id: "project-1", name: "A Blok" }] }, ok: true });
    expect(mocks.projectFindMany).toHaveBeenCalledWith({
      where: { tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, status: "OPEN" },
      orderBy: [{ code: "asc" }], select: { code: true, id: true, name: true },
    });
  });
});

function emptyOverview() {
  return {
    findings: [], inspections: [], ppeIssuances: [], trainingAttendances: [], trainings: [], workAccidents: [],
  };
}
