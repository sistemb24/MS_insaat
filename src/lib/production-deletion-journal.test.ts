import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendProductionDeletionJournalEntry,
  createInMemoryProductionDeletionJournalStore,
  createProductionDeletionJournalScopePrefix,
  openProductionDeletionJournalEntry,
  PRODUCTION_DELETION_JOURNAL_RETENTION_DAYS,
  readProductionDeletionJournalChain,
  readProductionDeletionJournalCryptoConfig,
  sealProductionDeletionJournalEntry,
  type ProductionDeletionJournalCryptoConfig,
} from "./production-deletion-journal";
import {
  buildProductionDeletionReplayManifest,
  createProductionDeletionReplayCheckpoint,
  type ProductionDeletionReplayCheckpoint,
  type ProductionDeletionReplayManifestInput,
} from "./production-deletion-replay";

const cryptoConfig: ProductionDeletionJournalCryptoConfig = {
  kek: Buffer.alloc(32, 7),
  keyVersion: "v1",
};

const manifest = buildProductionDeletionReplayManifest({
  activeLegalHoldCount: 0,
  activeSessionCount: 0,
  generatedAt: new Date("2026-08-09T16:00:00.000Z"),
  inventoryChecksum: "a".repeat(64),
  lifecycleStatus: "CLOSURE_PENDING",
  lifecycleVersion: 2,
  manifestId: "journal-manifest-001",
  objectTargets: [
    {
      documentFileId: "journal-document-001",
      sizeBytes: 1_024,
      storageKey: "private/tenant/document.pdf",
    },
  ],
  recordTargets: [
    {
      category: "documents",
      decisionId: "retention-20260809-documents-v1",
      eligibilityEvidenceId: "journal-eligibility-document-001",
      eligibleAt: new Date("2026-08-09T15:00:00.000Z"),
      model: "DocumentFile",
      recordIds: ["journal-document-001"],
      ruleId: "document-trash-and-category-inheritance",
    },
  ],
  releaseId: "6b7ace8c34b2743fa69893cf596f6ee62bca1c74",
  tenantId: "tenant-private-journal-001",
} satisfies ProductionDeletionReplayManifestInput);

const prepared = createProductionDeletionReplayCheckpoint(manifest);

function checkpoint(
  status: ProductionDeletionReplayCheckpoint["status"],
): ProductionDeletionReplayCheckpoint {
  return { ...prepared, status };
}

