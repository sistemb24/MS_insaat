import { createHash } from "node:crypto";

import {
  appendProductionDeletionJournalEntry,
  createProductionDeletionJournalScopePrefix,
  readProductionDeletionJournalChain,
  readProductionDeletionJournalCryptoConfig,
  type ProductionDeletionJournalCryptoConfig,
  type ProductionDeletionJournalStorePort,
} from "./production-deletion-journal";
import {
  buildProductionDeletionReplayManifest,
  createProductionDeletionReplayCheckpoint,
} from "./production-deletion-replay";
import {
  PRODUCTION_DELETION_JOURNAL_BUCKET,
} from "./production-deletion-journal-r2";

export const PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION =
  "production-deletion-journal-provider-rehearsal";
export const PRODUCTION_DELETION_JOURNAL_REHEARSAL_TENANT_ID =
  "tenant-synthetic-journal-provider-rehearsal";

export type ProductionDeletionJournalProviderPhase =
  | "parent-credential-probe"
  | "temporary-credential-probe"
  | "encrypted-append-read";

export type ProductionDeletionJournalProviderRehearsalConfig = {
  accountId: string;
  bucket: typeof PRODUCTION_DELETION_JOURNAL_BUCKET;
  confirmation: typeof PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION;
  crypto: ProductionDeletionJournalCryptoConfig;
  endpoint: string;
  parentAccessKeyId: string;
  parentSecretAccessKey: string;
  releaseId: string;
  runAttempt: number;
  runId: string;
};

export function readProductionDeletionJournalProviderRehearsalConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionDeletionJournalProviderRehearsalConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Journal provider rehearsal yalnız production runtime'da çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("Journal provider rehearsal yalnız main dalında çalışır.");
  }
  const confirmation = env.NOA_PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION;
  if (confirmation !== PRODUCTION_DELETION_JOURNAL_REHEARSAL_CONFIRMATION) {
    throw new Error("Journal provider rehearsal confirmation değeri eşleşmiyor.");
  }
  const releaseId = normalizeSha(
    env.NOA_RELEASE_ID ?? "",
    "Journal provider rehearsal release SHA",
  );
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen journal provider rehearsal SHA",
  );
  if (releaseId !== expectedReleaseId) {
    throw new Error("Journal provider rehearsal exact SHA ile eşleşmiyor.");
  }
  const bucket = env.PRODUCTION_DELETION_JOURNAL_R2_BUCKET?.trim();
  if (bucket !== PRODUCTION_DELETION_JOURNAL_BUCKET) {
    throw new Error("Journal provider rehearsal bucket adı eşleşmiyor.");
  }

  const accountId = normalizeAccountId(env.CLOUDFLARE_ACCOUNT_ID ?? "");
  const endpoint = normalizeEndpoint(
    env.PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT ?? "",
    accountId,
  );
  const parentAccessKeyId = normalizeCredential(
    env.PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID ?? "",
    "Journal parent access key kimliği",
  );
  const parentSecretAccessKey = normalizeSecret(
    env.PRODUCTION_DELETION_JOURNAL_R2_PARENT_SECRET_ACCESS_KEY ?? "",
  );
  const runId = normalizeRunId(env.NOA_RUN_ID ?? "");
  const runAttempt = normalizePositiveInteger(
    env.NOA_RUN_ATTEMPT ?? "",
    "Journal provider rehearsal run attempt",
  );
  const crypto = readProductionDeletionJournalCryptoConfig({
    NOA_RUNTIME_ENV: "production",
    PRODUCTION_DELETION_JOURNAL_KEK:
      env.PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEK,
    PRODUCTION_DELETION_JOURNAL_KEY_VERSION:
      env.PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEY_VERSION,
  });

  return {
    accountId,
    bucket,
    confirmation,
    crypto,
    endpoint,
    parentAccessKeyId,
    parentSecretAccessKey,
    releaseId,
    runAttempt,
    runId,
  };
}

export async function runProductionDeletionJournalCredentialGates<T>(input: {
  createTemporaryClient(): Promise<T>;
  probeParentCredential(): Promise<unknown>;
  probeTemporaryCredential(client: T): Promise<unknown>;
}) {
  try {
    await input.probeParentCredential();
  } catch (error) {
    throw createSafeProductionDeletionJournalProviderError(
      "parent-credential-probe",
      error,
    );
  }

  try {
    const client = await input.createTemporaryClient();
    await input.probeTemporaryCredential(client);
    return client;
  } catch (error) {
    throw createSafeProductionDeletionJournalProviderError(
      "temporary-credential-probe",
      error,
    );
  }
}

