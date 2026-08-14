import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import type { PartyBackfillExecutionRepository } from "./party-backfill-apply-service";
import {
  evaluateProductionPartyMigrationGate,
  evaluateProductionPartyZeroApplyGate,
  readProductionPartyMigrationConfig,
  readProductionPartyTransitionStage,
  readProductionPartyZeroApplyConfig,
  runProductionPartyZeroApply,
  type ProductionPartyPreflightResult,
} from "./production-party-transition";

const sha = "8b31f6116f000dabd7a6d908ac552724b558bcce";
const sourceChecksum = "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";
const manifestChecksum = "dab14f9a64e1a816ccdf8b312778db1b7deccdae1ddd65fffce7dce501861183";
const runId = "party-backfill-run_4115ec986dd3914547de192820ba9799";

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgresql://writer:secret@production.example/noa",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_SHA: sha,
    NOA_EXPECTED_RELEASE_SHA: sha,
    NOA_PARTY_BACKUP_ID: `20260814T120000Z-${sha}`,
    NOA_PARTY_EXPECTED_POST_MIGRATION_MANIFEST_CHECKSUM: "a".repeat(64),
    NOA_PARTY_EXPECTED_PREFLIGHT_MANIFEST_CHECKSUM: manifestChecksum,
    NOA_PARTY_EXPECTED_RUN_ID: runId,
    NOA_PARTY_EXPECTED_SOURCE_CHECKSUM: sourceChecksum,
    NOA_PARTY_TRANSITION_ACTOR_USER_ID: "user-production-bootstrap",
    NOA_PARTY_TRANSITION_COMPANY_ID: "company-ms-insaat",
    NOA_PARTY_TRANSITION_PERIOD_ID: "period-ms-insaat-2026",
    NOA_PARTY_TRANSITION_TENANT_ID: "tenant-ms-insaat",
    NOA_PRODUCTION_PARTY_TRANSITION_CONFIRMATION: "production-party-migration-execute",
    NOA_RELEASE_ID: sha,
    NOA_RUNTIME_ENV: "production",
    NOA_SOURCE_REF: "refs/heads/main",
    ...overrides,
  };
}

function preflight(
  stage: "POST_MIGRATION" | "PRE_MIGRATION",
): ProductionPartyPreflightResult {
  return {
    blockingIssueCount: 0,
    blockers: [],
    candidateCount: 0,
    financialCounts: {
      cashBankMovement: 0,
      ledgerEntry: 0,
      progressPayment: 0,
      purchaseInvoice: 0,
      salesInvoice: 0,
    },
    issueCodeCounts: [],
    manifestChecksum: stage === "PRE_MIGRATION" ? manifestChecksum : "a".repeat(64),
    migration: {
      appliedMigrationCount: stage === "PRE_MIGRATION" ? 68 : 69,
      pendingMigrationNames: stage === "PRE_MIGRATION"
        ? ["20260814120000_add_party_backfill_foundation"]
        : [],
      schemaState: stage,
    },
    periodClosed: false,
    readOnly: true,
    ready: true,
    releaseId: sha,
    runId,
    scopeFingerprints: { company: "company", period: "period", tenant: "tenant" },
    sourceChecksum,
    sourceCount: 0,
    version: "party-v1",
    warningIssueCount: 0,
  };
}

