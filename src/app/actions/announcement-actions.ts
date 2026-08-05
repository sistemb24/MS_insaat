"use server";

import { revalidatePath } from "next/cache";

import {
  createAnnouncementPrismaRepository,
  type AnnouncementPrismaClientLike,
} from "@/lib/announcement-prisma-repository";
import {
  createAnnouncementService,
} from "@/lib/announcement-service";
import type {
  AnnouncementDraftInput,
  AnnouncementUpdateInput,
} from "@/lib/announcement";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { requireActiveSessionState } from "@/lib/server-active-scope";

const announcementService = createAnnouncementService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: createAnnouncementPrismaRepository(
    prisma as unknown as AnnouncementPrismaClientLike,
  ),
});

export async function listAnnouncementsAction() {
  const { scope } = await getAnnouncementContext();
  return announcementService.list({ scope });
}

export async function getAnnouncementAction(announcementId: string) {
  const { scope } = await getAnnouncementContext();
  return announcementService.get({ announcementId, scope });
}

export async function createAnnouncementAction(values: AnnouncementDraftInput) {
  const { scope } = await getAnnouncementContext();
  return revalidateSuccessful(await announcementService.create({ scope, values }));
}

export async function updateAnnouncementDraftAction(values: AnnouncementUpdateInput) {
  const { scope } = await getAnnouncementContext();
  return revalidateSuccessful(await announcementService.updateDraft({ scope, values }));
}

export async function publishAnnouncementAction(input: {
  announcementId: string;
  requestKey: string;
}) {
  const { scope } = await getAnnouncementContext();
  return revalidateSuccessful(await announcementService.publish({ ...input, scope }));
}

export async function archiveAnnouncementAction(input: {
  announcementId: string;
  requestKey: string;
}) {
  const { scope } = await getAnnouncementContext();
  return revalidateSuccessful(await announcementService.archive({ ...input, scope }));
}

async function getAnnouncementContext() {
  const { scope } = await requireActiveSessionState();
  await ensureTenantScope(prisma, scope);
  return { scope };
}

function revalidateSuccessful<T extends { ok: boolean }>(result: T) {
  if (result.ok) {
    revalidatePath("/bilgi-merkezi");
    revalidatePath("/[module]", "page");
  }
  return result;
}
