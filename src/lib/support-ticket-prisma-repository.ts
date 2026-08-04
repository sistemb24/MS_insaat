import type {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketType,
  SupportTicketVisibility,
} from "./support-ticket";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type TicketWhere = ScopeFields & {
  id?: string;
  requesterUserId?: string;
  ticketKey?: string;
};
type MessageWhere = ScopeFields & {
  messageKey?: string;
  ticket?: TicketWhere;
  ticketId?: string;
};
type Delegate<T, TWhere> = {
  create(input: { data: unknown }): Promise<T>;
  findFirst(input: { where: TWhere }): Promise<T | null>;
  findMany(input: { orderBy: unknown; where: TWhere }): Promise<T[]>;
  update(input: { data: unknown; where: unknown }): Promise<T>;
  updateMany(input: { data: unknown; where: TWhere }): Promise<{ count: number }>;
};

export type SupportTicketRow = ScopeFields & {
  createdAt: string;
  createdBy: string;
  id: string;
  lastMessageAt: string;
  priority: SupportTicketPriority;
  requesterUserId: string;
  status: SupportTicketStatus;
  subject: string;
  ticketKey: string;
  type: SupportTicketType;
  updatedAt: string;
  updatedBy: string;
};

export type SupportTicketMessageRow = ScopeFields & {
  authorUserId: string;
  body: string;
  createdAt: string;
  id: string;
  messageKey: string;
  ticketId: string;
};

type TicketRecord = Omit<
  SupportTicketRow,
  "createdAt" | "lastMessageAt" | "priority" | "status" | "type" | "updatedAt"
> & {
  createdAt: DateLike;
  lastMessageAt: DateLike;
  priority: string;
  status: string;
  type: string;
  updatedAt: DateLike;
};
type MessageRecord = Omit<SupportTicketMessageRow, "createdAt"> & {
  createdAt: DateLike;
};

export type SupportTicketPrismaClientLike = {
  supportTicket: Delegate<TicketRecord, TicketWhere>;
  supportTicketMessage: Delegate<MessageRecord, MessageWhere>;
};

