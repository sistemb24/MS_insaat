import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  MobileSafetyChecklistDomainError,
  assertSafetyChecklistRunComplete,
  assertSafetyChecklistTransition,
  canTransitionSafetyChecklistRunStatus,
  canTransitionSafetyChecklistTemplateStatus,
  createSafetyChecklistResponseDraft,
  createSafetyChecklistRunDraft,
  createSafetyChecklistTemplateDraft,
  getMobileSafetyChecklistPermission,
  type SafetyChecklistResponseDraftInput,
  type SafetyChecklistRunDraftInput,
  type SafetyChecklistTemplateDraftInput,
} from "./mobile-safety-checklist";
import type {
  MobileSafetyChecklistOverview,
  MobileSafetyChecklistRepository,
  SafetyChecklistResponseRow,
  SafetyChecklistRunRow,
  SafetyChecklistTemplateItemRow,
  SafetyChecklistTemplateRow,
} from "./mobile-safety-checklist-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type MobileSafetyChecklistService = ReturnType<typeof createMobileSafetyChecklistService>;

export function createMobileSafetyChecklistService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (input: { kind: string; scope: TenantScope }) => string;
  now: () => string;
  repository: MobileSafetyChecklistRepository;
}) {
  async function resolve(scope: TenantScope): Promise<Result<MobileSafetyChecklistOverview>> {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false };
    return { data: await repository.listOverview({ scope }), ok: true };
  }

  function canMutate(scope: TenantScope): Result<null> {
    const permission = getMobileSafetyChecklistPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    return permission.allowed ? { data: null, ok: true } : { errors: [permission.reason], ok: false };
  }

  return {
    async list({ scope }: { scope: TenantScope }): Promise<Result<MobileSafetyChecklistOverview>> {
      return resolve(scope);
    },

    async createTemplate(input: {
      scope: TenantScope;
      values: SafetyChecklistTemplateDraftInput;
    }): Promise<Result<SafetyChecklistTemplateRow>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      try {
        const draft = createSafetyChecklistTemplateDraft(input.values);
        const timestamp = now();
        const template: SafetyChecklistTemplateRow = {
          ...scopeFields(input.scope), ...draft, createdAt: timestamp, createdBy: input.scope.userId,
          id: createId({ kind: "checklist-template", scope: input.scope }), updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const items: SafetyChecklistTemplateItemRow[] = draft.items.map((item) => ({
          ...scopeFields(input.scope), ...item, createdAt: timestamp, createdBy: input.scope.userId,
          id: createId({ kind: "checklist-template-item", scope: input.scope }), templateId: template.id,
        }));
        const created = await repository.createTemplateWithItems({ items, template });
        await audit(auditLogRepository, input.scope, {
          action: "mobile-safety-checklist.template.create", entityId: created.id, entityLabel: created.id,
          entityType: "mobile-safety-checklist-template", metadata: { itemCount: items.length, statusTo: created.status }, occurredAt: timestamp,
        });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async archiveTemplate(input: { id: string; scope: TenantScope }): Promise<Result<{ idempotent: boolean; row: SafetyChecklistTemplateRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.templates.find((row) => row.id === input.id);
      if (!existing) return missing("Kontrol şablonu");
      if (existing.status === "ARCHIVED") return { data: { idempotent: true, row: existing }, ok: true };
      try {
        assertSafetyChecklistTransition(canTransitionSafetyChecklistTemplateStatus(existing.status, "ARCHIVED"), "Kontrol şablonu");
        const timestamp = now();
        const updated = await repository.updateTemplate({ ...existing, status: "ARCHIVED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "mobile-safety-checklist.template.archive", entityId: updated.id, entityLabel: updated.id,
          entityType: "mobile-safety-checklist-template", metadata: { statusFrom: existing.status, statusTo: updated.status }, occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: updated }, ok: true };
      } catch (error) { return failure(error); }
    },

    async createRun(input: {
      inspectionId?: string | null;
      scope: TenantScope;
      values: SafetyChecklistRunDraftInput;
    }): Promise<Result<{ idempotent: boolean; row: SafetyChecklistRunRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      try {
        const draft = createSafetyChecklistRunDraft(input.values);
        const existing = overview.data.runs.find((row) => row.runKey === draft.key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        const template = overview.data.templates.find((row) => row.id === draft.templateId);
        if (!template || template.status !== "ACTIVE") return missing("Aktif kontrol şablonu");
        const timestamp = now();
        const created = await repository.createRun({
          ...scopeFields(input.scope), ...draft, completedAt: null, createdAt: timestamp, createdBy: input.scope.userId,
          id: createId({ kind: "checklist-run", scope: input.scope }), inspectionId: input.inspectionId?.trim() || null,
          runKey: draft.key, updatedAt: timestamp, updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, {
          action: "mobile-safety-checklist.run.create", entityId: created.id, entityLabel: created.id,
          entityType: "mobile-safety-checklist-run", metadata: { statusTo: created.status, templateId: created.templateId }, occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async recordResponse(input: {
      scope: TenantScope;
      values: SafetyChecklistResponseDraftInput;
    }): Promise<Result<{ idempotent: boolean; row: SafetyChecklistResponseRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      try {
        const draft = createSafetyChecklistResponseDraft(input.values);
        const existing = overview.data.responses.find((row) => row.responseKey === draft.key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        const run = overview.data.runs.find((row) => row.id === draft.checklistRunId);
        if (!run) return missing("Kontrol yürütmesi");
        if (run.status !== "DRAFT") return invalid("Tamamlanmış kontrol yürütmesine yanıt eklenemez.");
        const item = overview.data.templateItems.find((row) => row.id === draft.checklistItemId && row.templateId === run.templateId);
        if (!item) return missing("Kontrol şablonu maddesi");
        const timestamp = now();
        const created = await repository.createResponse({
          ...scopeFields(input.scope), ...draft, createdAt: timestamp, createdBy: input.scope.userId,
          findingId: null, id: createId({ kind: "checklist-response", scope: input.scope }), responseKey: draft.key,
          runId: draft.checklistRunId,
          updatedAt: timestamp, updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, {
          action: "mobile-safety-checklist.response.record", entityId: created.id, entityLabel: created.id,
          entityType: "mobile-safety-checklist-response", metadata: { response: created.response, runId: created.runId, templateItemId: created.checklistItemId }, occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async completeRun(input: { id: string; scope: TenantScope }): Promise<Result<{ idempotent: boolean; row: SafetyChecklistRunRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.runs.find((row) => row.id === input.id);
      if (!existing) return missing("Kontrol yürütmesi");
      if (existing.status === "COMPLETED") return { data: { idempotent: true, row: existing }, ok: true };
      try {
        assertSafetyChecklistTransition(canTransitionSafetyChecklistRunStatus(existing.status, "COMPLETED"), "Kontrol yürütmesi");
        const expectedItemIds = overview.data.templateItems.filter((item) => item.templateId === existing.templateId).map((item) => item.id);
        const answeredItemIds = overview.data.responses.filter((row) => row.runId === existing.id).map((row) => row.checklistItemId);
        assertSafetyChecklistRunComplete({ answeredItemIds, expectedItemIds });
        const timestamp = now();
        const updated = await repository.updateRun({ ...existing, completedAt: timestamp, status: "COMPLETED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "mobile-safety-checklist.run.complete", entityId: updated.id, entityLabel: updated.id,
          entityType: "mobile-safety-checklist-run", metadata: { responseCount: answeredItemIds.length, statusFrom: existing.status, statusTo: updated.status }, occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: updated }, ok: true };
      } catch (error) { return failure(error); }
    },

    async linkFinding(input: { findingId: string; responseId: string; scope: TenantScope }): Promise<Result<{ idempotent: boolean; row: SafetyChecklistResponseRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.responses.find((row) => row.id === input.responseId);
      if (!existing) return missing("Kontrol yanıtı");
      if (existing.response !== "FAIL") return invalid("Yalnız uygunsuz kontrol yanıtı bulguya bağlanabilir.");
      const findingId = input.findingId.trim();
      if (!findingId) return invalid("Bulgu zorunludur.");
      if (existing.findingId === findingId) return { data: { idempotent: true, row: existing }, ok: true };
      if (existing.findingId) return invalid("Kontrol yanıtı zaten başka bir bulguya bağlıdır.");
      const timestamp = now();
      const updated = await repository.updateResponse({ ...existing, findingId, updatedAt: timestamp, updatedBy: input.scope.userId });
      await audit(auditLogRepository, input.scope, {
        action: "mobile-safety-checklist.response.finding-link", entityId: updated.id, entityLabel: updated.id,
        entityType: "mobile-safety-checklist-response", metadata: { findingId, runId: updated.runId, templateItemId: updated.checklistItemId }, occurredAt: timestamp,
      });
      return { data: { idempotent: false, row: updated }, ok: true };
    },
  };
}

function scopeFields(scope: TenantScope) { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function audit(repository: AuditLogRepository | undefined, scope: TenantScope, input: Parameters<typeof createAuditLogEntry>[1]) { if (repository) await repository.record(createAuditLogEntry(scope, input)); }
function defaultCreateId(input: { kind: string; scope: TenantScope }) { return `${buildTenantScopeKey(input.scope)}::mobile-safety-checklist::${input.kind}::${Date.now()}-${Math.random()}`; }
function missing(label: string): Result<never> { return { errors: [`${label} aktif kapsamda bulunamadı.`], ok: false }; }
function invalid(message: string): Result<never> { return { errors: [message], ok: false }; }
function failure(error: unknown): Result<never> { return error instanceof MobileSafetyChecklistDomainError ? { errors: [error.message], ok: false } : { errors: ["Mobil İSG kontrol listesi işlemi tamamlanamadı."], ok: false }; }
