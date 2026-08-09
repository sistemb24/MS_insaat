import { createHash } from "node:crypto";

import { normalizeDocumentStorageKey } from "./document-storage";
import {
  PRODUCTION_RETENTION_DECISIONS,
  PRODUCTION_RETENTION_POLICY_VERSION,
  REQUIRED_RETENTION_CATEGORIES,
  approvedRetentionDecisionId,
  type RetentionCategory,
} from "./production-retention-policy";
import {
  PRODUCTION_TENANT_MODEL_CATEGORIES,
  type ProductionTenantModel,
} from "./production-tenant-inventory";

export const PRODUCTION_DELETION_REPLAY_SCHEMA_VERSION = 1;

export type ProductionDeletionRecordTargetInput = {
  category: RetentionCategory;
  decisionId: string;
  eligibilityEvidenceId: string;
  eligibleAt: Date;
  model: ProductionTenantModel;
  recordIds: readonly string[];
  ruleId: string;
};

export type ProductionDeletionObjectTargetInput = {
  documentFileId: string;
  sizeBytes: number;
  storageKey: string;
};

export type ProductionDeletionReplayManifestInput = {
  activeLegalHoldCount: number;
  activeSessionCount: number;
  generatedAt: Date;
  inventoryChecksum: string;
  lifecycleStatus: "CLOSURE_PENDING";
  lifecycleVersion: number;
  manifestId: string;
  objectTargets: readonly ProductionDeletionObjectTargetInput[];
  recordTargets: readonly ProductionDeletionRecordTargetInput[];
  releaseId: string;
  tenantId: string;
};

export type ProductionDeletionReplayManifest = ReturnType<
  typeof buildProductionDeletionReplayManifest
>;

export type ProductionDeletionReplayStatus =
  | "PREPARED"
  | "R2_APPLIED"
  | "DB_APPLIED"
  | "VERIFIED";

export type ProductionDeletionReplayCheckpoint = {
  manifestChecksum: string;
  manifestId: string;
  status: ProductionDeletionReplayStatus;
};

type DeletionResult = {
  proofManifestChecksum: string | null;
  status: "already-absent" | "deleted";
  targetRef: string;
};

export type ProductionDeletionReplayObjectPort = {
  applyExactObjectDeletion(input: {
    manifestChecksum: string;
    manifestId: string;
    targets: ProductionDeletionReplayManifest["objectTargets"];
    tenantId: string;
  }): Promise<readonly DeletionResult[]>;
  findExistingObjects(input: {
    targets: ProductionDeletionReplayManifest["objectTargets"];
    tenantId: string;
  }): Promise<readonly string[]>;
};

export type ProductionDeletionReplayRepositoryPort = {
  applyExactRecordDeletion(input: {
    manifestChecksum: string;
    manifestId: string;
    targets: ProductionDeletionReplayManifest["recordTargets"];
    tenantId: string;
  }): Promise<readonly DeletionResult[]>;
  findExistingRecords(input: {
    targets: ProductionDeletionReplayManifest["recordTargets"];
    tenantId: string;
  }): Promise<readonly string[]>;
};

