import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { runSyntheticProductionDeletionReplayRehearsal } from "./production-deletion-replay-rehearsal";

describe("synthetic production deletion restore-replay rehearsal", () => {
  it("verifies the first deletion and restored replay with external journal evidence", async () => {
    const result = await runSyntheticProductionDeletionReplayRehearsal();

    expect(result).toMatchObject({
      firstExecutionStatus: "VERIFIED",
      journalEntryCount: 3,
      manifestChecksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      modelCount: 2,
      objectCount: 1,
      productionBackupDeletionReplayReady: false,
      recordCount: 2,
      recoveredFaultCount: 0,
      restoreReplayStatus: "VERIFIED",
      restoredObjectCount: 1,
      restoredRecordCount: 2,
      sensitiveTargetsIncluded: false,
      synthetic: true,
      syntheticVerificationReady: true,
    });
  });

  it("recovers an R2 partial failure by replaying the same PREPARED checkpoint", async () => {
    await expect(
      runSyntheticProductionDeletionReplayRehearsal({
        fault: "r2-after-first-delete",
      }),
    ).resolves.toMatchObject({
      firstExecutionStatus: "VERIFIED",
      recoveredFaultCount: 1,
      restoreReplayStatus: "VERIFIED",
    });
  });

  it("recovers a DB partial failure by replaying the same R2_APPLIED checkpoint", async () => {
    await expect(
      runSyntheticProductionDeletionReplayRehearsal({
        fault: "db-after-first-delete",
      }),
    ).resolves.toMatchObject({
      firstExecutionStatus: "VERIFIED",
      recoveredFaultCount: 1,
      restoreReplayStatus: "VERIFIED",
    });
  });

  it("keeps sensitive synthetic target identifiers out of the rehearsal output", async () => {
    const serialized = JSON.stringify(
      await runSyntheticProductionDeletionReplayRehearsal(),
    );

    expect(serialized).not.toContain("tenant-synthetic-replay-001");
    expect(serialized).not.toContain("synthetic-document-001");
    expect(serialized).not.toContain("synthetic-user-001");
    expect(serialized).not.toContain("synthetic-replay/document-001.bin");
    expect(serialized).not.toContain("storageKey");
  });

  it("contains no production provider, credential or workflow adapter", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/production-deletion-replay-rehearsal.ts",
      ),
      "utf8",
    );
    const script = readFileSync(
      resolve(
        process.cwd(),
        "scripts/rehearse-production-deletion-replay-synthetic.ts",
      ),
      "utf8",
    );
    const combined = `${source}\n${script}`;

    expect(combined).not.toMatch(
      /@prisma\/client|@aws-sdk|DATABASE_URL|R2_(ACCESS|BUCKET|ENDPOINT|SECRET)/,
    );
    expect(combined).not.toMatch(/workflow_dispatch|schedule:|process\.env/);
  });
});
