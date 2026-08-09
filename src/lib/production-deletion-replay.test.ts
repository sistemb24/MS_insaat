import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  advanceProductionDeletionReplay,
  buildProductionDeletionReplayEvidence,
  buildProductionDeletionReplayManifest,
  buildProductionDeletionReplayVerificationEvidence,
  createProductionDeletionReplayCheckpoint,
  type ProductionDeletionReplayManifestInput,
  type ProductionDeletionReplayObjectPort,
  type ProductionDeletionReplayRepositoryPort,
} from "./production-deletion-replay";

const manifestInput = {
  activeLegalHoldCount: 0,
  activeSessionCount: 0,
  generatedAt: new Date("2026-08-09T16:00:00.000Z"),
  inventoryChecksum: "a".repeat(64),
  lifecycleStatus: "CLOSURE_PENDING",
  lifecycleVersion: 2,
  manifestId: "deletion-20260809-tenant-001-v1",
  objectTargets: [
    {
      documentFileId: "document-001",
      sizeBytes: 2_048,
      storageKey: "document-center/folder/secret-file.pdf",
    },
  ],
  recordTargets: [
    {
      category: "documents",
      decisionId: "retention-20260809-documents-v1",
      eligibilityEvidenceId: "eligibility-document-001",
      eligibleAt: new Date("2026-08-09T15:00:00.000Z"),
      model: "DocumentFile",
      recordIds: ["document-001"],
      ruleId: "document-trash-and-category-inheritance",
    },
    {
      category: "identity-and-contact",
      decisionId: "retention-20260809-identity-contact-v1",
      eligibilityEvidenceId: "eligibility-user-001",
      eligibleAt: new Date("2026-08-09T15:00:00.000Z"),
      model: "AppUser",
      recordIds: ["user-001"],
      ruleId: "identity-after-account-closure",
    },
  ],
  releaseId: "b923ae81f33a59cb103a1700785d67f2d46b844a",
  tenantId: "tenant-001",
} as const satisfies ProductionDeletionReplayManifestInput;

function createPorts() {
  const objectPort: ProductionDeletionReplayObjectPort = {
    applyExactObjectDeletion: vi.fn().mockResolvedValue([
      {
        proofManifestChecksum: null,
        status: "deleted",
        targetRef: "DocumentFileObject:document-001",
      },
    ]),
    findExistingObjects: vi.fn().mockResolvedValue([]),
  };
  const repositoryPort: ProductionDeletionReplayRepositoryPort = {
    applyExactRecordDeletion: vi.fn().mockResolvedValue([
      {
        proofManifestChecksum: null,
        status: "deleted",
        targetRef: "AppUser:user-001",
      },
      {
        proofManifestChecksum: null,
        status: "deleted",
        targetRef: "DocumentFile:document-001",
      },
    ]),
    findExistingRecords: vi.fn().mockResolvedValue([]),
  };
  return { objectPort, repositoryPort };
}

