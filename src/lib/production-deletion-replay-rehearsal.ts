import {
  advanceProductionDeletionReplay,
  buildProductionDeletionReplayEvidence,
  buildProductionDeletionReplayManifest,
  buildProductionDeletionReplayVerificationEvidence,
  createProductionDeletionReplayCheckpoint,
  type ProductionDeletionReplayManifest,
  type ProductionDeletionReplayManifestInput,
  type ProductionDeletionReplayObjectPort,
  type ProductionDeletionReplayRepositoryPort,
} from "./production-deletion-replay";

export type SyntheticDeletionReplayFault =
  | "db-after-first-delete"
  | "none"
  | "r2-after-first-delete";

export async function runSyntheticProductionDeletionReplayRehearsal(
  input: { fault?: SyntheticDeletionReplayFault } = {},
) {
  const fault = input.fault ?? "none";
  const manifest = buildSyntheticManifest();
  const fixture = createSyntheticFixture(manifest, fault);

  const firstExecution = await runToVerified({ fixture, manifest });
  buildProductionDeletionReplayVerificationEvidence({
    checkpoint: firstExecution.checkpoint,
    manifest,
  });

  const journalEntryCountBeforeRestore = fixture.journalEntryCount();
  const restored = fixture.restoreFromSyntheticBackup();
  const journalEntryCountAfterRestore = fixture.journalEntryCount();
  if (journalEntryCountAfterRestore !== journalEntryCountBeforeRestore) {
    throw new Error("Sentetik restore append-only journal kanıtını değiştirdi.");
  }

  const restoreReplay = await runToVerified({ fixture, manifest });
  buildProductionDeletionReplayVerificationEvidence({
    checkpoint: restoreReplay.checkpoint,
    manifest,
  });
  const evidence = buildProductionDeletionReplayEvidence(manifest);

  return {
    firstExecutionStatus: firstExecution.checkpoint.status,
    journalEntryCount: fixture.journalEntryCount(),
    manifestChecksum: evidence.manifestChecksum,
    modelCount: evidence.modelCount,
    objectCount: evidence.objectCount,
    productionBackupDeletionReplayReady: false as const,
    recordCount: evidence.recordCount,
    recoveredFaultCount:
      firstExecution.recoveredFaultCount + restoreReplay.recoveredFaultCount,
    restoreReplayStatus: restoreReplay.checkpoint.status,
    restoredObjectCount: restored.objectCount,
    restoredRecordCount: restored.recordCount,
    sensitiveTargetsIncluded: false as const,
    synthetic: true as const,
    syntheticVerificationReady: true as const,
  };
}

function buildSyntheticManifest() {
  return buildProductionDeletionReplayManifest({
    activeLegalHoldCount: 0,
    activeSessionCount: 0,
    generatedAt: new Date("2026-08-09T16:00:00.000Z"),
    inventoryChecksum: "a".repeat(64),
    lifecycleStatus: "CLOSURE_PENDING",
    lifecycleVersion: 2,
    manifestId: "synthetic-replay-manifest-001",
    objectTargets: [
      {
        documentFileId: "synthetic-document-001",
        sizeBytes: 2_048,
        storageKey: "synthetic-replay/document-001.bin",
      },
    ],
    recordTargets: [
      {
        category: "documents",
        decisionId: "retention-20260809-documents-v1",
        eligibilityEvidenceId: "synthetic-eligibility-document-001",
        eligibleAt: new Date("2026-08-09T15:00:00.000Z"),
        model: "DocumentFile",
        recordIds: ["synthetic-document-001"],
        ruleId: "document-trash-and-category-inheritance",
      },
      {
        category: "identity-and-contact",
        decisionId: "retention-20260809-identity-contact-v1",
        eligibilityEvidenceId: "synthetic-eligibility-user-001",
        eligibleAt: new Date("2026-08-09T15:00:00.000Z"),
        model: "AppUser",
        recordIds: ["synthetic-user-001"],
        ruleId: "identity-after-account-closure",
      },
    ],
    releaseId: "6fa336ba77122d9c7cca6b9344d978af323b2ab6",
    tenantId: "tenant-synthetic-replay-001",
  } satisfies ProductionDeletionReplayManifestInput);
}

