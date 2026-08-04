import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const scope = vi.fn(); const ensureScope = vi.fn(); const auditRecord = vi.fn(); const auditList = vi.fn();
  const projectFindFirst = vi.fn(); const inspectionFindFirst = vi.fn(); const findingFindFirst = vi.fn();
  const repository = {
    createResponse: vi.fn(async (row) => row), createRun: vi.fn(async (row) => row), createTemplate: vi.fn(async (row) => row),
    createTemplateItem: vi.fn(async (row) => row), createTemplateWithItems: vi.fn(async ({ template }) => template),
    listOverview: vi.fn(async () => overview()), updateResponse: vi.fn(async (row) => row), updateRun: vi.fn(async (row) => row), updateTemplate: vi.fn(async (row) => row),
  };
  return {
    auditList, auditRecord, ensureScope, findingFindFirst, inspectionFindFirst, projectFindFirst, repository, scope,
    prisma: { constructionProject: { findFirst: projectFindFirst }, safetyFinding: { findFirst: findingFindFirst }, safetyInspection: { findFirst: inspectionFindFirst } },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: mocks.scope }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: () => ({ listByEntityType: mocks.auditList, record: mocks.auditRecord }) }));
vi.mock("@/lib/mobile-safety-checklist-prisma-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mobile-safety-checklist-prisma-repository")>("@/lib/mobile-safety-checklist-prisma-repository");
  return { ...actual, createMobileSafetyChecklistPrismaRepository: () => mocks.repository };
});

import {
  createSafetyChecklistRunAction,
  createSafetyChecklistTemplateAction,
  linkSafetyChecklistResponseFindingAction,
  listMobileSafetyChecklistAuditLogsAction,
} from "./mobile-safety-checklist-actions";

const activeScope = { tenantId: "tenant-checklist", tenantName: "Tenant", companyId: "company-checklist", companyName: "Şirket", periodId: "period-2026", periodLabel: "2026", userId: "accounting-user", userName: "Muhasebe", userRole: "accounting" as const, licenseLabel: "Kurumsal", periodClosed: false };

describe("mobile safety checklist actions", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.scope.mockResolvedValue(activeScope); mocks.ensureScope.mockResolvedValue(undefined);
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1" }); mocks.inspectionFindFirst.mockResolvedValue({ id: "inspection-1" }); mocks.findingFindFirst.mockResolvedValue({ id: "finding-1" });
    mocks.auditRecord.mockResolvedValue(undefined); mocks.auditList.mockResolvedValue([]); mocks.repository.listOverview.mockImplementation(async () => overview());
  });

  it("re-resolves scope and audits template creation without free checklist text", async () => {
    const result = await createSafetyChecklistTemplateAction({ description: "Gizli saha notu", items: [{ title: "Baret" }], title: "Günlük İSG" });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.repository.createTemplateWithItems).toHaveBeenCalled();
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.template.create" }));
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0][0])).not.toContain("Gizli saha notu");
  });

  it("validates the active scoped project and optional inspection before creating a run", async () => {
    const result = await createSafetyChecklistRunAction({ inspectionId: "inspection-1", values: runValues() });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mocks.projectFindFirst).toHaveBeenCalledWith({ where: { id: "project-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, status: "OPEN" }, select: { id: true } });
    expect(mocks.inspectionFindFirst).toHaveBeenCalledWith({ where: { id: "inspection-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, projectId: "project-1" }, select: { id: true } });
    expect(mocks.repository.createRun).toHaveBeenCalled();
  });

  it("denies viewer mutations before project, inspection, finding, or repository access", async () => {
    mocks.scope.mockResolvedValue({ ...activeScope, userRole: "viewer" as const });
    const result = await createSafetyChecklistRunAction({ values: runValues() });
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(mocks.projectFindFirst).not.toHaveBeenCalled(); expect(mocks.inspectionFindFirst).not.toHaveBeenCalled();
    expect(mocks.repository.createRun).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("does not link a finding outside the active scope", async () => {
    mocks.findingFindFirst.mockResolvedValue(null);
    const result = await linkSafetyChecklistResponseFindingAction({ findingId: "foreign-finding", responseId: "response-1" });
    expect(result).toEqual({ errors: ["İSG bulgusu aktif kapsamda bulunamadı."], ok: false });
    expect(mocks.repository.updateResponse).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("lists checklist audit entries only through the active tenant scope", async () => {
    await expect(listMobileSafetyChecklistAuditLogsAction()).resolves.toEqual({ data: { rows: [] }, ok: true });
    expect(mocks.auditList).toHaveBeenCalledTimes(3);
    expect(mocks.auditList).toHaveBeenCalledWith({ entityType: "mobile-safety-checklist-run", limit: 100, scope: activeScope });
  });
});

function overview() {
  return {
    responses: [], runs: [], templateItems: [{ id: "item-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, templateId: "template-1", category: null, title: "Baret", sortOrder: 1, createdBy: activeScope.userId, createdAt: "2026-07-30T10:00:00.000Z" }],
    templates: [{ id: "template-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, title: "Günlük İSG", description: null, status: "ACTIVE" as const, createdBy: activeScope.userId, updatedBy: activeScope.userId, createdAt: "2026-07-30T10:00:00.000Z", updatedAt: "2026-07-30T10:00:00.000Z" }],
  };
}
function runValues() { return { inspectedOn: "2026-07-30", inspectorName: "Saha Sorumlusu", projectId: "project-1", requestKey: "request-1", templateId: "template-1" }; }