export function buildProductionDeletionReplayManifest(
  input: ProductionDeletionReplayManifestInput,
) {
  const generatedAt = normalizeDate(input.generatedAt, "Manifest üretim zamanı");
  const generatedAtMs = Date.parse(generatedAt);
  const tenantId = normalizeIdentifier(input.tenantId, "Tenant kimliği");
  const releaseId = normalizeReleaseId(input.releaseId);
  const manifestId = normalizeIdentifier(input.manifestId, "İmha manifesti kimliği");
  const inventoryChecksum = normalizeSha256(
    input.inventoryChecksum,
    "Envanter checksum değeri",
  );

  if (input.lifecycleStatus !== "CLOSURE_PENDING") {
    throw new Error("İmha manifesti yalnız CLOSURE_PENDING tenant için hazırlanır.");
  }
  assertPositiveInteger(input.lifecycleVersion, "Tenant yaşam döngüsü sürümü");
  assertNonNegativeInteger(input.activeSessionCount, "Aktif oturum sayısı");
  assertNonNegativeInteger(input.activeLegalHoldCount, "Aktif legal hold sayısı");
  if (input.activeSessionCount !== 0) {
    throw new Error("İmha manifesti aktif oturum varken hazırlanamaz.");
  }
  if (input.activeLegalHoldCount !== 0) {
    throw new Error("İmha manifesti aktif legal hold varken hazırlanamaz.");
  }

  const recordTargets = normalizeRecordTargets(input.recordTargets, generatedAtMs);
  const objectTargets = normalizeObjectTargets(input.objectTargets);
  assertDocumentObjectPairing(recordTargets, objectTargets);

  const payload = {
    activeLegalHoldCount: input.activeLegalHoldCount,
    activeSessionCount: input.activeSessionCount,
    generatedAt,
    inventoryChecksum,
    lifecycleStatus: input.lifecycleStatus,
    lifecycleVersion: input.lifecycleVersion,
    manifestId,
    objectTargets,
    recordTargets,
    releaseId,
    retentionPolicyVersion: PRODUCTION_RETENTION_POLICY_VERSION,
    schemaVersion: PRODUCTION_DELETION_REPLAY_SCHEMA_VERSION,
    tenantId,
  };

  return {
    ...payload,
    checksum: checksumPayload(payload),
  };
}

export function buildProductionDeletionReplayEvidence(
  manifest: ProductionDeletionReplayManifest,
) {
  assertManifestIntegrity(manifest);
  const categoryCounts = new Map<RetentionCategory, { modelCount: number; recordCount: number }>();
  for (const category of REQUIRED_RETENTION_CATEGORIES) {
    categoryCounts.set(category, { modelCount: 0, recordCount: 0 });
  }
  for (const target of manifest.recordTargets) {
    const current = categoryCounts.get(target.category);
    if (!current) throw new Error("İmha manifesti bilinmeyen kategori içeriyor.");
    current.modelCount += 1;
    current.recordCount = addSafe(current.recordCount, target.recordIds.length);
  }

  return {
    categories: REQUIRED_RETENTION_CATEGORIES.map((category) => ({
      category,
      ...categoryCounts.get(category)!,
    })),
    generatedAt: manifest.generatedAt,
    manifestChecksum: manifest.checksum,
    manifestId: manifest.manifestId,
    modelCount: manifest.recordTargets.length,
    objectCount: manifest.objectTargets.length,
    objectSizeBytes: sumSafe(manifest.objectTargets.map((target) => target.sizeBytes)),
    recordCount: sumSafe(
      manifest.recordTargets.map((target) => target.recordIds.length),
    ),
    releaseId: manifest.releaseId,
    retentionPolicyVersion: manifest.retentionPolicyVersion,
    schemaVersion: manifest.schemaVersion,
    sensitiveTargetsIncluded: false as const,
    tenantId: manifest.tenantId,
  };
}

export function createProductionDeletionReplayCheckpoint(
  manifest: ProductionDeletionReplayManifest,
): ProductionDeletionReplayCheckpoint {
  assertManifestIntegrity(manifest);
  return {
    manifestChecksum: manifest.checksum,
    manifestId: manifest.manifestId,
    status: "PREPARED",
  };
}

export function buildProductionDeletionReplayVerificationEvidence(input: {
  checkpoint: ProductionDeletionReplayCheckpoint;
  manifest: ProductionDeletionReplayManifest;
}) {
  assertManifestIntegrity(input.manifest);
  assertCheckpoint(input.checkpoint, input.manifest);
  if (input.checkpoint.status !== "VERIFIED") {
    throw new Error("Backup silme-tekrar hazırlığı yalnız VERIFIED checkpoint ile kanıtlanır.");
  }
  return {
    ...buildProductionDeletionReplayEvidence(input.manifest),
    backupDeletionReplayReady: true as const,
    replayStatus: input.checkpoint.status,
  };
}

