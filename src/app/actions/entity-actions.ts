"use server";

import type { EntityRow } from "@/lib/entities";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { validateCustomerTypeAssignment } from "@/lib/customer-type";
import {
  createCustomerTypePrismaRepository,
  type CustomerTypePrismaClientLike,
} from "@/lib/customer-type-prisma-repository";
import { createCustomerTypeService } from "@/lib/customer-type-service";
import { validateSupplierCategoryAssignment } from "@/lib/supplier-category";
import {
  createSupplierCategoryPrismaRepository,
  type SupplierCategoryPrismaClientLike,
} from "@/lib/supplier-category-prisma-repository";
import { createSupplierCategoryService } from "@/lib/supplier-category-service";
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
const supplierCategoryService = createSupplierCategoryService({
  repository: createSupplierCategoryPrismaRepository(
    prisma as unknown as SupplierCategoryPrismaClientLike,
  ),
});
const customerTypeService = createCustomerTypeService({
  repository: createCustomerTypePrismaRepository(
    prisma as unknown as CustomerTypePrismaClientLike,
  ),
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
  const categoryErrors = await validateSupplierRows({
    rows: [values],
    scope,
    slug,
  });
  if (categoryErrors.length > 0) return { errors: categoryErrors, ok: false } as const;
  const customerTypeErrors = await validateCustomerRows({
    rows: [values],
    scope,
    slug,
  });
  if (customerTypeErrors.length > 0) {
    return { errors: customerTypeErrors, ok: false } as const;
  }

  return entityCrudService.create({
    scope,
    slug,
    values,
  });
}

export async function importEntityRowsAction(slug: string, rows: EntityRow[]) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const categoryErrors = await validateSupplierRows({ rows, scope, slug });
  if (categoryErrors.length > 0) return { errors: categoryErrors, ok: false } as const;
  const customerTypeErrors = await validateCustomerRows({ rows, scope, slug });
  if (customerTypeErrors.length > 0) {
    return { errors: customerTypeErrors, ok: false } as const;
  }

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
  let currentCategory = "";
  let currentCustomerType = "";
  if (slug === "tedarikciler") {
    const current = await entityCrudService.list({ scope, slug });
    if (!current.ok) return current;
    currentCategory = current.data.rows.find((row) => row.code === code)?.category ?? "";
  }
  if (slug === "musteriler") {
    const current = await entityCrudService.list({ scope, slug });
    if (!current.ok) return current;
    currentCustomerType =
      current.data.rows.find((row) => row.code === code)?.customerType ?? "";
  }
  const categoryErrors = await validateSupplierRows({
    currentCategories: [currentCategory],
    rows: [values],
    scope,
    slug,
  });
  if (categoryErrors.length > 0) return { errors: categoryErrors, ok: false } as const;
  const customerTypeErrors = await validateCustomerRows({
    currentTypes: [currentCustomerType],
    rows: [values],
    scope,
    slug,
  });
  if (customerTypeErrors.length > 0) {
    return { errors: customerTypeErrors, ok: false } as const;
  }

  return entityCrudService.update({
    scope,
    slug,
    code,
    values,
  });
}

async function validateCustomerRows(input: {
  currentTypes?: string[];
  rows: EntityRow[];
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>;
  slug: string;
}) {
  if (input.slug !== "musteriler") return [];
  const result = await customerTypeService.list({ scope: input.scope });
  if (!result.ok) return result.errors;
  return input.rows.flatMap((row, index) =>
    validateCustomerTypeAssignment({
      customerTypes: result.data.customerTypes,
      currentValue: input.currentTypes?.[index],
      value: row.customerType ?? "",
    }).map((error) =>
      input.rows.length > 1 ? `${index + 1}. satır: ${error}` : error,
    ),
  );
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

async function validateSupplierRows(input: {
  currentCategories?: string[];
  rows: EntityRow[];
  scope: Awaited<ReturnType<typeof getActiveTenantScope>>;
  slug: string;
}) {
  if (input.slug !== "tedarikciler") return [];
  const result = await supplierCategoryService.list({ scope: input.scope });
  if (!result.ok) return result.errors;
  return input.rows.flatMap((row, index) =>
    validateSupplierCategoryAssignment({
      categories: result.data.categories,
      currentValue: input.currentCategories?.[index],
      value: row.category ?? "",
    }).map((error) =>
      input.rows.length > 1 ? `${index + 1}. satır: ${error}` : error,
    ),
  );
}
