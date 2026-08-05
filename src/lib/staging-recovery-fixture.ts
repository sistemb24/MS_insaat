import { createHash } from "node:crypto";

export const STAGING_RECOVERY_FIXTURE_CONFIRMATION =
  "staging-recovery-fixture";

export const STAGING_RECOVERY_FIXTURE = {
  companyId: "noa-recovery-company-f36-v1",
  fileId: "noa-recovery-file-f36-v1",
  fileName: "noa-recovery-f36-binary-smoke-v1.bin",
  fileSha256: "fb1f34e0d6d7898f979ee0e9dcd0396a50694ff808c435eb2603211af7045e95",
  fileSizeBytes: 144,
  folderId: "noa-recovery-folder-f36-v1",
  foreignTenantId: "noa-recovery-foreign-tenant-f36-v1",
  mimeType: "application/octet-stream",
  periodId: "noa-recovery-period-f36-v1",
  storageKey: "noa-recovery-f36-binary-smoke-v1.bin",
  tenantId: "noa-recovery-tenant-f36-v1",
} as const;

export type StagingRecoveryFixtureEvidence = {
  companyId: string;
  fileId: string;
  fileSizeBytes: number;
  folderId: string;
  foreignScopeCount: number;
  periodId: string;
  storageKey: string;
  tenantId: string;
};

export function assertStagingRecoveryFixtureConfirmation(
  env: Readonly<Record<string, string | undefined>>,
) {
  if (
    env.NOA_STAGING_RECOVERY_FIXTURE_CONFIRMATION !==
    STAGING_RECOVERY_FIXTURE_CONFIRMATION
  ) {
    throw new Error("Staging recovery fixture onayı eksik.");
  }
}

export function evaluateStagingRecoveryFixture(
  evidence: StagingRecoveryFixtureEvidence,
) {
  const identityMatches =
    evidence.tenantId === STAGING_RECOVERY_FIXTURE.tenantId &&
    evidence.companyId === STAGING_RECOVERY_FIXTURE.companyId &&
    evidence.periodId === STAGING_RECOVERY_FIXTURE.periodId &&
    evidence.folderId === STAGING_RECOVERY_FIXTURE.folderId &&
    evidence.fileId === STAGING_RECOVERY_FIXTURE.fileId &&
    evidence.storageKey === STAGING_RECOVERY_FIXTURE.storageKey;

  return {
    foreignScopeCount: evidence.foreignScopeCount,
    identityMatches,
    ready:
      identityMatches &&
      evidence.fileSizeBytes > 0 &&
      evidence.foreignScopeCount === 0,
  };
}

export function sha256(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}
