import { describe, expect, it, vi } from "vitest";

import {
  createMobileSafetyChecklistPrismaRepository,
  type MobileSafetyChecklistPrismaClientLike,
  type SafetyChecklistRunRow,
} from "./mobile-safety-checklist-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-30T09:30:00.000Z";

function setup() {
  const safetyChecklistTemplate = delegate({ id: "template-1", ...scope(), title: "Günlük İSG", description: null, status: "ACTIVE", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() });
  const safetyChecklistTemplateItem = delegate({ id: "item-1", ...scope(), templateId: "template-1", category: "Şantiye", title: "Baret", sortOrder: 1, createdBy: defaultTenantScope.userId, createdAt: now() });
  const safetyChecklistRun = delegate({ id: "run-1", ...scope(), templateId: "template-1", inspectionId: null, runKey: "template-1::project-1::2026-07-30::request-1", projectId: "project-1", inspectedOn: day("2026-07-30"), inspectorName: "Saha Sorumlusu", status: "DRAFT", completedAt: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() });
  const safetyChecklistResponse = delegate({ id: "response-1", ...scope(), runId: "run-1", templateItemId: "item-1", findingId: null, responseKey: "run-1::item-1", response: "PASS", note: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() });
  const prisma = { safetyChecklistResponse, safetyChecklistRun, safetyChecklistTemplate, safetyChecklistTemplateItem } as unknown as MobileSafetyChecklistPrismaClientLike;
  return { repository: createMobileSafetyChecklistPrismaRepository(prisma), safetyChecklistResponse, safetyChecklistRun, safetyChecklistTemplate, safetyChecklistTemplateItem };
}

describe("mobile safety checklist Prisma repository", () => {
  it("reads every checklist relation only in the active tenant, company and period scope", async () => {
    const { repository, safetyChecklistResponse, safetyChecklistRun, safetyChecklistTemplate, safetyChecklistTemplateItem } = setup();
    await expect(repository.listOverview({ scope: defaultTenantScope })).resolves.toEqual(expect.objectContaining({
      responses: [expect.objectContaining({ checklistItemId: "item-1", response: "PASS" })],
      runs: [expect.objectContaining({ inspectedOn: "2026-07-30", status: "DRAFT" })],
      templateItems: [expect.objectContaining({ sortOrder: 1 })],
      templates: [expect.objectContaining({ status: "ACTIVE" })],
    }));
    expect(safetyChecklistTemplate.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ status: "asc" }, { title: "asc" }, { id: "asc" }] });
    expect(safetyChecklistTemplateItem.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ templateId: "asc" }, { sortOrder: "asc" }, { id: "asc" }] });
    expect(safetyChecklistRun.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ status: "asc" }, { inspectedOn: "desc" }, { id: "asc" }] });
    expect(safetyChecklistResponse.findMany).toHaveBeenCalledWith({ where: scope(), orderBy: [{ runId: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
  });

  it("creates a run with scoped idempotency key and UTC date-only fields", async () => {
    const { repository, safetyChecklistRun } = setup();
    const row: SafetyChecklistRunRow = {
      id: "run-1", ...scope(), templateId: "template-1", inspectionId: null, runKey: "template-1::project-1::2026-07-30::request-1", projectId: "project-1", inspectedOn: "2026-07-30", inspectorName: "Saha Sorumlusu", status: "DRAFT", completedAt: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: timestamp, updatedAt: timestamp,
    };
    await expect(repository.createRun(row)).resolves.toEqual(expect.objectContaining({ inspectedOn: "2026-07-30", runKey: row.runKey }));
    expect(safetyChecklistRun.create).toHaveBeenCalledWith({ data: expect.objectContaining({ inspectedOn: new Date("2026-07-30T00:00:00.000Z"), runKey: row.runKey, tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }) });
  });

  it("creates nested template items without repeating the parent relation key", async () => {
    const { repository, safetyChecklistTemplate } = setup();
    const template = { id: "template-1", ...scope(), title: "Günlük İSG", description: null, status: "ACTIVE" as const, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: timestamp, updatedAt: timestamp };
    const item = { id: "item-1", ...scope(), templateId: template.id, category: "Şantiye", title: "Baret", sortOrder: 1, createdBy: defaultTenantScope.userId, createdAt: timestamp };
    await repository.createTemplateWithItems({ items: [item], template });
    const data = safetyChecklistTemplate.create.mock.calls[0]?.[0].data as { items: { create: Array<Record<string, unknown>> } };
    expect(data.items.create[0]).toEqual(expect.objectContaining({ id: item.id, sortOrder: 1, title: "Baret" }));
    expect(data.items.create[0]).not.toHaveProperty("templateId");
  });

  it("maps unknown persisted statuses to safe checklist defaults", async () => {
    const { repository, safetyChecklistResponse, safetyChecklistRun, safetyChecklistTemplate } = setup();
    safetyChecklistTemplate.findMany.mockResolvedValueOnce([{ id: "unknown-template", ...scope(), title: "Şablon", description: null, status: "UNKNOWN", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() }]);
    safetyChecklistRun.findMany.mockResolvedValueOnce([{ id: "unknown-run", ...scope(), templateId: "template-1", inspectionId: null, runKey: "key", projectId: "project-1", inspectedOn: day("2026-07-30"), inspectorName: "Sorumlu", status: "UNKNOWN", completedAt: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() }]);
    safetyChecklistResponse.findMany.mockResolvedValueOnce([{ id: "unknown-response", ...scope(), runId: "run-1", templateItemId: "item-1", findingId: null, responseKey: "key", response: "UNKNOWN", note: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now(), updatedAt: now() }]);
    await expect(repository.listOverview({ scope: defaultTenantScope })).resolves.toEqual(expect.objectContaining({
      responses: [expect.objectContaining({ response: "NOT_APPLICABLE" })],
      runs: [expect.objectContaining({ status: "DRAFT" })],
      templates: [expect.objectContaining({ status: "ACTIVE" })],
    }));
  });
});

function delegate<T>(row: T) { return { create: vi.fn().mockResolvedValue(row), findMany: vi.fn().mockResolvedValue([row]), update: vi.fn().mockResolvedValue(row) }; }
function scope() { return { tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId }; }
function day(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function now() { return new Date(timestamp); }
