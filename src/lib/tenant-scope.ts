import type { EntityDefinition, EntityDraft, EntityRow } from "./entities";
import { saveEntityDraft, validateEntityDraft } from "./entities";

export type TenantScope = {
  tenantId: string;
  tenantName: string;
  companyId: string;
  companyName: string;
  periodId: string;
  periodLabel: string;
  userId: string;
  userName: string;
  userRole: TenantUserRole;
  licenseLabel: string;
  periodClosed?: boolean;
};

export type TenantUserRole = "admin" | "accounting" | "viewer";

export type CreateScopedEntityRowsInput = {
  definition: EntityDefinition;
  scope: TenantScope;
  nowIso: string;
};

export type SaveScopedEntityDraftInput = {
  definition: EntityDefinition;
  scope: TenantScope;
  rows: EntityRow[];
  draft: EntityDraft;
  nowIso: string;
};

export type SaveScopedEntityDraftResult = {
  rows: EntityRow[];
  errors: string[];
};

export const defaultTenantScope: TenantScope = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-demo-insaat",
  companyName: "DEMO İNŞAAT",
  periodId: "period-2026",
  periodLabel: "2026",
  userId: "user-main",
  userName: "Ana Kullanıcı",
  userRole: "accounting",
  licenseLabel: "Pilot P0",
};

export const companyScopes: TenantScope[] = [
  {
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    companyId: "company-demo-insaat",
    companyName: "DEMO İNŞAAT",
    periodId: "period-2026",
    periodLabel: "2026",
    userId: "user-ahmet",
    userName: "Ahmet Yılmaz",
    userRole: "admin",
    licenseLabel: "Pilot P0",
  },
  {
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    companyId: "company-akdeniz-insaat",
    companyName: "AKDENİZ İNŞAAT LTD. ŞTİ.",
    periodId: "period-akdeniz-2026",
    periodLabel: "2026",
    userId: "user-ayse",
    userName: "Ayşe Demir",
    userRole: "accounting",
    licenseLabel: "Pilot P0",
  },
  {
    tenantId: "tenant-noa-demo",
    tenantName: "NOA Demo Tenant",
    companyId: "company-anadolu-insaat",
    companyName: "ANADOLU YAPI A.Ş.",
    periodId: "period-anadolu-2026",
    periodLabel: "2026",
    userId: "user-mehmet",
    userName: "Mehmet Kaya",
    userRole: "accounting",
    licenseLabel: "Pilot P0",
  },
];

export const allTenantScopes: TenantScope[] = [
  defaultTenantScope,
  ...companyScopes,
];

export function getTenantScopeLabel(scope: TenantScope) {
  return `${scope.tenantName} / ${scope.companyName} / ${scope.periodLabel}`;
}

export function buildTenantScopeKey(scope: TenantScope) {
  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}`;
}

export function validateTenantScope(scope: TenantScope): string[] {
  const errors: string[] = [];

  if (!scope.tenantId.trim()) {
    errors.push("Tenant kapsamı zorunludur.");
  }

  if (!scope.companyId.trim()) {
    errors.push("Firma kapsamı zorunludur.");
  }

  if (!scope.periodId.trim()) {
    errors.push("Dönem kapsamı zorunludur.");
  }

  if (!scope.userId.trim()) {
    errors.push("Kullanıcı kapsamı zorunludur.");
  }

  return errors;
}

export function stampRowWithTenantScope(
  scope: TenantScope,
  row: EntityRow,
  nowIso: string,
): EntityRow {
  return {
    ...row,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    createdBy: row.createdBy || scope.userId,
    updatedBy: scope.userId,
    createdAt: row.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

export function createScopedEntityRows({
  definition,
  scope,
  nowIso,
}: CreateScopedEntityRowsInput): EntityRow[] {
  return definition.sampleRows.map((row) =>
    stampRowWithTenantScope(scope, row, nowIso),
  );
}

export function rowBelongsToTenantScope(scope: TenantScope, row: EntityRow) {
  return (
    row.tenantId === scope.tenantId &&
    row.companyId === scope.companyId &&
    row.periodId === scope.periodId
  );
}

export function filterRowsByTenantScope(scope: TenantScope, rows: EntityRow[]) {
  return rows.filter((row) => rowBelongsToTenantScope(scope, row));
}

export function saveScopedEntityDraft({
  definition,
  scope,
  rows,
  draft,
  nowIso,
}: SaveScopedEntityDraftInput): SaveScopedEntityDraftResult {
  const scopeErrors = validateTenantScope(scope);
  const scopedRows = filterRowsByTenantScope(scope, rows);
  const draftErrors = validateEntityDraft(definition, scopedRows, draft);
  const errors = [...scopeErrors, ...draftErrors];

  if (errors.length > 0) {
    return { rows, errors };
  }

  const savedRows = saveEntityDraft(definition, scopedRows, draft).map((row) =>
    row.code === draft.values.code
      ? stampRowWithTenantScope(scope, row, nowIso)
      : { ...row },
  );

  const outOfScopeRows = rows.filter(
    (row) => !rowBelongsToTenantScope(scope, row),
  );

  return {
    rows: [...outOfScopeRows, ...savedRows],
    errors: [],
  };
}
