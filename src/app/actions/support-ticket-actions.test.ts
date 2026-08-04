import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditRecord = vi.fn();
  const ensureScope = vi.fn();
  const revalidatePath = vi.fn();
  const sessionState = vi.fn();
  const repository = {
    createMessageAndTouchTicket: vi.fn(async ({ message }) => message),
    createTicketWithInitialMessage: vi.fn(async ({ ticket }) => ticket),
    findMessageByKey: vi.fn(),
    findTicket: vi.fn(),
    findTicketByKey: vi.fn(),
    listMessages: vi.fn(),
    listTickets: vi.fn(),
    updateTicket: vi.fn(async (ticket) => ticket),
  };
  return {
    auditRecord,
    ensureScope,
    prisma: {},
    repository,
    revalidatePath,
    sessionState,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/server-active-scope", () => ({
  requireActiveSessionState: mocks.sessionState,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: mocks.auditRecord }),
}));
vi.mock("@/lib/support-ticket-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/support-ticket-prisma-repository")
  >("@/lib/support-ticket-prisma-repository");
  return {
    ...actual,
    createSupportTicketPrismaRepository: () => mocks.repository,
  };
});

import {
  createSupportTicketAction,
  getSupportTicketThreadAction,
  listSupportTicketsAction,
  replySupportTicketAction,
  transitionSupportTicketAction,
} from "./support-ticket-actions";

const activeScope = {
  tenantId: "tenant-support",
  tenantName: "Tenant",
  companyId: "company-support",
  companyName: "Şirket",
  periodId: "period-support",
  periodLabel: "2026",
  userId: "viewer-support",
  userName: "Destek Kullanıcısı",
  userRole: "viewer" as const,
  licenseLabel: "Kurumsal",
  periodClosed: true,
};

describe("support ticket actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope: activeScope });
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.repository.findMessageByKey.mockResolvedValue(null);
    mocks.repository.findTicket.mockResolvedValue(null);
    mocks.repository.findTicketByKey.mockResolvedValue(null);
    mocks.repository.listMessages.mockResolvedValue([]);
    mocks.repository.listTickets.mockResolvedValue([]);
  });

  it("re-resolves an authenticated scope and lets viewer create support in a closed period", async () => {
    const result = await createSupportTicketAction({
      initialMessage: "Gizli hesap ayrıntısı mesajı",
      priority: "HIGH",
      requestKey: "create-request-1",
      subject: "Gizli hesap konusu",
      type: "ACCOUNT",
    });

    expect(result).toEqual(expect.objectContaining({
      data: {
        idempotent: false,
        ticket: expect.objectContaining({
          requesterUserId: activeScope.userId,
          status: "OPEN",
        }),
      },
      ok: true,
    }));
    expect(mocks.sessionState).toHaveBeenCalledTimes(1);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.repository.createTicketWithInitialMessage).toHaveBeenCalledWith({
      message: expect.objectContaining({ authorUserId: activeScope.userId }),
      ticket: expect.objectContaining({ requesterUserId: activeScope.userId }),
    });
    const auditJson = JSON.stringify(
      (mocks.auditRecord.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(auditJson).not.toContain("Gizli hesap");
    expect(auditJson).not.toContain("create-request-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/destek-merkezi");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  it("passes owner visibility to list and thread reads", async () => {
    await expect(listSupportTicketsAction()).resolves.toEqual({
      data: { tickets: [] },
      ok: true,
    });
    expect(mocks.repository.listTickets).toHaveBeenCalledWith({
      scope: activeScope,
      visibility: { mode: "own", requesterUserId: activeScope.userId },
    });

    await expect(getSupportTicketThreadAction("foreign-ticket")).resolves.toEqual({
      errors: ["Destek talebi aktif kapsamda bulunamadı."],
      ok: false,
    });
    expect(mocks.repository.findTicket).toHaveBeenCalledWith({
      id: "foreign-ticket",
      scope: activeScope,
      visibility: { mode: "own", requesterUserId: activeScope.userId },
    });
  });

  it("rejects a foreign-owner reply without write, audit, or revalidation", async () => {
    const result = await replySupportTicketAction({
      body: "Yanıt",
      requestKey: "reply-1",
      ticketId: "foreign-ticket",
    });

    expect(result).toEqual({
      errors: ["Destek talebi aktif kapsamda bulunamadı."],
      ok: false,
    });
    expect(mocks.repository.createMessageAndTouchTicket).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects non-admin transitions before ticket reads", async () => {
    const result = await transitionSupportTicketAction({
      status: "IN_PROGRESS",
      ticketId: "ticket-1",
    });

    expect(result).toEqual({
      errors: ["Destek talebi durumunu yalnız yönetici değiştirebilir."],
      ok: false,
    });
    expect(mocks.repository.findTicket).not.toHaveBeenCalled();
    expect(mocks.repository.updateTicket).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("allows admin to transition an in-scope ticket and records metadata-only audit", async () => {
    const adminScope = { ...activeScope, userId: "admin-support", userRole: "admin" as const };
    mocks.sessionState.mockResolvedValue({ scope: adminScope });
    mocks.repository.findTicket.mockResolvedValue(ticketRow());

    const result = await transitionSupportTicketAction({
      status: "IN_PROGRESS",
      ticketId: "ticket-1",
    });

    expect(result).toEqual(expect.objectContaining({
      data: {
        idempotent: false,
        ticket: expect.objectContaining({ status: "IN_PROGRESS" }),
      },
      ok: true,
    }));
    expect(mocks.repository.findTicket).toHaveBeenCalledWith({
      id: "ticket-1",
      scope: adminScope,
      visibility: { mode: "scope" },
    });
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      action: "support-ticket.transition",
      metadata: {
        priority: "NORMAL",
        statusFrom: "OPEN",
        statusTo: "IN_PROGRESS",
        type: "TECHNICAL",
      },
    }));
  });
});

function ticketRow() {
  return {
    id: "ticket-1",
    tenantId: activeScope.tenantId,
    companyId: activeScope.companyId,
    periodId: activeScope.periodId,
    requesterUserId: "requester-1",
    ticketKey: "requester-1::request-1",
    subject: "Konu",
    type: "TECHNICAL" as const,
    priority: "NORMAL" as const,
    status: "OPEN" as const,
    lastMessageAt: "2026-07-30T16:00:00.000Z",
    createdBy: "requester-1",
    updatedBy: "requester-1",
    createdAt: "2026-07-30T16:00:00.000Z",
    updatedAt: "2026-07-30T16:00:00.000Z",
  };
}
