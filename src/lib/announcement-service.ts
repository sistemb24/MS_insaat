import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  AnnouncementDomainError,
  assertAnnouncementTransition,
  createAnnouncementDraft,
  getAnnouncementMutationRequestKey,
  getAnnouncementPermission,
  getAnnouncementVisibility,
  normalizeAnnouncementUpdate,
  type AnnouncementDraftInput,
  type AnnouncementStatus,
  type AnnouncementUpdateInput,
} from "./announcement";
import {
  AnnouncementRepositoryError,
  type AnnouncementRepository,
  type AnnouncementRow,
} from "./announcement-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type AnnouncementService = ReturnType<typeof createAnnouncementService>;

export function createAnnouncementService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (scope: TenantScope) => string;
  now: () => string;
  repository: AnnouncementRepository;
}) {
  function validateScope(scope: TenantScope): Result<null> {
    const errors = validateTenantScope(scope);
    return errors.length > 0 ? { errors, ok: false } : { data: null, ok: true };
  }

  function canManage(scope: TenantScope, operation: "archive" | "create" | "publish" | "update") {
    return getAnnouncementPermission({
      operation,
      periodClosed: Boolean(scope.periodClosed),
      role: scope.userRole,
    });
  }

  return {
    async list(input: { scope: TenantScope }): Promise<Result<{ announcements: AnnouncementRow[] }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      return {
        data: {
          announcements: await repository.list({
            scope: input.scope,
            visibility: getAnnouncementVisibility(input.scope.userRole),
          }),
        },
        ok: true,
      };
    },

    async get(input: {
      announcementId: string;
      scope: TenantScope;
    }): Promise<Result<{ announcement: AnnouncementRow }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const announcementId = normalizeIdentifier(input.announcementId);
      if (!announcementId) return invalid("Duyuru zorunludur.");
      const announcement = await repository.findById({
        id: announcementId,
        scope: input.scope,
        visibility: getAnnouncementVisibility(input.scope.userRole),
      });
      return announcement
        ? { data: { announcement }, ok: true }
        : missing();
    },

    async create(input: {
      scope: TenantScope;
      values: AnnouncementDraftInput;
    }): Promise<Result<{ announcement: AnnouncementRow; idempotent: boolean }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const permission = canManage(input.scope, "create");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createAnnouncementDraft({
          ...input.values,
          actorUserId: input.scope.userId,
        });
        const existing = await repository.findByCreateKey({
          announcementKey: draft.announcementKey,
          scope: input.scope,
          visibility: { mode: "all" },
        });
        if (existing) {
          return { data: { announcement: existing, idempotent: true }, ok: true };
        }
        const timestamp = now();
        const created = await repository.create({
          ...scopeFields(input.scope),
          ...draft,
          archiveRequestKey: null,
          archivedAt: null,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: createId(input.scope),
          lastUpdateKey: null,
          publishRequestKey: null,
          publishedAt: null,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, {
          action: "announcement.create",
          entityId: created.id,
          entityLabel: created.id,
          entityType: "announcement",
          metadata: {
            category: created.category,
            priority: created.priority,
            revisionTo: created.revisionNo,
            statusTo: created.status,
          },
          occurredAt: timestamp,
        });
        return { data: { announcement: created, idempotent: false }, ok: true };
      } catch (error) {
        return failure(error);
      }
    },

    async updateDraft(input: {
      scope: TenantScope;
      values: AnnouncementUpdateInput;
    }): Promise<Result<{ announcement: AnnouncementRow; idempotent: boolean }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const permission = canManage(input.scope, "update");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeAnnouncementUpdate(input.values);
        const existing = await repository.findById({
          id: values.announcementId,
          scope: input.scope,
          visibility: { mode: "all" },
        });
        if (!existing) return missing();
        const mutationKey = getAnnouncementMutationRequestKey({
          actorUserId: input.scope.userId,
          announcementId: existing.id,
          operation: "update",
          requestKey: values.mutationKey,
        });
        if (existing.lastUpdateKey === mutationKey) {
          return { data: { announcement: existing, idempotent: true }, ok: true };
        }
        if (existing.status !== "DRAFT") {
          return invalid("Yalnız taslak duyuru düzenlenebilir.");
        }
        if (existing.revisionNo !== values.expectedRevisionNo) {
          return invalid("Duyuru başka bir işlemle güncellendi; güncel kaydı yeniden açın.");
        }
        const timestamp = now();
        const updated = await repository.updateDraft({
          expectedRevisionNo: existing.revisionNo,
          row: {
            ...existing,
            category: values.category,
            content: values.content,
            lastUpdateKey: mutationKey,
            priority: values.priority,
            revisionNo: existing.revisionNo + 1,
            summary: values.summary,
            title: values.title,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
        });
        await audit(auditLogRepository, input.scope, {
          action: "announcement.update",
          entityId: updated.id,
          entityLabel: updated.id,
          entityType: "announcement",
          metadata: {
            category: updated.category,
            priority: updated.priority,
            revisionFrom: existing.revisionNo,
            revisionTo: updated.revisionNo,
            status: updated.status,
          },
          occurredAt: timestamp,
        });
        return { data: { announcement: updated, idempotent: false }, ok: true };
      } catch (error) {
        return failure(error);
      }
    },

    async publish(input: {
      announcementId: string;
      requestKey: string;
      scope: TenantScope;
    }) {
      return transition({
        announcementId: input.announcementId,
        operation: "publish",
        requestKey: input.requestKey,
        scope: input.scope,
        status: "PUBLISHED",
      });
    },

    async archive(input: {
      announcementId: string;
      requestKey: string;
      scope: TenantScope;
    }) {
      return transition({
        announcementId: input.announcementId,
        operation: "archive",
        requestKey: input.requestKey,
        scope: input.scope,
        status: "ARCHIVED",
      });
    },
  };

  async function transition(input: {
    announcementId: string;
    operation: "archive" | "publish";
    requestKey: string;
    scope: TenantScope;
    status: Extract<AnnouncementStatus, "ARCHIVED" | "PUBLISHED">;
  }): Promise<Result<{ announcement: AnnouncementRow; idempotent: boolean }>> {
    const scopeResult = validateScope(input.scope);
    if (!scopeResult.ok) return scopeResult;
    const permission = canManage(input.scope, input.operation);
    if (!permission.allowed) return invalid(permission.reason);
    try {
      const announcementId = normalizeIdentifier(input.announcementId);
      if (!announcementId) return invalid("Duyuru zorunludur.");
      const existing = await repository.findById({
        id: announcementId,
        scope: input.scope,
        visibility: { mode: "all" },
      });
      if (!existing) return missing();
      const mutationKey = getAnnouncementMutationRequestKey({
        actorUserId: input.scope.userId,
        announcementId: existing.id,
        operation: input.operation,
        requestKey: input.requestKey,
      });
      const storedKey = input.operation === "publish"
        ? existing.publishRequestKey
        : existing.archiveRequestKey;
      if (storedKey === mutationKey) {
        return { data: { announcement: existing, idempotent: true }, ok: true };
      }
      assertAnnouncementTransition(existing.status, input.status);
      const timestamp = now();
      const updated = await repository.transition({
        expectedRevisionNo: existing.revisionNo,
        fromStatus: existing.status,
        row: {
          ...existing,
          ...(input.operation === "publish"
            ? { publishRequestKey: mutationKey, publishedAt: timestamp }
            : { archiveRequestKey: mutationKey, archivedAt: timestamp }),
          revisionNo: existing.revisionNo + 1,
          status: input.status,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        },
      });
      await audit(auditLogRepository, input.scope, {
        action: `announcement.${input.operation}`,
        entityId: updated.id,
        entityLabel: updated.id,
        entityType: "announcement",
        metadata: {
          category: updated.category,
          priority: updated.priority,
          revisionFrom: existing.revisionNo,
          revisionTo: updated.revisionNo,
          statusFrom: existing.status,
          statusTo: updated.status,
        },
        occurredAt: timestamp,
      });
      return { data: { announcement: updated, idempotent: false }, ok: true };
    } catch (error) {
      return failure(error);
    }
  }
}

function scopeFields(scope: TenantScope) {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

async function audit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  input: Parameters<typeof createAuditLogEntry>[1],
) {
  if (repository) await repository.record(createAuditLogEntry(scope, input));
}

function defaultCreateId(scope: TenantScope) {
  return `${buildTenantScopeKey(scope)}::announcement::${Date.now()}-${Math.random()}`;
}
function normalizeIdentifier(value: unknown) { return String(value ?? "").trim(); }
function missing(): Result<never> {
  return { errors: ["Duyuru aktif kapsamda bulunamadı."], ok: false };
}
function invalid(message: string): Result<never> { return { errors: [message], ok: false }; }
function failure(error: unknown): Result<never> {
  return error instanceof AnnouncementDomainError || error instanceof AnnouncementRepositoryError
    ? { errors: [error.message], ok: false }
    : { errors: ["Bilgi Merkezi işlemi tamamlanamadı."], ok: false };
}