describe("production deletion manifest and restore replay core", () => {
  it("builds deterministic sensitive manifest and PII-free aggregate evidence", () => {
    const first = buildProductionDeletionReplayManifest(manifestInput);
    const second = buildProductionDeletionReplayManifest({
      ...manifestInput,
      recordTargets: [...manifestInput.recordTargets].reverse(),
    });

    expect(first).toEqual(second);
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/);
    const evidence = buildProductionDeletionReplayEvidence(first);
    expect(evidence).toMatchObject({
      manifestChecksum: first.checksum,
      modelCount: 2,
      objectCount: 1,
      objectSizeBytes: 2_048,
      recordCount: 2,
      sensitiveTargetsIncluded: false,
    });
    const serializedEvidence = JSON.stringify(evidence);
    expect(serializedEvidence).not.toContain("user-001");
    expect(serializedEvidence).not.toContain("document-001");
    expect(serializedEvidence).not.toContain("secret-file.pdf");
    expect(serializedEvidence).not.toContain("storageKey");
  });

  it("fails closed for lifecycle, session, legal hold and future eligibility drift", () => {
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        lifecycleStatus: "ACTIVE" as never,
      }),
    ).toThrow(/CLOSURE_PENDING/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        activeSessionCount: 1,
      }),
    ).toThrow(/aktif oturum/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        activeLegalHoldCount: 1,
      }),
    ).toThrow(/legal hold/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        recordTargets: manifestInput.recordTargets.map((target, index) =>
          index === 0
            ? { ...target, eligibleAt: new Date("2026-08-10T00:00:00.000Z") }
            : target,
        ),
      }),
    ).toThrow(/henüz uygun olmayan/);
  });

  it("rejects retention, model/category and DocumentFile/R2 target drift", () => {
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        recordTargets: manifestInput.recordTargets.map((target, index) =>
          index === 0 ? { ...target, decisionId: "retention-unknown" } : target,
        ),
      }),
    ).toThrow(/karar kimliği onaylı değil/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        recordTargets: manifestInput.recordTargets.map((target, index) =>
          index === 1 ? { ...target, category: "documents" as const } : target,
        ),
      }),
    ).toThrow(/model\/kategori/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        objectTargets: [],
      }),
    ).toThrow(/birebir eşleşmiyor/);
    expect(() =>
      buildProductionDeletionReplayManifest({
        ...manifestInput,
        recordTargets: manifestInput.recordTargets.map((target, index) =>
          index === 1 ? { ...target, recordIds: [] } : target,
        ),
      }),
    ).toThrow(/boş model hedefi/);
  });

  it("advances one persisted idempotent stage at a time and verifies absence", async () => {
    const manifest = buildProductionDeletionReplayManifest(manifestInput);
    const ports = createPorts();
    const prepared = createProductionDeletionReplayCheckpoint(manifest);

    const r2Applied = await advanceProductionDeletionReplay({
      checkpoint: prepared,
      manifest,
      ...ports,
    });
    expect(r2Applied.status).toBe("R2_APPLIED");
    expect(ports.repositoryPort.applyExactRecordDeletion).not.toHaveBeenCalled();

    const dbApplied = await advanceProductionDeletionReplay({
      checkpoint: r2Applied,
      manifest,
      ...ports,
    });
    expect(dbApplied.status).toBe("DB_APPLIED");

    const verified = await advanceProductionDeletionReplay({
      checkpoint: dbApplied,
      manifest,
      ...ports,
    });
    expect(verified.status).toBe("VERIFIED");
    expect(ports.objectPort.findExistingObjects).toHaveBeenCalledOnce();
    expect(ports.repositoryPort.findExistingRecords).toHaveBeenCalledOnce();
    expect(
      buildProductionDeletionReplayVerificationEvidence({ manifest, checkpoint: verified }),
    ).toMatchObject({
      backupDeletionReplayReady: true,
      replayStatus: "VERIFIED",
      sensitiveTargetsIncluded: false,
    });

    await expect(
      advanceProductionDeletionReplay({
        checkpoint: verified,
        manifest,
        ...ports,
      }),
    ).resolves.toEqual(verified);
  });

  it("accepts already absent targets only with proof from the same manifest", async () => {
    const manifest = buildProductionDeletionReplayManifest(manifestInput);
    const ports = createPorts();
    vi.mocked(ports.objectPort.applyExactObjectDeletion).mockResolvedValue([
      {
        proofManifestChecksum: "b".repeat(64),
        status: "already-absent",
        targetRef: "DocumentFileObject:document-001",
      },
    ]);

    await expect(
      advanceProductionDeletionReplay({
        checkpoint: createProductionDeletionReplayCheckpoint(manifest),
        manifest,
        ...ports,
      }),
    ).rejects.toThrow(/aynı manifest idempotency kanıtı yok/);

    vi.mocked(ports.objectPort.applyExactObjectDeletion).mockResolvedValue([
      {
        proofManifestChecksum: manifest.checksum,
        status: "already-absent",
        targetRef: "DocumentFileObject:document-001",
      },
    ]);
    await expect(
      advanceProductionDeletionReplay({
        checkpoint: createProductionDeletionReplayCheckpoint(manifest),
        manifest,
        ...ports,
      }),
    ).resolves.toMatchObject({ status: "R2_APPLIED" });
  });

  it("rejects tampered manifests, checkpoints, partial results and failed verification", async () => {
    const manifest = buildProductionDeletionReplayManifest(manifestInput);
    const ports = createPorts();
    const prepared = createProductionDeletionReplayCheckpoint(manifest);

    expect(() =>
      buildProductionDeletionReplayEvidence({
        ...manifest,
        tenantId: "tenant-tampered",
      }),
    ).toThrow(/checksum/);

    await expect(
      advanceProductionDeletionReplay({
        checkpoint: { ...prepared, manifestChecksum: "c".repeat(64) },
        manifest,
        ...ports,
      }),
    ).rejects.toThrow(/checkpoint/);
    expect(() =>
      buildProductionDeletionReplayVerificationEvidence({
        checkpoint: prepared,
        manifest,
      }),
    ).toThrow(/yalnız VERIFIED/);

    vi.mocked(ports.objectPort.applyExactObjectDeletion).mockResolvedValue([]);
    await expect(
      advanceProductionDeletionReplay({ checkpoint: prepared, manifest, ...ports }),
    ).rejects.toThrow(/exact hedeflerle eşleşmiyor/);

    vi.mocked(ports.objectPort.applyExactObjectDeletion).mockResolvedValue([
      {
        proofManifestChecksum: null,
        status: "unexpected" as never,
        targetRef: "DocumentFileObject:document-001",
      },
    ]);
    await expect(
      advanceProductionDeletionReplay({ checkpoint: prepared, manifest, ...ports }),
    ).rejects.toThrow(/geçerli bir durum/);

    vi.mocked(ports.objectPort.findExistingObjects).mockResolvedValue([
      "DocumentFileObject:document-001",
    ]);
    await expect(
      advanceProductionDeletionReplay({
        checkpoint: { ...prepared, status: "DB_APPLIED" },
        manifest,
        ...ports,
      }),
    ).rejects.toThrow(/hâlâ mevcut/);
  });

  it("contains no concrete Prisma, R2 or workflow mutation adapter", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/production-deletion-replay.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/@prisma\/client|DeleteObjectCommand|DeleteObjectsCommand/);
    expect(source).not.toMatch(/workflow_dispatch|schedule:/);
  });
});
