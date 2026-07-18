import type { TenantScope } from "./tenant-scope";

export type AuditLogAction =
  | "purchase-invoice.create"
  | "purchase-invoice.update"
  | "purchase-invoice.cancel"
  | "purchase-invoice.post"
  | (string & {});

export type AuditLogEntryInput = {
  tenantId: string;
  companyId: string;
  periodId: string;
  actorUserId: string;
  action: AuditLogAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type AuditLogEntry = AuditLogEntryInput & {
  id: string;
  createdAt: string;
};

export type AuditLogListByEntityTypeInput = {
  scope: TenantScope;
  entityType: string;
  limit?: number;
};

export type AuditLogRepository = {
  record(input: AuditLogEntryInput): Promise<void>;
};

export type AuditLogReadRepository = {
  listByEntityType(input: AuditLogListByEntityTypeInput): Promise<AuditLogEntry[]>;
};

export function createAuditLogEntry(
  scope: TenantScope,
  input: Omit<
    AuditLogEntryInput,
    "tenantId" | "companyId" | "periodId" | "actorUserId"
  >,
): AuditLogEntryInput {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    actorUserId: scope.userId,
    ...input,
  };
}

