import { describe, expect, it, vi } from "vitest";

import { createMobileSafetyChecklistService } from "./mobile-safety-checklist-service";
import type {
  MobileSafetyChecklistRepository,
  SafetyChecklistResponseRow,
  SafetyChecklistRunRow,
  SafetyChecklistTemplateItemRow,
  SafetyChecklistTemplateRow,
} from "./mobile-safety-checklist-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const now = "2026-07-30T10:00:00.000Z";

function setup(input: {
  responses?: SafetyChecklistResponseRow[];
  runs?: SafetyChecklistRunRow[];
  templateItems?: SafetyChecklistTemplateItemRow[];
  templates?: SafetyChecklistTemplateRow[];
} = {}) {
  const repository: MobileSafetyChecklistRepository = {
    createResponse: vi.fn(async (row) => row), createRun: vi.fn(async (row) => row), createTemplate: vi.fn(async (row) => row),
    createTemplateItem: vi.fn(async (row) => row), createTemplateWithItems: vi.fn(async ({ template }) => template),
    listOverview: vi.fn(async () => ({ responses: input.responses ?? [], runs: input.runs ?? [], templateItems: input.templateItems ?? [], templates: input.templates ?? [] })),
    updateResponse: vi.fn(async (row) => row), updateRun: vi.fn(async (row) => row), updateTemplate: vi.fn(async (row) => row),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = createMobileSafetyChecklistService({ auditLogRepository: audit, createId: ({ kind }) => `checklist::${kind}`, now: () => now, repository });
  return { audit, repository, service };
}

describe("mobile safety checklist service", () => {
  it("creates a template atomically with metadata-only audit", async () => {
    const { audit, repository, service } = setup();
    const result = await service.createTemplate({ scope: defaultTenantScope, values: { description: "Şantiye turu", items: [{ title: "Baret" }, { category: "Elektrik", title: "Pano kapalı mı?" }], title: "Günlük İSG" } });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(repository.createTemplateWithItems).toHaveBeenCalledWith(expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ sortOrder: 1 }), expect.objectContaining({ sortOrder: 2 })]) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.template.create", metadata: { itemCount: 2, statusTo: "ACTIVE" } }));
    expect(JSON.stringify((audit.record.mock.calls as unknown as Array<[unknown]>)[0][0])).not.toContain("Şantiye turu");
  });

  it("creates a run once from an active template and rejects an archived template", async () => {
    const activeTemplate = templateRow();
    const { audit, service } = setup({ templates: [activeTemplate] });
    const result = await service.createRun({ scope: defaultTenantScope, values: runValues() });
    expect(result).toEqual(expect.objectContaining({ data: { idempotent: false, row: expect.objectContaining({ status: "DRAFT", templateId: activeTemplate.id }) }, ok: true }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.run.create", metadata: { statusTo: "DRAFT", templateId: activeTemplate.id } }));
    const rejected = setup({ templates: [{ ...activeTemplate, status: "ARCHIVED" }] });
    await expect(rejected.service.createRun({ scope: defaultTenantScope, values: runValues() })).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(rejected.repository.createRun).not.toHaveBeenCalled();
  });

  it("records one response per run-item pair and rejects terminal runs", async () => {
    const run = runRow(); const item = templateItemRow();
    const { audit, service } = setup({ runs: [run], templateItems: [item], templates: [templateRow()] });
    const result = await service.recordResponse({ scope: defaultTenantScope, values: { checklistItemId: item.id, checklistRunId: run.id, note: "Kablo açık", response: "FAIL" } });
    expect(result).toEqual(expect.objectContaining({ data: { idempotent: false, row: expect.objectContaining({ response: "FAIL" }) }, ok: true }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.response.record", metadata: { response: "FAIL", runId: run.id, templateItemId: item.id } }));
    const existing = responseRow({ response: "FAIL" });
    const retry = setup({ responses: [existing], runs: [run], templateItems: [item], templates: [templateRow()] });
    await expect(retry.service.recordResponse({ scope: defaultTenantScope, values: { checklistItemId: item.id, checklistRunId: run.id, response: "FAIL" } })).resolves.toEqual({ data: { idempotent: true, row: existing }, ok: true });
    const terminal = setup({ runs: [{ ...run, status: "COMPLETED" }], templateItems: [item] });
    await expect(terminal.service.recordResponse({ scope: defaultTenantScope, values: { checklistItemId: item.id, checklistRunId: run.id, response: "PASS" } })).resolves.toEqual(expect.objectContaining({ ok: false }));
  });

  it("completes only fully answered runs and keeps terminal completion idempotent", async () => {
    const run = runRow(); const items = [templateItemRow(), templateItemRow({ id: "item-2", sortOrder: 2 })];
    const { audit, repository, service } = setup({ responses: [responseRow(), responseRow({ id: "response-2", checklistItemId: "item-2", responseKey: "run-1::item-2" })], runs: [run], templateItems: items, templates: [templateRow()] });
    const result = await service.completeRun({ id: run.id, scope: defaultTenantScope });
    expect(result).toEqual(expect.objectContaining({ data: { idempotent: false, row: expect.objectContaining({ status: "COMPLETED" }) }, ok: true }));
    expect(repository.updateRun).toHaveBeenCalledWith(expect.objectContaining({ completedAt: now, status: "COMPLETED" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.run.complete", metadata: { responseCount: 2, statusFrom: "DRAFT", statusTo: "COMPLETED" } }));
    const incomplete = setup({ responses: [responseRow()], runs: [run], templateItems: items, templates: [templateRow()] });
    await expect(incomplete.service.completeRun({ id: run.id, scope: defaultTenantScope })).resolves.toEqual(expect.objectContaining({ ok: false }));
    const terminal = { ...run, completedAt: now, status: "COMPLETED" as const };
    await expect(setup({ runs: [terminal] }).service.completeRun({ id: run.id, scope: defaultTenantScope })).resolves.toEqual({ data: { idempotent: true, row: terminal }, ok: true });
  });

  it("requires an explicit failed response before linking an existing finding", async () => {
    const failed = responseRow({ response: "FAIL" });
    const { audit, repository, service } = setup({ responses: [failed] });
    await expect(service.linkFinding({ findingId: "finding-1", responseId: failed.id, scope: defaultTenantScope })).resolves.toEqual(expect.objectContaining({ data: { idempotent: false, row: expect.objectContaining({ findingId: "finding-1" }) }, ok: true }));
    expect(repository.updateResponse).toHaveBeenCalledWith(expect.objectContaining({ findingId: "finding-1" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "mobile-safety-checklist.response.finding-link" }));
    const passed = setup({ responses: [responseRow({ response: "PASS" })] });
    await expect(passed.service.linkFinding({ findingId: "finding-1", responseId: "response-1", scope: defaultTenantScope })).resolves.toEqual(expect.objectContaining({ ok: false }));
  });

  it("rejects viewer mutations before checklist reads or writes", async () => {
    const { repository, service } = setup();
    await expect(service.createTemplate({ scope: { ...defaultTenantScope, userRole: "viewer" }, values: { items: [{ title: "Baret" }], title: "Günlük" } })).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(repository.listOverview).not.toHaveBeenCalled();
    expect(repository.createTemplateWithItems).not.toHaveBeenCalled();
  });
});

function templateRow(values: Partial<SafetyChecklistTemplateRow> = {}): SafetyChecklistTemplateRow { return { id: "template-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId, title: "Günlük İSG", description: null, status: "ACTIVE", createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now, updatedAt: now, ...values }; }
function templateItemRow(values: Partial<SafetyChecklistTemplateItemRow> = {}): SafetyChecklistTemplateItemRow { return { id: "item-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId, templateId: "template-1", category: null, title: "Baret", sortOrder: 1, createdBy: defaultTenantScope.userId, createdAt: now, ...values }; }
function runRow(values: Partial<SafetyChecklistRunRow> = {}): SafetyChecklistRunRow { return { id: "run-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId, templateId: "template-1", inspectionId: null, runKey: "template-1::project-1::2026-07-30::request-1", projectId: "project-1", inspectedOn: "2026-07-30", inspectorName: "Saha Sorumlusu", status: "DRAFT", completedAt: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now, updatedAt: now, ...values }; }
function responseRow(values: Partial<SafetyChecklistResponseRow> = {}): SafetyChecklistResponseRow { return { id: "response-1", tenantId: defaultTenantScope.tenantId, companyId: defaultTenantScope.companyId, periodId: defaultTenantScope.periodId, runId: "run-1", checklistItemId: "item-1", findingId: null, responseKey: "run-1::item-1", response: "PASS", note: null, createdBy: defaultTenantScope.userId, updatedBy: defaultTenantScope.userId, createdAt: now, updatedAt: now, ...values }; }
function runValues() { return { inspectedOn: "2026-07-30", inspectorName: "Saha Sorumlusu", projectId: "project-1", requestKey: "request-1", templateId: "template-1" }; }
