import { describe, expect, it, vi } from "vitest";

import { createSupportTicketService } from "./support-ticket-service";
import type {
  SupportTicketMessageRow,
  SupportTicketRepository,
  SupportTicketRow,
} from "./support-ticket-prisma-repository";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

const timestamp = "2026-07-30T16:00:00.000Z";

function setup(input: {
  messages?: SupportTicketMessageRow[];
  tickets?: SupportTicketRow[];
} = {}) {
  const messages = [...(input.messages ?? [])];
  let tickets = [...(input.tickets ?? [])];
  const repository: SupportTicketRepository = {
    createMessageAndTouchTicket: vi.fn(async ({ message, ticket }) => {
      messages.push(message);
      tickets = tickets.map((row) => row.id === ticket.id ? ticket : row);
      return message;
    }),
    createTicketWithInitialMessage: vi.fn(async ({ message, ticket }) => {
      messages.push(message);
      tickets.push(ticket);
      return ticket;
    }),
    findMessageByKey: vi.fn(async ({ messageKey, scope, ticketId, visibility }) =>
      messages.find((row) =>
        inScope(row, scope)
        && row.ticketId === ticketId
        && row.messageKey === messageKey
        && ticketVisible(tickets.find((ticket) => ticket.id === row.ticketId), visibility)
      ) ?? null),
    findTicket: vi.fn(async ({ id, scope, visibility }) =>
      tickets.find((row) => row.id === id && inScope(row, scope) && ticketVisible(row, visibility))
      ?? null),
    findTicketByKey: vi.fn(async ({ scope, ticketKey, visibility }) =>
      tickets.find((row) =>
        row.ticketKey === ticketKey && inScope(row, scope) && ticketVisible(row, visibility)
      ) ?? null),
    listMessages: vi.fn(async ({ scope, ticketId, visibility }) =>
      messages.filter((row) =>
        inScope(row, scope)
        && row.ticketId === ticketId
        && ticketVisible(tickets.find((ticket) => ticket.id === row.ticketId), visibility))),
    listTickets: vi.fn(async ({ scope, visibility }) =>
      tickets.filter((row) => inScope(row, scope) && ticketVisible(row, visibility))),
    updateTicket: vi.fn(async (ticket) => {
      tickets = tickets.map((row) => row.id === ticket.id ? ticket : row);
      return ticket;
    }),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = createSupportTicketService({
    auditLogRepository: audit,
    createId: ({ kind }) => kind === "ticket" ? "ticket-created" : "message-created",
    now: () => timestamp,
    repository,
  });
  return { audit, repository, service };
}

describe("support ticket service", () => {
  it("lets a viewer create a scoped ticket with one initial message and content-free audit", async () => {
    const { audit, repository, service } = setup();
    const result = await service.createTicket({
      scope: viewerScope,
      values: {
        initialMessage: "Rapor ekranında müşteri bakiyesi görünmüyor.",
        priority: "HIGH",
        requestKey: "request-create-1",
        requesterUserId: "client-supplied-user",
        subject: "Gizli müşteri bakiyesi",
        type: "TECHNICAL",
      },
    });

    expect(result).toEqual({
      data: {
        idempotent: false,
        ticket: expect.objectContaining({
          id: "ticket-created",
          requesterUserId: viewerScope.userId,
          status: "OPEN",
        }),
      },
      ok: true,
    });
    expect(repository.createTicketWithInitialMessage).toHaveBeenCalledWith({
      message: expect.objectContaining({
        authorUserId: viewerScope.userId,
        body: "Rapor ekranında müşteri bakiyesi görünmüyor.",
        ticketId: "ticket-created",
      }),
      ticket: expect.objectContaining({
        requesterUserId: viewerScope.userId,
        subject: "Gizli müşteri bakiyesi",
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "support-ticket.create",
      entityLabel: "ticket-created",
      metadata: {
        initialMessageCount: 1,
        priority: "HIGH",
        statusTo: "OPEN",
        type: "TECHNICAL",
      },
    }));
    const auditJson = JSON.stringify(
      (audit.record.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(auditJson).not.toContain("Gizli müşteri bakiyesi");
    expect(auditJson).not.toContain("Rapor ekranında");
    expect(auditJson).not.toContain("request-create-1");
  });

  it("returns the first ticket for a repeated request key without another write or audit", async () => {
    const { audit, repository, service } = setup();
    const values = {
      initialMessage: "İlk mesaj",
      priority: "NORMAL" as const,
      requestKey: "same-request",
      requesterUserId: viewerScope.userId,
      subject: "Tek talep",
      type: "ACCOUNT" as const,
    };

    const first = await service.createTicket({ scope: viewerScope, values });
    const second = await service.createTicket({ scope: viewerScope, values });

    expect(first).toEqual(expect.objectContaining({ data: expect.objectContaining({ idempotent: false }) }));
    expect(second).toEqual(expect.objectContaining({ data: expect.objectContaining({ idempotent: true }) }));
    expect(repository.createTicketWithInitialMessage).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it("keeps requester lists and threads owner-only while admin can read the full scope", async () => {
    const own = ticketRow({ id: "ticket-own", requesterUserId: viewerScope.userId });
    const foreign = ticketRow({ id: "ticket-foreign", requesterUserId: "other-user" });
    const { repository, service } = setup({
      messages: [
        messageRow({ id: "message-own", ticketId: own.id }),
        messageRow({ id: "message-foreign", ticketId: foreign.id }),
      ],
      tickets: [own, foreign],
    });

    await expect(service.list({ scope: viewerScope })).resolves.toEqual({
      data: { tickets: [own] },
      ok: true,
    });
    await expect(service.getThread({
      scope: viewerScope,
      ticketId: foreign.id,
    })).resolves.toEqual({
      errors: ["Destek talebi aktif kapsamda bulunamadı."],
      ok: false,
    });
    await expect(service.list({ scope: adminScope })).resolves.toEqual({
      data: { tickets: [own, foreign] },
      ok: true,
    });
    expect(repository.listMessages).not.toHaveBeenCalledWith(expect.objectContaining({
      ticketId: foreign.id,
      visibility: { mode: "own", requesterUserId: viewerScope.userId },
    }));
  });

  it("adds one owner reply atomically, updates last-message time, and audits no body or key", async () => {
    const ticket = ticketRow({ requesterUserId: viewerScope.userId });
    const { audit, repository, service } = setup({ tickets: [ticket] });
    const values = { body: "Abonelik numaram bu mesajda gizlidir.", requestKey: "reply-key-1", ticketId: ticket.id };

    const first = await service.reply({ scope: viewerScope, values });
    const retry = await service.reply({ scope: viewerScope, values });

    expect(first).toEqual(expect.objectContaining({
      data: {
        idempotent: false,
        message: expect.objectContaining({ body: values.body }),
        ticket: expect.objectContaining({ lastMessageAt: timestamp }),
      },
      ok: true,
    }));
    expect(retry).toEqual(expect.objectContaining({ data: expect.objectContaining({ idempotent: true }) }));
    expect(repository.createMessageAndTouchTicket).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
    const auditJson = JSON.stringify(
      (audit.record.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(auditJson).not.toContain(values.body);
    expect(auditJson).not.toContain(values.requestKey);
  });

  it("rejects foreign-owner and closed-ticket replies before writes or audit", async () => {
    const foreign = ticketRow({ requesterUserId: "other-user" });
    const foreignSetup = setup({ tickets: [foreign] });
    await expect(foreignSetup.service.reply({
      scope: viewerScope,
      values: { body: "Yanıt", requestKey: "reply-1", ticketId: foreign.id },
    })).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(foreignSetup.repository.createMessageAndTouchTicket).not.toHaveBeenCalled();

    const closed = ticketRow({ requesterUserId: viewerScope.userId, status: "CLOSED" });
    const closedSetup = setup({ tickets: [closed] });
    await expect(closedSetup.service.reply({
      scope: viewerScope,
      values: { body: "Yanıt", requestKey: "reply-2", ticketId: closed.id },
    })).resolves.toEqual({
      errors: ["Kapatılmış destek talebine mesaj eklenemez."],
      ok: false,
    });
    expect(closedSetup.repository.createMessageAndTouchTicket).not.toHaveBeenCalled();
    expect(closedSetup.audit.record).not.toHaveBeenCalled();
  });

  it("reserves adjacent status transitions for admin and keeps retries idempotent", async () => {
    const ticket = ticketRow();
    const denied = setup({ tickets: [ticket] });
    await expect(denied.service.transition({
      scope: viewerScope,
      status: "IN_PROGRESS",
      ticketId: ticket.id,
    })).resolves.toEqual({
      errors: ["Destek talebi durumunu yalnız yönetici değiştirebilir."],
      ok: false,
    });
    expect(denied.repository.findTicket).not.toHaveBeenCalled();

    const allowed = setup({ tickets: [ticket] });
    const first = await allowed.service.transition({
      scope: adminScope,
      status: "IN_PROGRESS",
      ticketId: ticket.id,
    });
    const retry = await allowed.service.transition({
      scope: adminScope,
      status: "IN_PROGRESS",
      ticketId: ticket.id,
    });
    expect(first).toEqual(expect.objectContaining({
      data: { idempotent: false, ticket: expect.objectContaining({ status: "IN_PROGRESS" }) },
      ok: true,
    }));
    expect(retry).toEqual(expect.objectContaining({ data: expect.objectContaining({ idempotent: true }) }));
    expect(allowed.repository.updateTicket).toHaveBeenCalledTimes(1);
    expect(allowed.audit.record).toHaveBeenCalledTimes(1);
    expect(allowed.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "support-ticket.transition",
      metadata: {
        priority: "NORMAL",
        statusFrom: "OPEN",
        statusTo: "IN_PROGRESS",
        type: "TECHNICAL",
      },
    }));

    const skipped = setup({ tickets: [ticket] });
    await expect(skipped.service.transition({
      scope: adminScope,
      status: "RESOLVED",
      ticketId: ticket.id,
    })).resolves.toEqual(expect.objectContaining({ ok: false }));
    expect(skipped.repository.updateTicket).not.toHaveBeenCalled();
  });
});

const viewerScope: TenantScope = {
  ...defaultTenantScope,
  userId: "viewer-1",
  userName: "Görüntüleyici",
  userRole: "viewer",
};
const adminScope: TenantScope = {
  ...defaultTenantScope,
  userId: "admin-1",
  userName: "Yönetici",
  userRole: "admin",
};

function ticketRow(values: Partial<SupportTicketRow> = {}): SupportTicketRow {
  return {
    id: "ticket-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    requesterUserId: viewerScope.userId,
    ticketKey: "viewer-1::request-1",
    subject: "Destek konusu",
    type: "TECHNICAL",
    priority: "NORMAL",
    status: "OPEN",
    lastMessageAt: timestamp,
    createdBy: viewerScope.userId,
    updatedBy: viewerScope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...values,
  };
}

function messageRow(values: Partial<SupportTicketMessageRow> = {}): SupportTicketMessageRow {
  return {
    id: "message-1",
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
    ticketId: "ticket-1",
    authorUserId: viewerScope.userId,
    messageKey: "ticket-1::viewer-1::reply-1",
    body: "Mesaj",
    createdAt: timestamp,
    ...values,
  };
}

function inScope(
  row: { companyId: string; periodId: string; tenantId: string },
  scope: TenantScope,
) {
  return row.tenantId === scope.tenantId
    && row.companyId === scope.companyId
    && row.periodId === scope.periodId;
}

function ticketVisible(
  row: SupportTicketRow | undefined,
  visibility: { mode: "scope" } | { mode: "own"; requesterUserId: string },
) {
  return Boolean(row)
    && (visibility.mode === "scope" || row?.requesterUserId === visibility.requesterUserId);
}
