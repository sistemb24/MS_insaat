import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createInMemoryProductionDeletionJournalStore,
  type ProductionDeletionJournalCryptoConfig,
} from "./production-deletion-journal";
import {
  PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION,
  readProductionDeletionJournalProviderRehearsalConfig,
  runProductionDeletionJournalProviderRehearsal,
} from "./production-deletion-journal-provider-rehearsal";

const releaseId = "eab4cdf51d62434a3b126d248caa38cfe24ccb89";
const crypto: ProductionDeletionJournalCryptoConfig = {
  kek: Buffer.alloc(32, 11),
  keyVersion: "preflight-v1",
};

describe("production deletion journal provider rehearsal", () => {
  it("persists a synthetic encrypted entry, rejects overwrite and verifies the chain", async () => {
    const store = createInMemoryProductionDeletionJournalStore();
    await expect(
      runProductionDeletionJournalProviderRehearsal({
        crypto,
        now: new Date("2026-08-09T18:00:00.000Z"),
        releaseId,
        runAttempt: 1,
        runId: "31330000001",
        store,
      }),
    ).resolves.toMatchObject({
      chainLength: 1,
      overwriteRejected: true,
      productionBackupDeletionReplayReady: false,
      providerRehearsalReady: true,
      releaseId,
      sequence: 1,
    });
    await expect(
      runProductionDeletionJournalProviderRehearsal({
        crypto,
        now: new Date("2026-08-09T18:01:00.000Z"),
        releaseId,
        runAttempt: 2,
        runId: "31330000001",
        store,
      }),
    ).resolves.toMatchObject({ chainLength: 2, sequence: 2 });
  });

  it("rejects reuse of the same workflow run event", async () => {
    const store = createInMemoryProductionDeletionJournalStore();
    const input = {
      crypto,
      now: new Date("2026-08-09T18:00:00.000Z"),
      releaseId,
      runAttempt: 1,
      runId: "31330000002",
      store,
    };
    await runProductionDeletionJournalProviderRehearsal(input);
    await expect(runProductionDeletionJournalProviderRehearsal(input)).rejects.toThrow(
      /daha önce kullanılmış/,
    );
  });

  it("requires production main, exact SHA, exact bucket and isolated secrets", () => {
    const env = {
      CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      NOA_EXPECTED_RELEASE_SHA: releaseId,
      NOA_PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION:
        PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION,
      NOA_RELEASE_ID: releaseId,
      NOA_RUN_ATTEMPT: "1",
      NOA_RUN_ID: "31330000003",
      NOA_RUNTIME_ENV: "production",
      NOA_SOURCE_REF: "refs/heads/main",
      PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEK: Buffer.alloc(32, 12).toString("base64"),
      PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEY_VERSION: "preflight-v1",
      PRODUCTION_DELETION_JOURNAL_R2_BUCKET:
        "noa-insaat-production-deletion-journal-eu",
      PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT:
        `https://${"a".repeat(32)}.eu.r2.cloudflarestorage.com`,
      PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID: "parent-access-001",
      PRODUCTION_DELETION_JOURNAL_R2_PARENT_SECRET_ACCESS_KEY:
        "parent-secret-access-001",
    };
    expect(readProductionDeletionJournalProviderRehearsalConfig(env)).toMatchObject({
      bucket: "noa-insaat-production-deletion-journal-eu",
      releaseId,
      runAttempt: 1,
      runId: "31330000003",
    });
    expect(() =>
      readProductionDeletionJournalProviderRehearsalConfig({
        ...env,
        NOA_SOURCE_REF: "refs/heads/feature",
      }),
    ).toThrow(/main/);
    expect(() =>
      readProductionDeletionJournalProviderRehearsalConfig({
        ...env,
        NOA_EXPECTED_RELEASE_SHA: "f".repeat(40),
      }),
    ).toThrow(/exact SHA/);
  });

  it("keeps workflow manual, main-pinned, single-writer and DB/delete free", () => {
    const workflow = readFileSync(
      resolve(
        process.cwd(),
        ".github/workflows/production-deletion-journal-provider-rehearsal.yml",
      ),
      "utf8",
    );
    const script = readFileSync(
      resolve(process.cwd(), "scripts/rehearse-production-deletion-journal-provider.ts"),
      "utf8",
    );
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID");
    expect(workflow).toContain("PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEK");
    expect(workflow).not.toMatch(/schedule:|DATABASE_URL|R2_BACKUP|DeleteObject|artifact/);
    expect(script).not.toMatch(/DeleteObject|DATABASE_URL|console\.(error|warn)/);
  });
});
