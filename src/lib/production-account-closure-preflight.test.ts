import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  evaluateProductionAccountClosurePreflight,
  readProductionAccountClosurePreflightConfig,
  REQUIRED_RETENTION_CATEGORIES,
} from "./production-account-closure-preflight";
import { approvedRetentionDecisionId } from "./production-retention-policy";

const approvedRetentionDecisions = REQUIRED_RETENTION_CATEGORIES.map(
  (category) => ({
    category,
    decisionId: approvedRetentionDecisionId(category),
    status: "approved" as const,
  }),
);

const completeInventory = {
  activeSessionCount: 2,
  backupDeletionReplayReady: true,
  documentMetadataCount: 3,
  documentObjectCount: 3,
  exportManifest: {
    checksum: "a".repeat(64),
    ready: true,
  },
  legalHold: {
    active: false,
    referenceId: null,
  },
  retentionDecisions: approvedRetentionDecisions,
  tenantExists: true,
} as const;

describe("production account closure preflight contract", () => {
  it("accepts only the exact production read-only confirmation and safe target", () => {
    expect(
      readProductionAccountClosurePreflightConfig({
        NOA_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION:
          "production-account-closure-preflight",
        NOA_ACCOUNT_CLOSURE_TENANT_ID: "tenant-production-001",
        NOA_RELEASE_ID: "Release_2026.08.09",
        NOA_RUNTIME_ENV: "production",
      }),
    ).toEqual({
      releaseId: "release_2026.08.09",
      tenantId: "tenant-production-001",
    });
  });

  it("fails closed outside production, without exact confirmation or target", () => {
    const base = {
      NOA_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION:
        "production-account-closure-preflight",
      NOA_ACCOUNT_CLOSURE_TENANT_ID: "tenant-production-001",
      NOA_RELEASE_ID: "release-1",
      NOA_RUNTIME_ENV: "production",
    };

    expect(() =>
      readProductionAccountClosurePreflightConfig({
        ...base,
        NOA_RUNTIME_ENV: "staging",
      }),
    ).toThrow(/NOA_RUNTIME_ENV=production/);
    expect(() =>
      readProductionAccountClosurePreflightConfig({
        ...base,
        NOA_ACCOUNT_CLOSURE_PREFLIGHT_CONFIRMATION: "yes",
      }),
    ).toThrow(/açık onayı eksik/);
    expect(() =>
      readProductionAccountClosurePreflightConfig({
        ...base,
        NOA_ACCOUNT_CLOSURE_TENANT_ID: "../tenant",
      }),
    ).toThrow(/tenant kimliği güvenli değil/);
  });

  it("reports a complete inventory but never grants a write capability", () => {
    expect(
      evaluateProductionAccountClosurePreflight(completeInventory),
    ).toMatchObject({
      accessFreezeAllowed: false,
      blockers: [],
      destructiveDeleteAllowed: false,
      documentInventoryMatches: true,
      preflightReady: true,
      purgeAllowed: false,
      readOnly: true,
      retention: {
        approvedCategoryCount: REQUIRED_RETENTION_CATEGORIES.length,
        complete: true,
        requiredCategoryCount: REQUIRED_RETENTION_CATEGORIES.length,
      },
    });
  });

  it("blocks active legal hold, incomplete retention and missing export evidence", () => {
    const result = evaluateProductionAccountClosurePreflight({
      ...completeInventory,
      exportManifest: { checksum: null, ready: false },
      legalHold: { active: true, referenceId: "hold-2026-001" },
      retentionDecisions: approvedRetentionDecisions.slice(1),
    });

    expect(result.preflightReady).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "legal-hold-active",
        "retention-decisions-incomplete",
        "export-manifest-not-ready",
        "export-checksum-invalid",
      ]),
    );
    expect(result.destructiveDeleteAllowed).toBe(false);
  });

  it("blocks DB/R2 inventory drift and missing backup deletion replay", () => {
    expect(
      evaluateProductionAccountClosurePreflight({
        ...completeInventory,
        backupDeletionReplayReady: false,
        documentObjectCount: 2,
      }),
    ).toMatchObject({
      blockers: [
        "document-inventory-mismatch",
        "backup-deletion-replay-not-ready",
      ],
      documentInventoryMatches: false,
      preflightReady: false,
    });
  });

  it("rejects duplicate or unsafe retention decisions and invalid counts", () => {
    const result = evaluateProductionAccountClosurePreflight({
      ...completeInventory,
      retentionDecisions: [
        ...approvedRetentionDecisions,
        {
          category: "documents",
          decisionId: "?",
          status: "approved",
        },
      ],
    });

    expect(result.retention).toMatchObject({
      complete: false,
      duplicateCategories: ["documents"],
      invalidDecisionIds: ["documents"],
    });
    expect(() =>
      evaluateProductionAccountClosurePreflight({
        ...completeInventory,
        documentMetadataCount: -1,
      }),
    ).toThrow(/metadata sayısı geçerli değil/);
  });

  it("rejects safe-looking decision IDs that are not in the approved catalog", () => {
    const result = evaluateProductionAccountClosurePreflight({
      ...completeInventory,
      retentionDecisions: approvedRetentionDecisions.map((decision) =>
        decision.category === "audit-and-security"
          ? { ...decision, decisionId: "retention-20990101-audit-security-v9" }
          : decision,
      ),
    });

    expect(result.preflightReady).toBe(false);
    expect(result.retention.invalidDecisionIds).toEqual(["audit-and-security"]);
  });

  it("keeps the preflight source free of persistence and object mutation calls", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/production-account-closure-preflight.ts",
      ),
      "utf8",
    );

    expect(source).not.toMatch(/\.(create|delete|deleteMany|update|updateMany|upsert)\s*\(/);
    expect(source).not.toMatch(/DeleteObjectCommand|PutObjectCommand/);
  });
});