describe("production Party transition", () => {
  test("accepts only an exact release-bound migration backup", () => {
    expect(readProductionPartyMigrationConfig(env())).toMatchObject({
      backupId: `20260814T120000Z-${sha}`,
      expectedPreflightManifestChecksum: manifestChecksum,
      releaseId: sha,
    });
    expect(() => readProductionPartyMigrationConfig(env({
      NOA_PARTY_BACKUP_ID: `20260814T120000Z-${"b".repeat(40)}`,
    }))).toThrow(/exact release SHA/);
  });

  test("fails closed outside manual production main and exact SHA", () => {
    expect(() => readProductionPartyMigrationConfig(env({ NOA_RUNTIME_ENV: "staging" })))
      .toThrow(/production ortamında/);
    expect(() => readProductionPartyMigrationConfig(env({ GITHUB_EVENT_NAME: "push" })))
      .toThrow(/manuel workflow/);
    expect(() => readProductionPartyMigrationConfig(env({ NOA_SOURCE_REF: "refs/heads/dev" })))
      .toThrow(/main branch/);
    expect(() => readProductionPartyMigrationConfig(env({ GITHUB_SHA: "b".repeat(40) })))
      .toThrow(/SHA değerleri eşleşmiyor/);
  });

  test("accepts only explicitly allowlisted transition stages", () => {
    expect(readProductionPartyTransitionStage("PRE_MIGRATION"))
      .toBe("PRE_MIGRATION");
    expect(readProductionPartyTransitionStage("POST_MIGRATION"))
      .toBe("POST_MIGRATION");
    expect(readProductionPartyTransitionStage("ZERO_APPLY"))
      .toBe("ZERO_APPLY");
    expect(() => readProductionPartyTransitionStage(undefined))
      .toThrow(/allowlist dışında/);
    expect(() => readProductionPartyTransitionStage("pre_migration"))
      .toThrow(/allowlist dışında/);
  });

  test("accepts the exact pre and post migration inventories", () => {
    const config = readProductionPartyMigrationConfig(env());
    expect(evaluateProductionPartyMigrationGate({
      config,
      preflight: preflight("PRE_MIGRATION"),
      stage: "PRE_MIGRATION",
    })).toMatchObject({ blockers: [], ready: true, stage: "PRE_MIGRATION" });
    expect(evaluateProductionPartyMigrationGate({
      config,
      preflight: preflight("POST_MIGRATION"),
      stage: "POST_MIGRATION",
    })).toMatchObject({ blockers: [], ready: true, stage: "POST_MIGRATION" });
  });

  test("rejects drift, nonzero records and extra pending migrations", () => {
    const config = readProductionPartyMigrationConfig(env());
    const drift = {
      ...preflight("PRE_MIGRATION"),
      candidateCount: 1,
      migration: {
        appliedMigrationCount: 67,
        pendingMigrationNames: [
          "20260814110000_unknown",
          "20260814120000_add_party_backfill_foundation",
        ],
        schemaState: "PRE_MIGRATION" as const,
      },
    };
    expect(evaluateProductionPartyMigrationGate({
      config,
      preflight: drift,
      stage: "PRE_MIGRATION",
    })).toMatchObject({
      blockers: expect.arrayContaining([
        "CANDIDATE_COUNT_NOT_ZERO",
        "PRE_MIGRATION_INVENTORY_MISMATCH",
      ]),
      ready: false,
    });
  });

  test("gates zero apply with the exact post-migration manifest", () => {
    const config = readProductionPartyZeroApplyConfig(env({
      NOA_PRODUCTION_PARTY_TRANSITION_CONFIRMATION:
        "production-party-zero-candidate-apply",
    }));
    expect(evaluateProductionPartyZeroApplyGate({
      config,
      preflight: preflight("POST_MIGRATION"),
    })).toMatchObject({ blockers: [], ready: true });
  });

  test("writes only a verified zero-candidate run and supports safe retry", async () => {
    const config = readProductionPartyZeroApplyConfig(env({
      NOA_PRODUCTION_PARTY_TRANSITION_CONFIRMATION:
        "production-party-zero-candidate-apply",
    }));
    const repository: PartyBackfillExecutionRepository = {
      applyAtomically: vi.fn().mockResolvedValue({
        blockingIssueCount: 0,
        candidateCount: 0,
        issueCount: 0,
        reused: false,
        runId,
        sourceChecksum,
        sourceCount: 0,
        status: "VERIFIED",
        warningIssueCount: 0,
      }),
      previewConsistently: vi.fn().mockResolvedValue({
        candidates: [],
        issues: [],
        run: {
          candidateCount: 0,
          id: runId,
          issueCount: 0,
          sourceChecksum,
          sourceCount: 0,
          unchangedCount: 0,
          version: "party-v1",
        },
      }),
    };
    await expect(runProductionPartyZeroApply({ config, repository })).resolves
      .toMatchObject({ candidateCount: 0, status: "VERIFIED" });
    expect(repository.applyAtomically).toHaveBeenCalledWith(expect.objectContaining({
      approvedSourceCountLimit: 0,
      expectedSourceChecksum: sourceChecksum,
    }));
  });

  test("does not reach mutation when the zero-candidate preview drifts", async () => {
    const config = readProductionPartyZeroApplyConfig(env({
      NOA_PRODUCTION_PARTY_TRANSITION_CONFIRMATION:
        "production-party-zero-candidate-apply",
    }));
    const repository: PartyBackfillExecutionRepository = {
      applyAtomically: vi.fn(),
      previewConsistently: vi.fn().mockResolvedValue({
        candidates: [{}],
        issues: [],
        run: {
          candidateCount: 1,
          id: runId,
          issueCount: 0,
          sourceChecksum,
          sourceCount: 1,
          unchangedCount: 0,
          version: "party-v1",
        },
      }),
    };
    await expect(runProductionPartyZeroApply({ config, repository })).rejects
      .toThrow(/fail-closed/);
    expect(repository.applyAtomically).not.toHaveBeenCalled();
  });

  test("gates the Party migration behind exact backup, restore and pre/post checks", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/production-party-migration.yml"),
      "utf8",
    );
    const backup = workflow.indexOf("pnpm production:backup:execute");
    const restore = workflow.indexOf("pnpm production:restore:rehearsal");
    const preGate = workflow.indexOf("NOA_PARTY_TRANSITION_STAGE: PRE_MIGRATION");
    const migrate = workflow.indexOf("pnpm db:migrate");
    const postGate = workflow.indexOf("NOA_PARTY_TRANSITION_STAGE: POST_MIGRATION");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("inputs.expected_release_sha == github.sha");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("group: noa-production-recovery");
    expect(workflow).toContain("secrets.PRODUCTION_TENANT_INVENTORY_DATABASE_URL");
    expect(backup).toBeGreaterThan(-1);
    expect(restore).toBeGreaterThan(backup);
    expect(preGate).toBeGreaterThan(restore);
    expect(migrate).toBeGreaterThan(preGate);
    expect(postGate).toBeGreaterThan(migrate);
  });

  test("keeps zero-candidate apply separate, exact and migration-free", () => {
    const workflow = readFileSync(
      resolve(
        process.cwd(),
        ".github/workflows/production-party-zero-candidate-apply.yml",
      ),
      "utf8",
    );
    const gate = workflow.indexOf("pnpm production:party-transition:gate");
    const apply = workflow.indexOf("pnpm production:party-zero-candidate:apply");
    const postflight = workflow.indexOf(
      "pnpm production:party-zero-candidate:postflight",
    );
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("inputs.expected_release_sha == github.sha");
    expect(workflow).toContain("environment: production");
    expect(gate).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(gate);
    expect(postflight).toBeGreaterThan(apply);
    expect(workflow).not.toMatch(/db:migrate|prisma migrate deploy|R2_|pg_dump/);
  });
});