export async function runProductionDeletionJournalProviderRehearsal(input: {
  crypto: ProductionDeletionJournalCryptoConfig;
  now: Date;
  releaseId: string;
  runAttempt: number;
  runId: string;
  store: ProductionDeletionJournalStorePort;
}) {
  const releaseId = normalizeSha(input.releaseId, "Rehearsal release SHA");
  const runId = normalizeRunId(input.runId);
  const runAttempt = normalizePositiveInteger(
    String(input.runAttempt),
    "Rehearsal run attempt",
  );
  const now = normalizeDate(input.now);
  const eventId = `provider-rehearsal-${runId}-${runAttempt}`;
  const prefix = createProductionDeletionJournalScopePrefix({
    crypto: input.crypto,
    tenantId: PRODUCTION_DELETION_JOURNAL_REHEARSAL_TENANT_ID,
  });
  const before = await readProductionDeletionJournalChain({
    keyring: { [input.crypto.keyVersion]: input.crypto.kek },
    prefix,
    store: input.store,
  });
  if (before.some((entry) => entry.payload.eventId === eventId)) {
    throw new Error("Journal provider rehearsal event kimliği daha önce kullanılmış.");
  }

  const manifest = buildProductionDeletionReplayManifest({
    activeLegalHoldCount: 0,
    activeSessionCount: 0,
    generatedAt: now,
    inventoryChecksum: createHash("sha256")
      .update("noa-synthetic-journal-provider-rehearsal")
      .digest("hex"),
    lifecycleStatus: "CLOSURE_PENDING",
    lifecycleVersion: 1,
    manifestId: `provider-rehearsal-manifest-${runId}-${runAttempt}`,
    objectTargets: [],
    recordTargets: [],
    releaseId,
    tenantId: PRODUCTION_DELETION_JOURNAL_REHEARSAL_TENANT_ID,
  });
  const appended = await appendProductionDeletionJournalEntry({
    checkpoint: createProductionDeletionReplayCheckpoint(manifest),
    crypto: input.crypto,
    eventId,
    manifest,
    recordedAt: now,
    store: input.store,
  });
  const overwriteResult = await input.store.createObject({
    body: "{\"probe\":\"must-not-overwrite\"}",
    ifNoneMatch: "*",
    key: appended.key,
  });
  if (overwriteResult !== "already-exists") {
    throw new Error("Journal provider rehearsal conditional overwrite reddini doğrulayamadı.");
  }

  const after = await readProductionDeletionJournalChain({
    keyring: { [input.crypto.keyVersion]: input.crypto.kek },
    prefix,
    store: input.store,
  });
  const last = after.at(-1);
  if (
    !last ||
    last.payload.eventId !== eventId ||
    last.envelope.entryChecksum !== appended.entryChecksum ||
    after.length !== appended.sequence
  ) {
    throw new Error("Journal provider rehearsal kalıcı hash-chain doğrulamasını geçemedi.");
  }

  return {
    chainLength: after.length,
    entryChecksum: appended.entryChecksum,
    overwriteRejected: true as const,
    productionBackupDeletionReplayReady: false as const,
    providerRehearsalReady: true as const,
    releaseId,
    sequence: appended.sequence,
  };
}

export function createSafeProductionDeletionJournalProviderError(
  phase: ProductionDeletionJournalProviderPhase,
  error: unknown,
) {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          $metadata?: { httpStatusCode?: number };
          Code?: string;
          name?: string;
        })
      : undefined;
  const providerCode = normalizeSafeProviderCode(
    candidate?.Code ?? candidate?.name ?? "unknown",
  );
  const httpStatus = normalizeSafeHttpStatus(candidate?.$metadata?.httpStatusCode);
  return new Error(
    `Journal provider rehearsal başarısız: phase=${phase} providerCode=${providerCode} httpStatus=${httpStatus}.`,
  );
}

function normalizeSha(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeAccountId(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new Error("Cloudflare account kimliği geçerli değil.");
  }
  return normalized;
}

function normalizeEndpoint(value: string, accountId: string) {
  const expected = `https://${accountId}.eu.r2.cloudflarestorage.com/`;
  let normalized: string;
  try {
    normalized = new URL(value.trim()).toString();
  } catch {
    throw new Error("Journal provider rehearsal R2 endpoint geçerli değil.");
  }
  if (normalized !== expected) {
    throw new Error("Journal provider rehearsal R2 endpoint EU account ile eşleşmiyor.");
  }
  return normalized;
}

function normalizeCredential(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length < 16 || normalized.length > 512 || /\s/.test(normalized)) {
    throw new Error("Journal parent secret access key geçerli değil.");
  }
  return normalized;
}

function normalizeRunId(value: string) {
  const normalized = value.trim();
  if (!/^\d{1,30}$/.test(normalized)) {
    throw new Error("Journal provider rehearsal run kimliği geçerli değil.");
  }
  return normalized;
}

function normalizePositiveInteger(value: string, label: string) {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label} geçerli değil.`);
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Journal provider rehearsal zamanı geçerli değil.");
  }
  return value;
}

function normalizeSafeProviderCode(value: string) {
  return /^[A-Za-z0-9._-]{1,80}$/.test(value) ? value : "unknown";
}

function normalizeSafeHttpStatus(value: number | undefined) {
  return Number.isSafeInteger(value) && (value ?? 0) >= 100 && (value ?? 0) <= 599
    ? String(value)
    : "unknown";
}