export async function advanceProductionDeletionReplay(input: {
  checkpoint: ProductionDeletionReplayCheckpoint;
  manifest: ProductionDeletionReplayManifest;
  objectPort: ProductionDeletionReplayObjectPort;
  repositoryPort: ProductionDeletionReplayRepositoryPort;
}): Promise<ProductionDeletionReplayCheckpoint> {
  assertManifestIntegrity(input.manifest);
  assertCheckpoint(input.checkpoint, input.manifest);

  if (input.checkpoint.status === "VERIFIED") return input.checkpoint;

  if (input.checkpoint.status === "PREPARED") {
    const results = await input.objectPort.applyExactObjectDeletion({
      manifestChecksum: input.manifest.checksum,
      manifestId: input.manifest.manifestId,
      targets: input.manifest.objectTargets,
      tenantId: input.manifest.tenantId,
    });
    assertDeletionResults(
      results,
      input.manifest.objectTargets.map(objectTargetRef),
      input.manifest.checksum,
      "R2",
    );
    return { ...input.checkpoint, status: "R2_APPLIED" };
  }

  if (input.checkpoint.status === "R2_APPLIED") {
    const results = await input.repositoryPort.applyExactRecordDeletion({
      manifestChecksum: input.manifest.checksum,
      manifestId: input.manifest.manifestId,
      targets: input.manifest.recordTargets,
      tenantId: input.manifest.tenantId,
    });
    assertDeletionResults(
      results,
      input.manifest.recordTargets.flatMap((target) =>
        target.recordIds.map((recordId) => recordTargetRef(target.model, recordId)),
      ),
      input.manifest.checksum,
      "DB",
    );
    return { ...input.checkpoint, status: "DB_APPLIED" };
  }

  const [existingObjects, existingRecords] = await Promise.all([
    input.objectPort.findExistingObjects({
      targets: input.manifest.objectTargets,
      tenantId: input.manifest.tenantId,
    }),
    input.repositoryPort.findExistingRecords({
      targets: input.manifest.recordTargets,
      tenantId: input.manifest.tenantId,
    }),
  ]);
  if (existingObjects.length > 0 || existingRecords.length > 0) {
    throw new Error("İmha replay doğrulaması hedeflerin hâlâ mevcut olduğunu gösteriyor.");
  }
  return { ...input.checkpoint, status: "VERIFIED" };
}

function normalizeRecordTargets(
  targets: readonly ProductionDeletionRecordTargetInput[],
  generatedAtMs: number,
) {
  const models = new Set<ProductionTenantModel>();
  return targets
    .map((target) => {
      if (models.has(target.model)) {
        throw new Error("İmha manifesti tekrar eden model hedefi içeriyor.");
      }
      models.add(target.model);
      if (PRODUCTION_TENANT_MODEL_CATEGORIES[target.model] !== target.category) {
        throw new Error("İmha manifesti model/kategori eşleşmesi geçerli değil.");
      }
      if (target.decisionId !== approvedRetentionDecisionId(target.category)) {
        throw new Error("İmha manifesti retention karar kimliği onaylı değil.");
      }
      const rules = PRODUCTION_RETENTION_DECISIONS[target.category].rules;
      if (!rules.some((rule) => rule.ruleId === target.ruleId)) {
        throw new Error("İmha manifesti retention kural kimliği onaylı değil.");
      }
      const eligibilityEvidenceId = normalizeIdentifier(
        target.eligibilityEvidenceId,
        "İmha uygunluk kanıtı kimliği",
      );
      const eligibleAt = normalizeDate(target.eligibleAt, "İmha uygunluk zamanı");
      if (Date.parse(eligibleAt) > generatedAtMs) {
        throw new Error("İmha manifesti henüz uygun olmayan kayıt içeriyor.");
      }
      const recordIds = target.recordIds.map((recordId) =>
        normalizeIdentifier(recordId, "Kayıt kimliği"),
      );
      if (recordIds.length === 0) {
        throw new Error("İmha manifesti boş model hedefi içeriyor.");
      }
      if (new Set(recordIds).size !== recordIds.length) {
        throw new Error("İmha manifesti tekrar eden kayıt kimliği içeriyor.");
      }
      return {
        category: target.category,
        decisionId: target.decisionId,
        eligibilityEvidenceId,
        eligibleAt,
        model: target.model,
        recordIds: [...recordIds].sort(),
        ruleId: target.ruleId,
      };
    })
    .sort((left, right) => left.model.localeCompare(right.model));
}

