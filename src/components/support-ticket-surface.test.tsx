/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createSupportTicketAction: vi.fn(),
  getSupportTicketThreadAction: vi.fn(),
  listSupportTicketsAction: vi.fn(),
  replySupportTicketAction: vi.fn(),
  transitionSupportTicketAction: vi.fn(),
}));

vi.mock("@/app/actions/support-ticket-actions", () => actions);

import { SupportTicketSurface } from "./support-ticket-surface";

const timestamp = "2026-07-30T16:00:00.000Z";

describe("SupportTicketSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listSupportTicketsAction.mockResolvedValue({ data: { tickets: tickets() }, ok: true });
    actions.getSupportTicketThreadAction.mockResolvedValue({
      data: { messages: [message()], ticket: tickets()[0] },
      ok: true,
    });
    actions.replySupportTicketAction.mockResolvedValue({
      data: { idempotent: false, message: message(), ticket: tickets()[0] },
      ok: true,
    });
    actions.createSupportTicketAction.mockResolvedValue({
      data: { idempotent: false, ticket: tickets()[0] },
      ok: true,
    });
    actions.transitionSupportTicketAction.mockResolvedValue({
      data: { idempotent: false, ticket: { ...tickets()[0], status: "IN_PROGRESS" } },
      ok: true,
    });
  });

  afterEach(cleanup);

  it("loads metrics and opens a deep-linkable ticket thread", async () => {
    render(<SupportTicketSurface canTransition initialTicketId="ticket-1" />);
    expect(await screen.findByRole("heading", { name: "Destek Merkezi" })).toBeTruthy();
    expect((await screen.findByRole("dialog")).getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Rapor filtresi sorunu" })).toBeTruthy();
    expect(screen.getByText("İlk destek mesajı")).toBeTruthy();
    expect(screen.getByRole("button", { name: "İşleme al" })).toBeTruthy();
  });

  it("filters tickets by status and text without losing accessible empty state", async () => {
    render(<SupportTicketSurface canTransition={false} />);
    await screen.findByText("Rapor filtresi sorunu");
    fireEvent.change(screen.getByLabelText("Duruma göre filtrele"), { target: { value: "RESOLVED" } });
    expect(screen.getByText("Öneri kaydı")).toBeTruthy();
    expect(screen.queryByText("Rapor filtresi sorunu")).toBeNull();
    fireEvent.change(screen.getByLabelText("Destek taleplerinde ara"), { target: { value: "bulunmayan" } });
    expect(screen.getByText("Bu filtrede destek talebi bulunmuyor.")).toBeTruthy();
  });

  it("creates a labeled support ticket and supplies an opaque request key", async () => {
    render(<SupportTicketSurface canTransition={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Yeni destek talebi" }));
    expect(screen.getByRole("heading", { name: "Destek talebi oluştur" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Konu"), { target: { value: "Yeni konu" } });
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "Yeni açıklama" } });
    fireEvent.click(screen.getByRole("button", { name: "Talebi oluştur" }));
    await waitFor(() => expect(actions.createSupportTicketAction).toHaveBeenCalledWith(expect.objectContaining({
      initialMessage: "Yeni açıklama",
      priority: "NORMAL",
      subject: "Yeni konu",
      type: "TECHNICAL",
      requestKey: expect.any(String),
    })));
  });

  it("allows requester replies but keeps admin transition controls out of viewer DOM", async () => {
    render(<SupportTicketSurface canTransition={false} initialTicketId="ticket-1" />);
    await screen.findByText("İlk destek mesajı");
    expect(screen.queryByRole("button", { name: "İşleme al" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Yanıtınız"), { target: { value: "Yeni yanıt" } });
    fireEvent.click(screen.getByRole("button", { name: "Yanıt gönder" }));
    await waitFor(() => expect(actions.replySupportTicketAction).toHaveBeenCalledWith(expect.objectContaining({
      body: "Yeni yanıt",
      ticketId: "ticket-1",
    })));
  });
});

function tickets() {
  return [
    {
      id: "ticket-1", tenantId: "tenant", companyId: "company", periodId: "period",
      requesterUserId: "viewer-1", ticketKey: "key-1", subject: "Rapor filtresi sorunu",
      type: "TECHNICAL" as const, priority: "HIGH" as const, status: "OPEN" as const,
      lastMessageAt: timestamp, createdBy: "viewer-1", updatedBy: "viewer-1",
      createdAt: timestamp, updatedAt: timestamp,
    },
    {
      id: "ticket-2", tenantId: "tenant", companyId: "company", periodId: "period",
      requesterUserId: "viewer-1", ticketKey: "key-2", subject: "Öneri kaydı",
      type: "SUGGESTION" as const, priority: "LOW" as const, status: "RESOLVED" as const,
      lastMessageAt: timestamp, createdBy: "viewer-1", updatedBy: "admin-1",
      createdAt: timestamp, updatedAt: timestamp,
    },
  ];
}

function message() {
  return {
    id: "message-1", tenantId: "tenant", companyId: "company", periodId: "period",
    ticketId: "ticket-1", authorUserId: "viewer-1", messageKey: "message-key",
    body: "İlk destek mesajı", createdAt: timestamp,
  };
}
