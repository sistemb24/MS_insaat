"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createEmailOutboxPrismaRepository,
  type EmailOutboxPrismaClientLike,
} from "@/lib/email-outbox-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createUserInvitationPrismaRepository,
  type UserInvitationPrismaClientLike,
} from "@/lib/user-invitation-prisma-repository";
import {
  createUserInvitationService,
  type UserInvitationAcceptValues,
  type UserInvitationCreateValues,
} from "@/lib/user-invitation-service";

const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

const userInvitationService = createUserInvitationService({
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  auditLogRepository,
  emailOutboxRepository: createEmailOutboxPrismaRepository(
    prisma as unknown as EmailOutboxPrismaClientLike,
  ),
  repository: createUserInvitationPrismaRepository(
    prisma as unknown as UserInvitationPrismaClientLike,
  ),
});

export async function createUserInvitationAction(
  values: UserInvitationCreateValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await userInvitationService.createInvitation({
    scope,
    values,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function acceptUserInvitationAction(
  values: UserInvitationAcceptValues,
) {
  const result = await userInvitationService.acceptInvitation({ values });

  if (result.ok) {
    revalidatePath("/davet");
    revalidatePath("/giris");
  }

  return result;
}

export async function revokeUserInvitationAction(invitationId: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await userInvitationService.revokeInvitation({
    invitationId,
    scope,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}

export async function resendUserInvitationAction(invitationId: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await userInvitationService.resendInvitation({
    invitationId,
    scope,
  });

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}