function normalizeObjectTargets(
  targets: readonly ProductionDeletionObjectTargetInput[],
) {
  const documentIds = new Set<string>();
  const storageKeys = new Set<string>();
  return targets
    .map((target) => {
      const documentFileId = normalizeIdentifier(
        target.documentFileId,
        "DocumentFile kimliği",
      );
      const storageKey = normalizeDocumentStorageKey(target.storageKey);
      assertNonNegativeInteger(target.sizeBytes, "Doküman nesne boyutu");
      if (documentIds.has(documentFileId) || storageKeys.has(storageKey)) {
        throw new Error("İmha manifesti tekrar eden doküman hedefi içeriyor.");
      }
      documentIds.add(documentFileId);
      storageKeys.add(storageKey);
      return { documentFileId, sizeBytes: target.sizeBytes, storageKey };
    })
    .sort((left, right) => left.documentFileId.localeCompare(right.documentFileId));
}

function assertDocumentObjectPairing(
  recordTargets: ReturnType<typeof normalizeRecordTargets>,
  objectTargets: ReturnType<typeof normalizeObjectTargets>,
) {
  const documentRecordIds =
    recordTargets.find((target) => target.model === "DocumentFile")?.recordIds ?? [];
  const objectDocumentIds = objectTargets.map((target) => target.documentFileId);
  if (
    documentRecordIds.length !== objectDocumentIds.length ||
    documentRecordIds.some((recordId, index) => recordId !== objectDocumentIds[index])
  ) {
    throw new Error("DocumentFile kayıtları ile R2 nesne hedefleri birebir eşleşmiyor.");
  }
}

function assertManifestIntegrity(manifest: ProductionDeletionReplayManifest) {
  const { checksum, ...payload } = manifest;
  if (checksumPayload(payload) !== checksum) {
    throw new Error("İmha manifesti checksum doğrulamasını geçemedi.");
  }
}

function assertCheckpoint(
  checkpoint: ProductionDeletionReplayCheckpoint,
  manifest: ProductionDeletionReplayManifest,
) {
  if (
    checkpoint.manifestId !== manifest.manifestId ||
    checkpoint.manifestChecksum !== manifest.checksum
  ) {
    throw new Error("İmha replay checkpoint'i manifest ile eşleşmiyor.");
  }
}

function assertDeletionResults(
  results: readonly DeletionResult[],
  expectedRefs: readonly string[],
  manifestChecksum: string,
  label: string,
) {
  const expected = [...expectedRefs].sort();
  const received = results.map((result) => result.targetRef).sort();
  if (new Set(received).size !== received.length || JSON.stringify(received) !== JSON.stringify(expected)) {
    throw new Error(`${label} imha sonucu exact hedeflerle eşleşmiyor.`);
  }
  for (const result of results) {
    if (!(result.status === "deleted" || result.status === "already-absent")) {
      throw new Error(`${label} imha sonucu geçerli bir durum taşımıyor.`);
    }
    if (
      result.status === "already-absent" &&
      result.proofManifestChecksum !== manifestChecksum
    ) {
      throw new Error(`${label} eksik hedef için aynı manifest idempotency kanıtı yok.`);
    }
  }
}

function objectTargetRef(target: { documentFileId: string }) {
  return `DocumentFileObject:${target.documentFileId}`;
}

function recordTargetRef(model: ProductionTenantModel, recordId: string) {
  return `${model}:${recordId}`;
}

function checksumPayload(payload: object) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeReleaseId(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("Production release kimliği geçerli değil.");
  }
  return normalized;
}

function normalizeSha256(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} geçerli değil.`);
  }
  return value.toISOString();
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} geçerli değil.`);
  }
}

function addSafe(left: number, right: number) {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new Error("İmha manifesti toplamı güvenli tam sayı sınırını aşıyor.");
  }
  return total;
}

function sumSafe(values: readonly number[]) {
  return values.reduce(addSafe, 0);
}
