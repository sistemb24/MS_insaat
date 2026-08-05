import type {
  SafetyChecklistResponseStatus,
  SafetyChecklistRunStatus,
  SafetyChecklistTemplateStatus,
} from "./mobile-safety-checklist";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findMany(input: { orderBy: unknown; where: ScopeFields }): Promise<T[]>;
  update(input: { data: unknown; where: { id: string } }): Promise<T>;
};

export type SafetyChecklistTemplateRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  description: string | null;
  id: string;
  status: SafetyChecklistTemplateStatus;
  title: string;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyChecklistTemplateItemRow = ScopeFields & {
  category: string | null;
  createdAt: string;
  createdBy: string;
  id: string;
  sortOrder: number;
  templateId: string;
  title: string;
};

export type SafetyChecklistRunRow = ScopeFields & {
  completedAt: string | null;
  createdAt: string;
  createdBy: string;
  id: string;
  inspectedOn: string;
  inspectionId: string | null;
  inspectorName: string;
  projectId: string;
  runKey: string;
  status: SafetyChecklistRunStatus;
  templateId: string;
  updatedAt: string;
  updatedBy: string;
};

export type SafetyChecklistResponseRow = ScopeFields & {
  checklistItemId: string;
  createdAt: string;
  createdBy: string;
  findingId: string | null;
  id: string;
  note: string | null;
  response: SafetyChecklistResponseStatus;
  responseKey: string;
  runId: string;
  updatedAt: string;
  updatedBy: string;
};

type TemplateRecord = Omit<SafetyChecklistTemplateRow, "createdAt" | "status" | "updatedAt"> & {
  createdAt: DateLike;
  status: string;
  updatedAt: DateLike;
};
type TemplateItemRecord = Omit<SafetyChecklistTemplateItemRow, "createdAt"> & { createdAt: DateLike };
type RunRecord = Omit<SafetyChecklistRunRow, "completedAt" | "createdAt" | "inspectedOn" | "status" | "updatedAt"> & {
  completedAt: DateLike | null;
  createdAt: DateLike;
  inspectedOn: DateLike;
  status: string;
  updatedAt: DateLike;
};
type ResponseRecord = Omit<SafetyChecklistResponseRow, "checklistItemId" | "createdAt" | "response" | "updatedAt"> & {
  createdAt: DateLike;
  response: string;
  templateItemId: string;
  updatedAt: DateLike;
};

export type MobileSafetyChecklistPrismaClientLike = {
  safetyChecklistResponse: Delegate<ResponseRecord>;
  safetyChecklistRun: Delegate<RunRecord>;
  safetyChecklistTemplate: Delegate<TemplateRecord>;
  safetyChecklistTemplateItem: Delegate<TemplateItemRecord>;
};

export type MobileSafetyChecklistRepository = {
  createResponse(row: SafetyChecklistResponseRow): Promise<SafetyChecklistResponseRow>;
  createRun(row: SafetyChecklistRunRow): Promise<SafetyChecklistRunRow>;
  createTemplate(row: SafetyChecklistTemplateRow): Promise<SafetyChecklistTemplateRow>;
  createTemplateWithItems(input: { items: SafetyChecklistTemplateItemRow[]; template: SafetyChecklistTemplateRow }): Promise<SafetyChecklistTemplateRow>;
  createTemplateItem(row: SafetyChecklistTemplateItemRow): Promise<SafetyChecklistTemplateItemRow>;
  listOverview(input: { scope: TenantScope }): Promise<MobileSafetyChecklistOverview>;
  updateResponse(row: SafetyChecklistResponseRow): Promise<SafetyChecklistResponseRow>;
  updateRun(row: SafetyChecklistRunRow): Promise<SafetyChecklistRunRow>;
  updateTemplate(row: SafetyChecklistTemplateRow): Promise<SafetyChecklistTemplateRow>;
};

export type MobileSafetyChecklistOverview = {
  responses: SafetyChecklistResponseRow[];
  runs: SafetyChecklistRunRow[];
  templateItems: SafetyChecklistTemplateItemRow[];
  templates: SafetyChecklistTemplateRow[];
};

