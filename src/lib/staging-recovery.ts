export const STAGING_RECOVERY_CRITICAL_TABLES = [
  "_prisma_migrations",
  "Tenant",
  "Company",
  "Period",
  "SuperAdminCredential",
  "TenantLoginRateLimitBucket",
  "DocumentFolder",
  "DocumentFile",
] as const;

export type StagingRecoverySourceInventory = {
  appliedMigrationCount: number;
  databaseBytes: number;
  expectedMigrationCount: number;
  publicTableNames: readonly string[];
};

export function createNodePostgresConnectionString(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");
  if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function createStagingRestoreDatabaseName(now: Date) {
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "z")
    .toLowerCase();
  return `noa_restore_${timestamp}`;
}

export function assertStagingRestoreDatabaseName(databaseName: string) {
  if (!/^noa_restore_[a-z0-9_]{10,48}$/.test(databaseName)) {
    throw new Error("Geçici restore veritabanı adı güvenli değil.");
  }
  return databaseName;
}

export function normalizeStagingTableNames(value: unknown) {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error("Staging tablo envanteri string dizisi değil.");
  }
  return value;
}

export function evaluateStagingRecoverySource(
  inventory: StagingRecoverySourceInventory,
) {
  const tableNames = new Set(inventory.publicTableNames);
  const missingCriticalTables = STAGING_RECOVERY_CRITICAL_TABLES.filter(
    (tableName) => !tableNames.has(tableName),
  );
  const migrationCountMatches =
    inventory.appliedMigrationCount === inventory.expectedMigrationCount;

  return {
    appliedMigrationCount: inventory.appliedMigrationCount,
    databaseBytes: inventory.databaseBytes,
    expectedMigrationCount: inventory.expectedMigrationCount,
    migrationCountMatches,
    missingCriticalTables,
    publicTableCount: tableNames.size,
    ready:
      inventory.databaseBytes > 0 &&
      migrationCountMatches &&
      missingCriticalTables.length === 0,
  };
}
