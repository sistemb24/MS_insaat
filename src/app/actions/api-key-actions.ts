"use server";

import { revalidatePath } from "next/cache";

import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import {
  createApiKeyService,
  type CreateApiKeyValues,
} from "@/lib/api-key-service";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const apiKeyService = createApiKeyService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createApiKeyPrismaRepository(
    prisma as unknown as ApiKeyPrismaClientLike,
  ),
});

export async function listApiKeyOverviewAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  return apiKeyService.listOverview({ scope });
}

export async function createApiKeyAction(values: CreateApiKeyValues) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  try {
    const result = await apiKeyService.createKey({ scope, values });

    if (result.ok) {
      revalidateApiKeyRoutes();
    }

    return result;
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        ok: false as const,
        errors: ["Bu kapsamda aynı ada sahip bir API anahtarı bulunuyor."],
      };
    }

    throw error;
  }
}

export async function revokeApiKeyAction(id: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const result = await apiKeyService.revokeKey({ id, scope });

  if (result.ok) {
    revalidateApiKeyRoutes();
  }

  return result;
}

function revalidateApiKeyRoutes() {
  revalidatePath("/api-yonetimi");
  revalidatePath("/[module]", "page");
}

function isUniqueConflict(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}
