export const PRODUCTION_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION =
  "production-account-closure-preflight";

export const REQUIRED_RETENTION_CATEGORIES = [
  "identity-and-contact",
  "authentication-and-access",
  "audit-and-security",
  "finance-and-accounting",
  "personnel",
  "documents",
  "integrations-and-webhooks",
  "support-and-communications",
  "backups",
] as const;

export type RetentionCategory =
  (typeof REQUIRED_RETENTION_CATEGORIES)[number];

export type RetentionDecision = {
  category: RetentionCategory;
  decisionId: string;
  status: "approved" | "pending";
};

export type ProductionAccountClosureInventory = {
  activeSessionCount: number;
  backupDeletionReplayReady: boolean;
  documentMetadataCount: number;
  documentObjectCount: number;
  exportManifest: {
    checksum: string | null;
    ready: boolean;
  };
  legalHold: {
    active: boolean;
    referenceId: string | null;
  };
  retentionDecisions: readonly RetentionDecision[];
  tenantExists: boolean;
};

export type ProductionAccountClosurePreflightConfig = {
  releaseId: string;
  tenantId: string;
};

export function readProductionAccountClosurePreflightConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionAccountClosurePreflightConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error(
      "Production hesap kapatma preflight yalnız NOA_RUNTIME_ENV=production ile çalışır.",
    );
  }
  if (
    env.NOA_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION !==
    PRODUCTION_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION
  ) {
    throw new Error("Production hesap kapatma preflight açık onayı eksik.");
  }

  const tenantId = normalizeIdentifier(
    env.NOA_ACCOUNT_CLOSURE_TENANT_ID ?? "",
    "Production tenant kimliği",
  );
  const releaseId = normalizeIdentifier(
    env.NOA_RELEASE_ID ?? env.GITHUB_SHA ?? "",
    "Production release kimliği",
  );

  return { releaseId, tenantId };
}

export function evaluateProductionAccountClosurePreflight(
  inventory: ProductionAccountClosureInventory,
) {
  assertNonNegativeInteger(inventory.activeSessionCount, "aktif oturum sayısı");
  assertNonNegativeInteger(
    inventory.documentMetadataCount,
    "doküman metadata sayısı",
  );
  assertNonNegativeInteger(
    inventory.documentObjectCount,
    "doküman nesne sayısı",
  );

  const retention = evaluateRetentionDecisions(inventory.retentionDecisions);
  const blockers: string[] = [];

  if (!inventory.tenantExists) blockers.push("tenant-not-found");
  if (inventory.legalHold.active) blockers.push("legal-hold-active");
  if (!retention.complete) blockers.push("retention-decisions-incomplete");
  if (!inventory.exportManifest.ready) blockers.push("export-manifest-not-ready");
  if (!isSha256(inventory.exportManifest.checksum)) {
    blockers.push("export-checksum-invalid");
  }
  if (inventory.documentMetadataCount !== inventory.documentObjectCount) {
    blockers.push("document-inventory-mismatch");
  }
  if (!inventory.backupDeletionReplayReady) {
    blockers.push("backup-deletion-replay-not-ready");
  }

  return {
    accessFreezeAllowed: false as const,
    activeSessionCount: inventory.activeSessionCount,
    blockers,
    destructiveDeleteAllowed: false as const,
    documentInventoryMatches:
      inventory.documentMetadataCount === inventory.documentObjectCount,
    legalHoldActive: inventory.legalHold.active,
    legalHoldReferencePresent:
      !inventory.legalHold.active ||
      Boolean(normalizeOptionalReference(inventory.legalHold.referenceId)),
    preflightReady: blockers.length === 0,
    purgeAllowed: false as const,
    readOnly: true as const,
    retention,
  };
}

function evaluateRetentionDecisions(
  decisions: readonly RetentionDecision[],
) {
  const counts = new Map<RetentionCategory, number>();
  const approved = new Set<RetentionCategory>();
  const invalidDecisionIds: string[] = [];

  for (const decision of decisions) {
    counts.set(decision.category, (counts.get(decision.category) ?? 0) + 1);
    if (!isSafeIdentifier(decision.decisionId)) {
      invalidDecisionIds.push(decision.category);
    }
    if (decision.status === "approved") approved.add(decision.category);
  }

  const duplicateCategories = REQUIRED_RETENTION_CATEGORIES.filter(
    (category) => (counts.get(category) ?? 0) > 1,
  );
  const missingCategories = REQUIRED_RETENTION_CATEGORIES.filter(
    (category) => !approved.has(category),
  );

  return {
    approvedCategoryCount: approved.size,
    complete:
      missingCategories.length === 0 &&
      duplicateCategories.length === 0 &&
      invalidDecisionIds.length === 0,
    duplicateCategories,
    invalidDecisionIds,
    missingCategories,
    requiredCategoryCount: REQUIRED_RETENTION_CATEGORIES.length,
  };
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!isSafeIdentifier(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function isSafeIdentifier(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,79}$/.test(value.trim().toLowerCase());
}

function normalizeOptionalReference(value: string | null) {
  const normalized = value?.trim() ?? "";
  return isSafeIdentifier(normalized) ? normalized : null;
}

function isSha256(value: string | null) {
  return /^[a-f0-9]{64}$/i.test(value?.trim() ?? "");
}