export function createMobileSafetyChecklistPrismaRepository(
  prisma: MobileSafetyChecklistPrismaClientLike,
): MobileSafetyChecklistRepository {
  return {
    async createResponse(row) { return responseFromRecord(await prisma.safetyChecklistResponse.create({ data: responseData(row) })); },
    async createRun(row) { return runFromRecord(await prisma.safetyChecklistRun.create({ data: runData(row) })); },
    async createTemplate(row) { return templateFromRecord(await prisma.safetyChecklistTemplate.create({ data: templateData(row) })); },
    async createTemplateWithItems({ items, template }) {
      return templateFromRecord(await prisma.safetyChecklistTemplate.create({
        data: { ...templateData(template), items: { create: items.map(templateItemNestedData) } },
      }));
    },
    async createTemplateItem(row) { return templateItemFromRecord(await prisma.safetyChecklistTemplateItem.create({ data: templateItemData(row) })); },
    async listOverview({ scope }) {
      const where = scopedWhere(scope);
      const [templates, templateItems, runs, responses] = await Promise.all([
        prisma.safetyChecklistTemplate.findMany({ where, orderBy: [{ status: "asc" }, { title: "asc" }, { id: "asc" }] }),
        prisma.safetyChecklistTemplateItem.findMany({ where, orderBy: [{ templateId: "asc" }, { sortOrder: "asc" }, { id: "asc" }] }),
        prisma.safetyChecklistRun.findMany({ where, orderBy: [{ status: "asc" }, { inspectedOn: "desc" }, { id: "asc" }] }),
        prisma.safetyChecklistResponse.findMany({ where, orderBy: [{ runId: "asc" }, { createdAt: "asc" }, { id: "asc" }] }),
      ]);
      return {
        responses: responses.map(responseFromRecord),
        runs: runs.map(runFromRecord),
        templateItems: templateItems.map(templateItemFromRecord),
        templates: templates.map(templateFromRecord),
      };
    },
    async updateResponse(row) { return responseFromRecord(await prisma.safetyChecklistResponse.update({ data: responseData(row), where: { id: row.id } })); },
    async updateRun(row) { return runFromRecord(await prisma.safetyChecklistRun.update({ data: runData(row), where: { id: row.id } })); },
    async updateTemplate(row) { return templateFromRecord(await prisma.safetyChecklistTemplate.update({ data: templateData(row), where: { id: row.id } })); },
  };
}

function scopedWhere(scope: TenantScope): ScopeFields {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function templateData(row: SafetyChecklistTemplateRow) {
  return {
    ...scopeFields(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy,
    description: row.description, id: row.id, status: row.status, title: row.title,
    updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function templateItemData(row: SafetyChecklistTemplateItemRow) {
  return {
    ...scopeFields(row), category: row.category, createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy, id: row.id, sortOrder: row.sortOrder, templateId: row.templateId, title: row.title,
  };
}

function templateItemNestedData(row: SafetyChecklistTemplateItemRow) {
  return {
    ...scopeFields(row), category: row.category, createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy, id: row.id, sortOrder: row.sortOrder, title: row.title,
  };
}

function runData(row: SafetyChecklistRunRow) {
  return {
    ...scopeFields(row), completedAt: nullableDateTime(row.completedAt), createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy, id: row.id, inspectedOn: dayDate(row.inspectedOn), inspectionId: row.inspectionId,
    inspectorName: row.inspectorName, projectId: row.projectId, runKey: row.runKey, status: row.status,
    templateId: row.templateId, updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function responseData(row: SafetyChecklistResponseRow) {
  return {
    ...scopeFields(row), createdAt: dateTime(row.createdAt), createdBy: row.createdBy,
    findingId: row.findingId, id: row.id, note: row.note, response: row.response,
    responseKey: row.responseKey, runId: row.runId, templateItemId: row.checklistItemId,
    updatedAt: dateTime(row.updatedAt), updatedBy: row.updatedBy,
  };
}

function templateFromRecord(row: TemplateRecord): SafetyChecklistTemplateRow {
  return { ...row, createdAt: iso(row.createdAt), status: templateStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function templateItemFromRecord(row: TemplateItemRecord): SafetyChecklistTemplateItemRow {
  return { ...row, createdAt: iso(row.createdAt) };
}
function runFromRecord(row: RunRecord): SafetyChecklistRunRow {
  return { ...row, completedAt: nullableIso(row.completedAt), createdAt: iso(row.createdAt), inspectedOn: day(row.inspectedOn)!, status: runStatus(row.status), updatedAt: iso(row.updatedAt) };
}
function responseFromRecord(row: ResponseRecord): SafetyChecklistResponseRow {
  const { templateItemId, ...record } = row;
  return {
    ...record,
    checklistItemId: templateItemId,
    createdAt: iso(row.createdAt),
    response: responseStatus(row.response),
    updatedAt: iso(row.updatedAt),
  };
}

function scopeFields(row: ScopeFields) { return { companyId: row.companyId, periodId: row.periodId, tenantId: row.tenantId }; }
function dateTime(value: string) { return new Date(value); }
function nullableDateTime(value: string | null) { return value ? dateTime(value) : null; }
function dayDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function nullableIso(value: DateLike | null) { return value ? iso(value) : null; }
function day(value: DateLike | null) { return value ? iso(value).slice(0, 10) : null; }
function templateStatus(value: string): SafetyChecklistTemplateStatus { return value === "ARCHIVED" ? value : "ACTIVE"; }
function runStatus(value: string): SafetyChecklistRunStatus { return value === "COMPLETED" ? value : "DRAFT"; }
function responseStatus(value: string): SafetyChecklistResponseStatus { return value === "PASS" || value === "FAIL" ? value : "NOT_APPLICABLE"; }
