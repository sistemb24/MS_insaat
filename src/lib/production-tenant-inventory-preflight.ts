import {
  evaluateProductionAccountClosurePreflight,
  type RetentionDecision,
} from "./production-account-closure-preflight";
import { readR2DocumentStorageConfig } from "./document-storage-runtime";
import type { R2DocumentStorageConfig } from "./document-storage-r2";
import { PRODUCTION_DOCUMENT_BUCKET } from "./production-recovery-preflight";
import {
  PRODUCTION_TENANT_MODELS,
  buildProductionTenantInventoryManifest,
  type ProductionTenantInventoryRepositoryPort,
  type ProductionTenantObjectHeadPort,
} from "./production-tenant-inventory";

export const PRODUCTION_TENANT_INVENTORY_PREFLIGHT_CONFIRMATION =
  "production-tenant-inventory-preflight";
export const PRODUCTION_TENANT_INVENTORY_SOURCE_REF = "refs/heads/main";

export type ProductionTenantInventoryPreflightConfig = {
  databaseUrl: string;
  documentStorage: R2DocumentStorageConfig;
  releaseId: string;
  tenantId: string;
};

export function readProductionTenantInventoryPreflightConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionTenantInventoryPreflightConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Production tenant envanteri yalnız production runtime'da çalışır.");
  }
  if (
    env.NOA_TENANT_INVENTORY_CONFIRMATION !==
    PRODUCTION_TENANT_INVENTORY_PREFLIGHT_CONFIRMATION
  ) {
    throw new Error("Production tenant envanteri açık onayı eksik.");
  }
  if (env.NOA_SOURCE_REF !== PRODUCTION_TENANT_INVENTORY_SOURCE_REF) {
    throw new Error("Production tenant envanteri yalnız main ref üzerinde çalışır.");
  }

  const releaseId = normalizeReleaseId(env.NOA_RELEASE_ID ?? "");
  const githubSha = normalizeReleaseId(env.GITHUB_SHA ?? "");
  if (releaseId !== githubSha) {
    throw new Error("Production tenant envanteri release SHA eşleşmiyor.");
  }

  const tenantId = normalizeIdentifier(
    env.NOA_TENANT_INVENTORY_TENANT_ID ?? "",
    "Production tenant kimliği",
  );
  const databaseUrl = readRemoteProductionDatabaseUrl(env.DATABASE_URL ?? "");
  const documentStorage = readR2DocumentStorageConfig(env);
  if (documentStorage.bucket !== PRODUCTION_DOCUMENT_BUCKET) {
    throw new Error("Production tenant envanteri doküman bucket'ı onaylı değil.");
  }

  return { databaseUrl, documentStorage, releaseId, tenantId };
}

export async function runProductionTenantInventoryPreflight(input: {
  generatedAt: Date;
  objectHeadPort: ProductionTenantObjectHeadPort;
  releaseId: string;
  repository: ProductionTenantInventoryRepositoryPort;
  tenantId: string;
}) {
  const databaseRead = await input.repository.readTenantInventory({
    activeAt: input.generatedAt,
    models: PRODUCTION_TENANT_MODELS,
    tenantId: input.tenantId,
  });
  if (!databaseRead.tenant) {
    throw new Error("Production tenant envanteri tenant kaydını bulamadı.");
  }

  const storageKeys = databaseRead.documents.map((document) => document.storageKey);
  if (new Set(storageKeys).size !== storageKeys.length) {
    throw new Error("Production tenant envanteri tekrar eden storage key içeriyor.");
  }
  const headRows = await input.objectHeadPort.headObjects({ storageKeys });
  const heads = normalizeHeadRows(headRows, storageKeys);

  let totalSizeBytes = 0;
  for (const document of databaseRead.documents) {
    assertNonNegativeInteger(document.sizeBytes, "Doküman metadata boyutu");
    const head = heads.get(document.storageKey);
    if (!head?.exists) {
      throw new Error("Production tenant envanterinde R2 nesnesi eksik.");
    }
    if (head.sizeBytes !== document.sizeBytes) {
      throw new Error("Production tenant envanterinde DB/R2 byte uyuşmazlığı var.");
    }
    totalSizeBytes = addSafe(totalSizeBytes, document.sizeBytes);
  }

  const manifest = buildProductionTenantInventoryManifest({
    documents: {
      metadataCount: databaseRead.documents.length,
      objectHeadVerifiedCount: headRows.length,
      storageKeyCount: storageKeys.length,
      totalSizeBytes,
    },
    generatedAt: input.generatedAt,
    modelCounts: databaseRead.modelCounts,
    releaseId: input.releaseId,
    tenant: databaseRead.tenant,
    tenantId: input.tenantId,
  });
  const retentionDecisions = manifest.categories.map(
    ({ category, decisionId }) =>
      ({ category, decisionId, status: "approved" }) satisfies RetentionDecision,
  );
  const closurePreflight = evaluateProductionAccountClosurePreflight({
    activeSessionCount: manifest.tenant.activeSessionCount,
    backupDeletionReplayReady: false,
    documentMetadataCount: manifest.documents.metadataCount,
    documentObjectCount: manifest.documents.objectHeadVerifiedCount,
    exportManifest: { checksum: manifest.checksum, ready: true },
    legalHold: {
      active: manifest.tenant.activeLegalHoldCount > 0,
      referenceId: null,
    },
    retentionDecisions,
    tenantExists: true,
  });

  return { closurePreflight, manifest };
}

function normalizeHeadRows(
  rows: Awaited<ReturnType<ProductionTenantObjectHeadPort["headObjects"]>>,
  expectedStorageKeys: readonly string[],
) {
  const expected = new Set(expectedStorageKeys);
  const heads = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!expected.has(row.storageKey)) {
      throw new Error("R2 head envanteri bilinmeyen storage key içeriyor.");
    }
    if (heads.has(row.storageKey)) {
      throw new Error("R2 head envanteri tekrar eden storage key içeriyor.");
    }
    assertNonNegativeInteger(row.sizeBytes, "R2 nesne boyutu");
    heads.set(row.storageKey, row);
  }
  if (heads.size !== expected.size) {
    throw new Error("R2 head envanteri eksik.");
  }
  return heads;
}

function readRemoteProductionDatabaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Production tenant envanteri DATABASE_URL geçerli değil.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
  ) {
    throw new Error("Production tenant envanteri uzak PostgreSQL gerektirir.");
  }
  return value;
}

function normalizeReleaseId(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Production tenant envanteri release SHA geçerli değil.");
  }
  return normalized;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function addSafe(left: number, right: number) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error("Doküman toplam boyutu güvenli tam sayı sınırını aşıyor.");
  }
  return total;
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
}
