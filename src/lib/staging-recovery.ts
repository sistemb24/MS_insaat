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
