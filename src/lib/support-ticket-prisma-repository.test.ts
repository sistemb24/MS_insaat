import { describe, expect, it, vi } from "vitest";

import {
  createSupportTicketPrismaRepository,
  SupportTicketRepositoryError,
  type SupportTicketMessageRow,
  type SupportTicketPrismaClientLike,
  type SupportTicketRow,
} from "./support-ticket-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const timestamp = "2026-07-30T15:00:00.000Z";

function setup() {
  const supportTicket = delegate(ticketRecord());
  const supportTicketMessage = delegate(messageRecord());
  const prisma = { supportTicket, supportTicketMessage } as unknown as SupportTicketPrismaClientLike;
  return {
    repository: createSupportTicketPrismaRepository(prisma),
    supportTicket,
    supportTicketMessage,
  };
}

describe("support ticket Prisma repository", () => {
  it("keeps ticket lists in active scope and applies requester ownership outside admin view", async () => {
    const { repository, supportTicket } = setup();

    await expect(repository.listTickets({
      scope: defaultTenantScope,
      visibility: { mode: "own", requesterUserId: "viewer-1" },
    })).resolves.toEqual([
      expect.objectContaining({ requesterUserId: "viewer-1", status: "OPEN" }),
    ]);
    expect(supportTicket.findMany).toHaveBeenLastCalledWith({
      where: { ...scope(), requesterUserId: "viewer-1" },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });

    await repository.listTickets({
      scope: defaultTenantScope,
      visibility: { mode: "scope" },
    });
    expect(supportTicket.findMany).toHaveBeenLastCalledWith({
      where: scope(),
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
  });

  it("guards message reads with both message scope and parent ticket ownership", async () => {
    const { repository, supportTicketMessage } = setup();

    await expect(repository.listMessages({
      scope: defaultTenantScope,
      ticketId: "ticket-1",
      visibility: { mode: "own", requesterUserId: "viewer-1" },
    })).resolves.toEqual([
      expect.objectContaining({ authorUserId: "viewer-1", ticketId: "ticket-1" }),
    ]);
    expect(supportTicketMessage.findMany).toHaveBeenCalledWith({
      where: {
        ...scope(),
        ticket: { ...scope(), requesterUserId: "viewer-1" },
        ticketId: "ticket-1",
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });

  it("persists scoped ticket and append-only message rows with Date values", async () => {
    const { repository, supportTicket } = setup();
    const ticket = ticketRow();
    const message = messageRow();

    await expect(repository.createTicketWithInitialMessage({ message, ticket })).resolves.toEqual(ticket);
    expect(supportTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdAt: now(),
        lastMessageAt: now(),
        messages: {
          create: expect.objectContaining({
            authorUserId: "viewer-1",
            body: "Rapor ekranında filtre sonucu görünmüyor.",
            messageKey: "ticket-1::viewer-1::reply-1",
          }),
        },
        tenantId: defaultTenantScope.tenantId,
        ticketKey: "viewer-1::request-1",
        updatedAt: now(),
      }),
    });
    const nestedMessage = supportTicket.create.mock.calls[0]?.[0].data.messages.create;
    expect(nestedMessage).not.toHaveProperty("ticketId");
    expect(nestedMessage).not.toHaveProperty("tenantId");
    expect(nestedMessage).not.toHaveProperty("companyId");
    expect(nestedMessage).not.toHaveProperty("periodId");

    await expect(repository.createMessageAndTouchTicket({
      message,
      ticket,
      visibility: { mode: "own", requesterUserId: "viewer-1" },
    })).resolves.toEqual(message);
    expect(supportTicket.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        lastMessageAt: now(),
        messages: {
          create: expect.objectContaining({
            body: "Rapor ekranında filtre sonucu görünmüyor.",
            createdAt: now(),
            messageKey: "ticket-1::viewer-1::reply-1",
          }),
        },
      }),
      where: {
        id_tenantId_companyId_periodId: {
          ...scope(),
          id: "ticket-1",
        },
      },
    });
  });

  it("scopes idempotency lookup and ticket updates to tenant, company and period", async () => {
    const { repository, supportTicket } = setup();

    await repository.findTicketByKey({
      scope: defaultTenantScope,
      ticketKey: "viewer-1::request-1",
      visibility: { mode: "own", requesterUserId: "viewer-1" },
    });
    expect(supportTicket.findFirst).toHaveBeenLastCalledWith({
      where: {
        ...scope(),
        requesterUserId: "viewer-1",
        ticketKey: "viewer-1::request-1",
      },
    });

    supportTicket.findFirst.mockResolvedValueOnce({
      ...ticketRecord(),
      status: "IN_PROGRESS",
    });
    await expect(repository.updateTicket({
      ...ticketRow(),
      status: "IN_PROGRESS",
    })).resolves.toEqual(expect.objectContaining({ status: "IN_PROGRESS" }));
    expect(supportTicket.updateMany).toHaveBeenCalledWith({
      data: {
        lastMessageAt: now(),
        status: "IN_PROGRESS",
        updatedAt: now(),
        updatedBy: "viewer-1",
      },
      where: { ...scope(), id: "ticket-1" },
    });
  });

  it("fails closed when a ticket update misses the active scope and maps unknown values safely", async () => {
    const { repository, supportTicket } = setup();
    supportTicket.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.updateTicket(ticketRow()))
      .rejects.toBeInstanceOf(SupportTicketRepositoryError);

    await expect(repository.createTicketWithInitialMessage({
      message: { ...messageRow(), periodId: "other-period" },
      ticket: ticketRow(),
    })).rejects.toBeInstanceOf(SupportTicketRepositoryError);

    supportTicket.findMany.mockResolvedValueOnce([{
      ...ticketRecord(),
      priority: "URGENT",
      status: "UNKNOWN",
      type: "OTHER",
    }]);
    await expect(repository.listTickets({
      scope: defaultTenantScope,
      visibility: { mode: "scope" },
    })).resolves.toEqual([
      expect.objectContaining({
        priority: "NORMAL",
        status: "OPEN",
        type: "TECHNICAL",
      }),
    ]);
  });
});

function ticketRow(): SupportTicketRow {
  return {
    id: "ticket-1",
    ...scope(),
    requesterUserId: "viewer-1",
    ticketKey: "viewer-1::request-1",
    subject: "Rapor filtresi sorunu",
    type: "TECHNICAL",
    priority: "HIGH",
    status: "OPEN",
    lastMessageAt: timestamp,
    createdBy: "viewer-1",
    updatedBy: "viewer-1",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function messageRow(): SupportTicketMessageRow {
  return {
    id: "message-1",
    ...scope(),
    ticketId: "ticket-1",
    authorUserId: "viewer-1",
    messageKey: "ticket-1::viewer-1::reply-1",
    body: "Rapor ekranında filtre sonucu görünmüyor.",
    createdAt: timestamp,
  };
}

function ticketRecord() {
  const row = ticketRow();
  return {
    ...row,
    createdAt: now(),
    lastMessageAt: now(),
    updatedAt: now(),
  };
}

function messageRecord() {
  const row = messageRow();
  return { ...row, createdAt: now() };
}

function delegate<T>(row: T) {
  return {
    create: vi.fn().mockResolvedValue(row),
    findFirst: vi.fn().mockResolvedValue(row),
    findMany: vi.fn().mockResolvedValue([row]),
    update: vi.fn().mockResolvedValue(row),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
}

function scope() {
  return {
    tenantId: defaultTenantScope.tenantId,
    companyId: defaultTenantScope.companyId,
    periodId: defaultTenantScope.periodId,
  };
}
function now() { return new Date(timestamp); }