async function runToVerified(input: {
  fixture: ReturnType<typeof createSyntheticFixture>;
  manifest: ProductionDeletionReplayManifest;
}) {
  let checkpoint = createProductionDeletionReplayCheckpoint(input.manifest);
  let recoveredFaultCount = 0;

  while (checkpoint.status !== "VERIFIED") {
    try {
      checkpoint = await advanceProductionDeletionReplay({
        checkpoint,
        manifest: input.manifest,
        objectPort: input.fixture.objectPort,
        repositoryPort: input.fixture.repositoryPort,
      });
    } catch (error) {
      if (!isInjectedSyntheticFault(error) || recoveredFaultCount > 0) throw error;
      recoveredFaultCount += 1;
    }
  }

  return { checkpoint, recoveredFaultCount };
}

function createSyntheticFixture(
  manifest: ProductionDeletionReplayManifest,
  fault: SyntheticDeletionReplayFault,
) {
  const originalObjectRefs = manifest.objectTargets.map(
    (target) => `DocumentFileObject:${target.documentFileId}`,
  );
  const originalRecordRefs = manifest.recordTargets.flatMap((target) =>
    target.recordIds.map((recordId) => `${target.model}:${recordId}`),
  );
  const existingObjects = new Set(originalObjectRefs);
  const existingRecords = new Set(originalRecordRefs);
  const appendOnlyJournal = new Map<string, string>();
  let pendingFault = fault;

  const objectPort: ProductionDeletionReplayObjectPort = {
    async applyExactObjectDeletion({ manifestChecksum, targets }) {
      const results = [];
      for (const target of targets) {
        const targetRef = `DocumentFileObject:${target.documentFileId}`;
        const existed = existingObjects.delete(targetRef);
        if (existed) appendOnlyJournal.set(targetRef, manifestChecksum);
        results.push({
          proofManifestChecksum: existed
            ? null
            : (appendOnlyJournal.get(targetRef) ?? null),
          status: existed ? ("deleted" as const) : ("already-absent" as const),
          targetRef,
        });
        if (pendingFault === "r2-after-first-delete") {
          pendingFault = "none";
          throw new Error("SYNTHETIC_R2_FAULT_AFTER_FIRST_DELETE");
        }
      }
      return results;
    },
    async findExistingObjects({ targets }) {
      return targets
        .map((target) => `DocumentFileObject:${target.documentFileId}`)
        .filter((targetRef) => existingObjects.has(targetRef));
    },
  };

  const repositoryPort: ProductionDeletionReplayRepositoryPort = {
    async applyExactRecordDeletion({ manifestChecksum, targets }) {
      const results = [];
      for (const target of targets) {
        for (const recordId of target.recordIds) {
          const targetRef = `${target.model}:${recordId}`;
          const existed = existingRecords.delete(targetRef);
          if (existed) appendOnlyJournal.set(targetRef, manifestChecksum);
          results.push({
            proofManifestChecksum: existed
              ? null
              : (appendOnlyJournal.get(targetRef) ?? null),
            status: existed ? ("deleted" as const) : ("already-absent" as const),
            targetRef,
          });
          if (pendingFault === "db-after-first-delete") {
            pendingFault = "none";
            throw new Error("SYNTHETIC_DB_FAULT_AFTER_FIRST_DELETE");
          }
        }
      }
      return results;
    },
    async findExistingRecords({ targets }) {
      return targets
        .flatMap((target) =>
          target.recordIds.map((recordId) => `${target.model}:${recordId}`),
        )
        .filter((targetRef) => existingRecords.has(targetRef));
    },
  };

  return {
    journalEntryCount: () => appendOnlyJournal.size,
    objectPort,
    repositoryPort,
    restoreFromSyntheticBackup() {
      existingObjects.clear();
      existingRecords.clear();
      for (const targetRef of originalObjectRefs) existingObjects.add(targetRef);
      for (const targetRef of originalRecordRefs) existingRecords.add(targetRef);
      return {
        objectCount: existingObjects.size,
        recordCount: existingRecords.size,
      };
    },
  };
}

function isInjectedSyntheticFault(error: unknown) {
  return (
    error instanceof Error &&
    [
      "SYNTHETIC_DB_FAULT_AFTER_FIRST_DELETE",
      "SYNTHETIC_R2_FAULT_AFTER_FIRST_DELETE",
    ].includes(error.message)
  );
}