describe("production encrypted append-only deletion journal contract", () => {
  it("seals and opens a sensitive manifest without exposing targets in key or envelope", () => {
    const sealed = sealProductionDeletionJournalEntry({
      checkpoint: prepared,
      crypto: cryptoConfig,
      eventId: "event-prepared-001",
      manifest,
      previousEntryChecksum: null,
      recordedAt: new Date("2026-08-09T17:00:00.000Z"),
      sequence: 1,
    });
    const serialized = `${sealed.key}\n${sealed.body}`;

    expect(sealed.key).toMatch(
      /^journal\/v1\/[a-f0-9]{64}\/000000000001-event-prepared-001\.json\.enc$/,
    );
    expect(serialized).not.toContain(manifest.tenantId);
    expect(serialized).not.toContain("journal-document-001");
    expect(serialized).not.toContain("private/tenant/document.pdf");
    expect(openProductionDeletionJournalEntry({
      body: sealed.body,
      key: sealed.key,
      keyring: { v1: cryptoConfig.kek },
    }).payload).toMatchObject({
      checkpoint: { status: "PREPARED" },
      eventId: "event-prepared-001",
      previousEntryChecksum: null,
      sequence: 1,
    });
  });

  it("rejects wrong keys, ciphertext tampering and AAD/object-key drift", () => {
    const sealed = sealProductionDeletionJournalEntry({
      checkpoint: prepared,
      crypto: cryptoConfig,
      eventId: "event-integrity-001",
      manifest,
      previousEntryChecksum: null,
      recordedAt: new Date("2026-08-09T17:00:00.000Z"),
      sequence: 1,
    });

    expect(() =>
      openProductionDeletionJournalEntry({
        body: sealed.body,
        key: sealed.key,
        keyring: { v1: Buffer.alloc(32, 8) },
      }),
    ).toThrow(/ciphertext, AAD veya anahtar/);

    const tampered = JSON.parse(sealed.body) as { ciphertext: string };
    tampered.ciphertext = `${tampered.ciphertext.slice(0, -4)}AAAA`;
    expect(() =>
      openProductionDeletionJournalEntry({
        body: JSON.stringify(tampered),
        key: sealed.key,
        keyring: { v1: cryptoConfig.kek },
      }),
    ).toThrow(/checksum/);

    expect(() =>
      openProductionDeletionJournalEntry({
        body: sealed.body,
        key: sealed.key.replace("event-integrity-001", "event-integrity-002"),
        keyring: { v1: cryptoConfig.kek },
      }),
    ).toThrow(/ciphertext, AAD veya anahtar/);
  });

  it("appends and verifies the four checkpoint transitions as one hash chain", async () => {
    const store = createInMemoryProductionDeletionJournalStore();
    const statuses = [
      "PREPARED",
      "R2_APPLIED",
      "DB_APPLIED",
      "VERIFIED",
    ] as const;

    for (let index = 0; index < statuses.length; index += 1) {
      await appendProductionDeletionJournalEntry({
        checkpoint: checkpoint(statuses[index]),
        crypto: cryptoConfig,
        eventId: `event-chain-00${index + 1}`,
        manifest,
        recordedAt: new Date(`2026-08-09T17:0${index}:00.000Z`),
        store,
      });
    }

    const chain = await readProductionDeletionJournalChain({
      keyring: { v1: cryptoConfig.kek },
      prefix: createProductionDeletionJournalScopePrefix({
        crypto: cryptoConfig,
        tenantId: manifest.tenantId,
      }),
      store,
    });
    expect(chain.map((entry) => entry.payload.sequence)).toEqual([1, 2, 3, 4]);
    expect(chain.map((entry) => entry.payload.checkpoint.status)).toEqual(statuses);
    expect(chain[3].payload.previousEntryChecksum).toBe(
      chain[2].envelope.entryChecksum,
    );
  });

  it("fails closed for a concurrent sequence fork", async () => {
    const store = createInMemoryProductionDeletionJournalStore();
    const first = sealProductionDeletionJournalEntry({
      checkpoint: prepared,
      crypto: cryptoConfig,
      eventId: "event-fork-001",
      manifest,
      previousEntryChecksum: null,
      recordedAt: new Date("2026-08-09T17:00:00.000Z"),
      sequence: 1,
    });
    const second = sealProductionDeletionJournalEntry({
      checkpoint: prepared,
      crypto: cryptoConfig,
      eventId: "event-fork-002",
      manifest,
      previousEntryChecksum: null,
      recordedAt: new Date("2026-08-09T17:00:01.000Z"),
      sequence: 1,
    });
    await store.createObject({ body: first.body, ifNoneMatch: "*", key: first.key });
    await store.createObject({ body: second.body, ifNoneMatch: "*", key: second.key });

    await expect(
      readProductionDeletionJournalChain({
        keyring: { v1: cryptoConfig.kek },
        prefix: createProductionDeletionJournalScopePrefix({
          crypto: cryptoConfig,
          tenantId: manifest.tenantId,
        }),
        store,
      }),
    ).rejects.toThrow(/fork/);
  });

  it("fails closed for sequence gaps and previous-checksum drift", async () => {
    const gapStore = createInMemoryProductionDeletionJournalStore();
    const gap = sealProductionDeletionJournalEntry({
      checkpoint: checkpoint("R2_APPLIED"),
      crypto: cryptoConfig,
      eventId: "event-gap-002",
      manifest,
      previousEntryChecksum: "b".repeat(64),
      recordedAt: new Date("2026-08-09T17:01:00.000Z"),
      sequence: 2,
    });
    await gapStore.createObject({ body: gap.body, ifNoneMatch: "*", key: gap.key });
    await expect(
      readProductionDeletionJournalChain({
        keyring: { v1: cryptoConfig.kek },
        prefix: createProductionDeletionJournalScopePrefix({
          crypto: cryptoConfig,
          tenantId: manifest.tenantId,
        }),
        store: gapStore,
      }),
    ).rejects.toThrow(/sequence boşluğu/);

    const driftStore = createInMemoryProductionDeletionJournalStore();
    const first = sealProductionDeletionJournalEntry({
      checkpoint: prepared,
      crypto: cryptoConfig,
      eventId: "event-drift-001",
      manifest,
      previousEntryChecksum: null,
      recordedAt: new Date("2026-08-09T17:00:00.000Z"),
      sequence: 1,
    });
    const second = sealProductionDeletionJournalEntry({
      checkpoint: checkpoint("R2_APPLIED"),
      crypto: cryptoConfig,
      eventId: "event-drift-002",
      manifest,
      previousEntryChecksum: "c".repeat(64),
      recordedAt: new Date("2026-08-09T17:01:00.000Z"),
      sequence: 2,
    });
    await driftStore.createObject({ body: first.body, ifNoneMatch: "*", key: first.key });
    await driftStore.createObject({ body: second.body, ifNoneMatch: "*", key: second.key });
    await expect(
      readProductionDeletionJournalChain({
        keyring: { v1: cryptoConfig.kek },
        prefix: createProductionDeletionJournalScopePrefix({
          crypto: cryptoConfig,
          tenantId: manifest.tenantId,
        }),
        store: driftStore,
      }),
    ).rejects.toThrow(/checksum zinciri/);
  });

  it("enforces conditional create and exact production key configuration", async () => {
    const store = createInMemoryProductionDeletionJournalStore();
    expect(
      readProductionDeletionJournalCryptoConfig({
        NOA_RUNTIME_ENV: "production",
        PRODUCTION_DELETION_JOURNAL_KEK: Buffer.alloc(32, 5).toString("base64"),
        PRODUCTION_DELETION_JOURNAL_KEY_VERSION: "v1",
      }),
    ).toEqual({ kek: Buffer.alloc(32, 5), keyVersion: "v1" });
    expect(() =>
      readProductionDeletionJournalCryptoConfig({
        NOA_RUNTIME_ENV: "staging",
        PRODUCTION_DELETION_JOURNAL_KEK: Buffer.alloc(32).toString("base64"),
        PRODUCTION_DELETION_JOURNAL_KEY_VERSION: "v1",
      }),
    ).toThrow(/production runtime/);
    expect(() =>
      readProductionDeletionJournalCryptoConfig({
        NOA_RUNTIME_ENV: "production",
        PRODUCTION_DELETION_JOURNAL_KEK: Buffer.alloc(31).toString("base64"),
        PRODUCTION_DELETION_JOURNAL_KEY_VERSION: "v1",
      }),
    ).toThrow(/32 byte/);

    expect(
      await store.createObject({ body: "encrypted", ifNoneMatch: "*", key: "key" }),
    ).toBe("created");
    expect(
      await store.createObject({ body: "overwrite", ifNoneMatch: "*", key: "key" }),
    ).toBe("already-exists");
    expect(PRODUCTION_DELETION_JOURNAL_RETENTION_DAYS).toBe(1_095);
  });

  it("contains no R2 provider adapter, workflow or secret logging", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/production-deletion-journal.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/@aws-sdk|PutObjectCommand|S3Client/);
    expect(source).not.toMatch(/workflow_dispatch|schedule:/);
    expect(source).not.toMatch(/console\.(log|error)|PRODUCTION_DELETION_JOURNAL_KEK\s*[:=]\s*["']/);
  });
});
