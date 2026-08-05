import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  SupportTicketDomainError,
  assertSupportTicketTransition,
  createSupportTicketDraft,
  createSupportTicketMessageDraft,
  getSupportTicketPermission,
  getSupportTicketVisibility,
  normalizeSupportTicketStatus,
  type SupportTicketDraftInput,
  type SupportTicketStatus,
} from "./support-ticket";
import {
  SupportTicketRepositoryError,
  type SupportTicketMessageRow,
  type SupportTicketRepository,
  type SupportTicketRow,
} from "./support-ticket-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type SupportTicketReplyInput = {
  body: string;
  requestKey: string;
  ticketId: string;
};

export type SupportTicketService = ReturnType<typeof createSupportTicketService>;

export function createSupportTicketService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (input: { kind: "message" | "ticket"; scope: TenantScope }) => string;
  now: () => string;
  repository: SupportTicketRepository;
}) {
  function validateScope(scope: TenantScope): Result<null> {
    const errors = validateTenantScope(scope);
    return errors.length > 0 ? { errors, ok: false } : { data: null, ok: true };
  }

  return {
    async list(input: { scope: TenantScope }): Promise<Result<{ tickets: SupportTicketRow[] }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const visibility = getSupportTicketVisibility({
        actorUserId: input.scope.userId,
        role: input.scope.userRole,
      });
      return {
        data: { tickets: await repository.listTickets({ scope: input.scope, visibility }) },
        ok: true,
      };
    },

    async getThread(input: {
      scope: TenantScope;
      ticketId: string;
    }): Promise<Result<{ messages: SupportTicketMessageRow[]; ticket: SupportTicketRow }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const ticketId = normalizeIdentifier(input.ticketId);
      if (!ticketId) return invalid("Destek talebi zorunludur.");
      const visibility = getSupportTicketVisibility({
        actorUserId: input.scope.userId,
        role: input.scope.userRole,
      });
      const ticket = await repository.findTicket({ id: ticketId, scope: input.scope, visibility });
      if (!ticket) return missing();
      const messages = await repository.listMessages({
        scope: input.scope,
        ticketId: ticket.id,
        visibility,
      });
      return { data: { messages, ticket }, ok: true };
    },

    async createTicket(input: {
      scope: TenantScope;
      values: SupportTicketDraftInput;
    }): Promise<Result<{ idempotent: boolean; ticket: SupportTicketRow }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const permission = getSupportTicketPermission({
        actorUserId: input.scope.userId,
        operation: "create",
        role: input.scope.userRole,
      });
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createSupportTicketDraft({
          ...input.values,
          requesterUserId: input.scope.userId,
        });
        const visibility = getSupportTicketVisibility({
          actorUserId: input.scope.userId,
          role: input.scope.userRole,
        });
        const existing = await repository.findTicketByKey({
          scope: input.scope,
          ticketKey: draft.ticketKey,
          visibility,
        });
        if (existing) return { data: { idempotent: true, ticket: existing }, ok: true };

        const timestamp = now();
        const ticketId = createId({ kind: "ticket", scope: input.scope });
        const messageDraft = createSupportTicketMessageDraft({
          authorUserId: input.scope.userId,
          body: draft.initialMessage,
          requestKey: input.values.requestKey,
          ticketId,
        });
        const ticket: SupportTicketRow = {
          ...scopeFields(input.scope),
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: ticketId,
          lastMessageAt: timestamp,
          priority: draft.priority,
          requesterUserId: draft.requesterUserId,
          status: draft.status,
          subject: draft.subject,
          ticketKey: draft.ticketKey,
          type: draft.type,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        };
        const message: SupportTicketMessageRow = {
          ...scopeFields(input.scope),
          ...messageDraft,
          createdAt: timestamp,
          id: createId({ kind: "message", scope: input.scope }),
        };
        const created = await repository.createTicketWithInitialMessage({ message, ticket });
        await audit(auditLogRepository, input.scope, {
          action: "support-ticket.create",
          entityId: created.id,
          entityLabel: created.id,
          entityType: "support-ticket",
          metadata: {
            initialMessageCount: 1,
            priority: created.priority,
            statusTo: created.status,
            type: created.type,
          },
          occurredAt: timestamp,
        });
        return { data: { idempotent: false, ticket: created }, ok: true };
      } catch (error) {
        return failure(error);
      }
    },

    async reply(input: {
      scope: TenantScope;
      values: SupportTicketReplyInput;
    }): Promise<Result<{
      idempotent: boolean;
      message: SupportTicketMessageRow;
      ticket: SupportTicketRow;
    }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const ticketId = normalizeIdentifier(input.values.ticketId);
      if (!ticketId) return invalid("Destek talebi zorunludur.");
      const visibility = getSupportTicketVisibility({
        actorUserId: input.scope.userId,
        role: input.scope.userRole,
      });
      const ticket = await repository.findTicket({ id: ticketId, scope: input.scope, visibility });
      if (!ticket) return missing();
      const permission = getSupportTicketPermission({
        actorUserId: input.scope.userId,
        operation: "reply",
        requesterUserId: ticket.requesterUserId,
        role: input.scope.userRole,
        status: ticket.status,
      });
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createSupportTicketMessageDraft({
          authorUserId: input.scope.userId,
          body: input.values.body,
          requestKey: input.values.requestKey,
          ticketId: ticket.id,
        });
        const existing = await repository.findMessageByKey({
          messageKey: draft.messageKey,
          scope: input.scope,
          ticketId: ticket.id,
          visibility,
        });
        if (existing) {
          return { data: { idempotent: true, message: existing, ticket }, ok: true };
        }
        const timestamp = now();
        const updatedTicket: SupportTicketRow = {
          ...ticket,
          lastMessageAt: timestamp,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        };
        const message: SupportTicketMessageRow = {
          ...scopeFields(input.scope),
          ...draft,
          createdAt: timestamp,
          id: createId({ kind: "message", scope: input.scope }),
        };
        const created = await repository.createMessageAndTouchTicket({
          message,
          ticket: updatedTicket,
          visibility,
        });
        await audit(auditLogRepository, input.scope, {
          action: "support-ticket.reply",
          entityId: created.id,
          entityLabel: created.id,
          entityType: "support-ticket-message",
          metadata: {
            priority: ticket.priority,
            status: ticket.status,
            ticketId: ticket.id,
            type: ticket.type,
          },
          occurredAt: timestamp,
        });
        return {
          data: { idempotent: false, message: created, ticket: updatedTicket },
          ok: true,
        };
      } catch (error) {
        return failure(error);
      }
    },

    async transition(input: {
      scope: TenantScope;
      status: SupportTicketStatus;
      ticketId: string;
    }): Promise<Result<{ idempotent: boolean; ticket: SupportTicketRow }>> {
      const scopeResult = validateScope(input.scope);
      if (!scopeResult.ok) return scopeResult;
      const permission = getSupportTicketPermission({
        actorUserId: input.scope.userId,
        operation: "transition",
        role: input.scope.userRole,
      });
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const ticketId = normalizeIdentifier(input.ticketId);
        if (!ticketId) return invalid("Destek talebi zorunludur.");
        const status = normalizeSupportTicketStatus(input.status);
        const visibility = getSupportTicketVisibility({
          actorUserId: input.scope.userId,
          role: input.scope.userRole,
        });
        const existing = await repository.findTicket({
          id: ticketId,
          scope: input.scope,
          visibility,
        });
        if (!existing) return missing();
        if (existing.status === status) {
          return { data: { idempotent: true, ticket: existing }, ok: true };
        }
        assertSupportTicketTransition(existing.status, status);
        const timestamp = now();
        const updated = await repository.updateTicket({
          ...existing,
          status,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, {
          action: "support-ticket.transition",
          entityId: updated.id,
          entityLabel: updated.id,
          entityType: "support-ticket",
          metadata: {
            priority: updated.priority,
            statusFrom: existing.status,
            statusTo: updated.status,
            type: updated.type,
          },
          occurredAt: timestamp,
        });
        return { data: { idempotent: false, ticket: updated }, ok: true };
      } catch (error) {
        return failure(error);
      }
    },
  };
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

function defaultCreateId(input: {
  kind: "message" | "ticket";
  scope: TenantScope;
}) {
  return `${buildTenantScopeKey(input.scope)}::support-ticket::${input.kind}::${Date.now()}-${Math.random()}`;
}

function normalizeIdentifier(value: unknown) {
  return String(value ?? "").trim();
}
function missing(): Result<never> {
  return { errors: ["Destek talebi aktif kapsamda bulunamadı."], ok: false };
}
function invalid(message: string): Result<never> {
  return { errors: [message], ok: false };
}
function failure(error: unknown): Result<never> {
  return error instanceof SupportTicketDomainError || error instanceof SupportTicketRepositoryError
    ? { errors: [error.message], ok: false }
    : { errors: ["Destek talebi işlemi tamamlanamadı."], ok: false };
}
