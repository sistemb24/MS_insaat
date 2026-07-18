"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createWebhookEndpointPrismaRepository,
  type WebhookEndpointPrismaClientLike,
} from "@/lib/webhook-endpoint-prisma-repository";
import {
  createWebhookEndpointService,
  type CreateWebhookEndpointValues,
  type UpdateWebhookEndpointValues,
} from "@/lib/webhook-endpoint-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";

const webhookEndpointService = createWebhookEndpointService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createWebhookEndpointPrismaRepository(
    prisma as unknown as WebhookEndpointPrismaClientLike,
  ),
});

export async function listWebhookEndpointOverviewAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return webhookEndpointService.listOverview({ scope });
}

export async function createWebhookEndpointAction(
  values: CreateWebhookEndpointValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await webhookEndpointService.createEndpoint({
    scope,
    values,
  });

  if (result.ok) {
    revalidateWebhookEndpointRoutes();
  }

  return result;
}

export async function deactivateWebhookEndpointAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await webhookEndpointService.deactivateEndpoint({
    id,
    scope,
  });

  if (result.ok) {
    revalidateWebhookEndpointRoutes();
  }

  return result;
}

export async function activateWebhookEndpointAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await webhookEndpointService.activateEndpoint({
    id,
    scope,
  });

  if (result.ok) {
    revalidateWebhookEndpointRoutes();
  }

  return result;
}

export async function rotateWebhookEndpointSecretAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await webhookEndpointService.rotateSecretEndpoint({
    id,
    scope,
  });

  if (result.ok) {
    revalidateWebhookEndpointRoutes();
  }

  return result;
}

export async function updateWebhookEndpointAction(
  id: string,
  values: UpdateWebhookEndpointValues,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const result = await webhookEndpointService.updateEndpoint({
    id,
    scope,
    values,
  });

  if (result.ok) {
    revalidateWebhookEndpointRoutes();
  }

  return result;
}

function revalidateWebhookEndpointRoutes() {
  revalidatePath("/api-yonetimi");
  revalidatePath("/[module]", "page");
}