export type SupportTicketRepository = {
  createMessageAndTouchTicket(input: {
    message: SupportTicketMessageRow;
    ticket: SupportTicketRow;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketMessageRow>;
  createTicketWithInitialMessage(input: {
    message: SupportTicketMessageRow;
    ticket: SupportTicketRow;
  }): Promise<SupportTicketRow>;
  findMessageByKey(input: {
    messageKey: string;
    scope: TenantScope;
    ticketId: string;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketMessageRow | null>;
  findTicket(input: {
    id: string;
    scope: TenantScope;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketRow | null>;
  findTicketByKey(input: {
    scope: TenantScope;
    ticketKey: string;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketRow | null>;
  listMessages(input: {
    scope: TenantScope;
    ticketId: string;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketMessageRow[]>;
  listTickets(input: {
    scope: TenantScope;
    visibility: SupportTicketVisibility;
  }): Promise<SupportTicketRow[]>;
  updateTicket(row: SupportTicketRow): Promise<SupportTicketRow>;
};

export class SupportTicketRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupportTicketRepositoryError";
  }
}

export function createSupportTicketPrismaRepository(
  prisma: SupportTicketPrismaClientLike,
): SupportTicketRepository {
  return {
    async createMessageAndTouchTicket({ message, ticket, visibility }) {
      assertMessageBelongsToTicket(message, ticket);
      await prisma.supportTicket.update({
        data: {
          ...ticketUpdateData(ticket),
          messages: { create: nestedMessageData(message) },
        },
        where: {
          id_tenantId_companyId_periodId: {
            ...scopeFields(ticket),
            id: ticket.id,
          },
        },
      });
      const created = await prisma.supportTicketMessage.findFirst({
        where: messageWhere({
          messageKey: message.messageKey,
          scope: ticket,
          ticketId: ticket.id,
          visibility,
        }),
      });
      if (!created) {
        throw new SupportTicketRepositoryError(
          "Eklenen destek mesajı aktif kapsamda yeniden okunamadı.",
        );
      }
      return messageFromRecord(created);
    },
    async createTicketWithInitialMessage({ message, ticket }) {
      assertMessageBelongsToTicket(message, ticket);
      return ticketFromRecord(await prisma.supportTicket.create({
        data: {
          ...ticketData(ticket),
          messages: { create: nestedMessageData(message) },
        },
      }));
    },
    async findMessageByKey({ messageKey, scope, ticketId, visibility }) {
      const record = await prisma.supportTicketMessage.findFirst({
        where: messageWhere({ messageKey, scope, ticketId, visibility }),
      });
      return record ? messageFromRecord(record) : null;
    },
    async findTicket({ id, scope, visibility }) {
      const record = await prisma.supportTicket.findFirst({
        where: ticketWhere({ id, scope, visibility }),
      });
      return record ? ticketFromRecord(record) : null;
    },
    async findTicketByKey({ scope, ticketKey, visibility }) {
      const record = await prisma.supportTicket.findFirst({
        where: ticketWhere({ scope, ticketKey, visibility }),
      });
      return record ? ticketFromRecord(record) : null;
    },
    async listMessages({ scope, ticketId, visibility }) {
      const records = await prisma.supportTicketMessage.findMany({
        where: messageWhere({ scope, ticketId, visibility }),
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      return records.map(messageFromRecord);
    },
    async listTickets({ scope, visibility }) {
      const records = await prisma.supportTicket.findMany({
        where: ticketWhere({ scope, visibility }),
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      });
      return records.map(ticketFromRecord);
    },
    async updateTicket(row) {
      const where = { ...scopeFields(row), id: row.id };
      const result = await prisma.supportTicket.updateMany({
        data: ticketUpdateData(row),
        where,
      });
      if (result.count !== 1) {
        throw new SupportTicketRepositoryError(
          "Destek talebi aktif tenant, firma ve dönem kapsamında bulunamadı.",
        );
      }
      const updated = await prisma.supportTicket.findFirst({ where });
      if (!updated) {
        throw new SupportTicketRepositoryError(
          "Güncellenen destek talebi aktif kapsamda yeniden okunamadı.",
        );
      }
      return ticketFromRecord(updated);
    },
  };
}

function ticketWhere(input: {
  id?: string;
  scope: TenantScope;
  ticketKey?: string;
  visibility: SupportTicketVisibility;
}): TicketWhere {
  return {
    ...scopedWhere(input.scope),
    ...(input.id ? { id: input.id } : {}),
    ...(input.ticketKey ? { ticketKey: input.ticketKey } : {}),
    ...(input.visibility.mode === "own"
      ? { requesterUserId: input.visibility.requesterUserId }
      : {}),
  };
}

function messageWhere(input: {
  messageKey?: string;
  scope: ScopeFields;
  ticketId: string;
  visibility: SupportTicketVisibility;
}): MessageWhere {
  const scope = scopedWhere(input.scope);
  return {
    ...scope,
    ...(input.messageKey ? { messageKey: input.messageKey } : {}),
    ticket: {
      ...scope,
      ...(input.visibility.mode === "own"
        ? { requesterUserId: input.visibility.requesterUserId }
        : {}),
    },
    ticketId: input.ticketId,
  };
}

function scopedWhere(scope: ScopeFields): ScopeFields {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

function ticketData(row: SupportTicketRow) {
  return {
    ...scopeFields(row),
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    lastMessageAt: dateTime(row.lastMessageAt),
    priority: row.priority,
    requesterUserId: row.requesterUserId,
    status: row.status,
    subject: row.subject,
    ticketKey: row.ticketKey,
    type: row.type,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function nestedMessageData(row: SupportTicketMessageRow) {
  return {
    authorUserId: row.authorUserId,
    body: row.body,
    createdAt: dateTime(row.createdAt),
    id: row.id,
    messageKey: row.messageKey,
  };
}

function ticketUpdateData(row: SupportTicketRow) {
  return {
    lastMessageAt: dateTime(row.lastMessageAt),
    status: row.status,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function assertMessageBelongsToTicket(
  message: SupportTicketMessageRow,
  ticket: SupportTicketRow,
) {
  const sameScope = message.tenantId === ticket.tenantId
    && message.companyId === ticket.companyId
    && message.periodId === ticket.periodId;
  if (!sameScope || message.ticketId !== ticket.id) {
    throw new SupportTicketRepositoryError(
      "İlk destek mesajı talep ile aynı tenant, firma, dönem ve talep kimliğini taşımalıdır.",
    );
  }
}

function ticketFromRecord(row: TicketRecord): SupportTicketRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    lastMessageAt: iso(row.lastMessageAt),
    priority: ticketPriority(row.priority),
    status: ticketStatus(row.status),
    type: ticketType(row.type),
    updatedAt: iso(row.updatedAt),
  };
}

function messageFromRecord(row: MessageRecord): SupportTicketMessageRow {
  return { ...row, createdAt: iso(row.createdAt) };
}

function scopeFields(row: ScopeFields) {
  return { companyId: row.companyId, periodId: row.periodId, tenantId: row.tenantId };
}
function dateTime(value: string) { return new Date(value); }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function ticketPriority(value: string): SupportTicketPriority {
  return value === "LOW" || value === "HIGH" ? value : "NORMAL";
}
function ticketStatus(value: string): SupportTicketStatus {
  return value === "IN_PROGRESS" || value === "RESOLVED" || value === "CLOSED" ? value : "OPEN";
}
function ticketType(value: string): SupportTicketType {
  return value === "ACCOUNT" || value === "BILLING" || value === "SUGGESTION"
    ? value
    : "TECHNICAL";
}
