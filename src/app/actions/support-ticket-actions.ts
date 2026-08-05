"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import type {
  SupportTicketDraftInput,
  SupportTicketStatus,
} from "@/lib/support-ticket";
import {
  createSupportTicketPrismaRepository,
  type SupportTicketPrismaClientLike,
} from "@/lib/support-ticket-prisma-repository";
import {
  createSupportTicketService,
  type SupportTicketReplyInput,
} from "@/lib/support-ticket-service";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";

type SupportTicketCreateActionInput = Omit<SupportTicketDraftInput, "requesterUserId">;

const supportTicketService = createSupportTicketService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createSupportTicketPrismaRepository(
    prisma as unknown as SupportTicketPrismaClientLike,
  ),
});

export async function listSupportTicketsAction() {
  const context = await getSupportTicketContext();
  return supportTicketService.list({ scope: context.scope });
}

export async function getSupportTicketThreadAction(ticketId: string) {
  const context = await getSupportTicketContext();
  return supportTicketService.getThread({ scope: context.scope, ticketId });
}

export async function createSupportTicketAction(values: SupportTicketCreateActionInput) {
  const context = await getSupportTicketContext();
  return revalidateSuccessful(await supportTicketService.createTicket({
    scope: context.scope,
    values: { ...values, requesterUserId: context.scope.userId },
  }));
}

export async function replySupportTicketAction(values: SupportTicketReplyInput) {
  const context = await getSupportTicketContext();
  return revalidateSuccessful(await supportTicketService.reply({
    scope: context.scope,
    values,
  }));
}

export async function transitionSupportTicketAction(input: {
  status: SupportTicketStatus;
  ticketId: string;
}) {
  const context = await getSupportTicketContext();
  return revalidateSuccessful(await supportTicketService.transition({
    scope: context.scope,
    status: input.status,
    ticketId: input.ticketId,
  }));
}

async function getSupportTicketContext() {
  const { scope } = await requireActiveSessionState();
  await ensureTenantScope(prisma, scope);
  return { scope };
}

function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/destek-merkezi");
    revalidatePath("/[module]", "page");
  }
  return result;
}
