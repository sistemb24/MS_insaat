"use server";

import type { EntityRow } from "@/lib/entities";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";

const entityCrudService = createEntityCrudService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: createEntityPrismaRepository(prisma),
  now: () => new Date().toISOString(),
});

export async function listEntityRowsAction(slug: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return entityCrudService.list({
    scope,
    slug,
  });
}

export async function createEntityRowAction(slug: string, values: EntityRow) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return entityCrudService.create({
    scope,
    slug,
    values,
  });
}

export async function importEntityRowsAction(slug: string, rows: EntityRow[]) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return entityCrudService.importMany({
    scope,
    slug,
    rows,
  });
}
export async function updateEntityRowAction(
  slug: string,
  code: string,
  values: EntityRow,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return entityCrudService.update({
    scope,
    slug,
    code,
    values,
  });
}

export async function deactivateEntityRowAction(slug: string, code: string) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  return entityCrudService.deactivate({
    scope,
    slug,
    code,
  });
}
