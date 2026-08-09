import {
  PRODUCTION_DELETION_JOURNAL_BUCKET,
} from "./production-deletion-journal-r2";
import { PRODUCTION_DELETION_JOURNAL_RETENTION_DAYS } from "./production-deletion-journal";

export const PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX = "journal/";
export const PRODUCTION_DELETION_JOURNAL_RETENTION_SECONDS =
  PRODUCTION_DELETION_JOURNAL_RETENTION_DAYS * 24 * 60 * 60;
export const PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS = [
  "GetObject",
  "ListObjectsV2",
  "PutObject",
] as const;

type JournalLockCondition =
  | { maxAgeSeconds: number; type: "Age" }
  | { type: "Indefinite" };

export type ProductionDeletionJournalProviderSnapshot = {
  appendCredential: {
    actions: readonly string[];
    bucket: string;
    prefix: string;
    sessionToken: true;
    ttlSeconds: number;
    type: "temporary-explicit-actions";
  };
  bucket: {
    jurisdiction: string;
    name: string;
  };
  bucketConfigCredentialExposedToRuntime: boolean;
  lifecycleRules: readonly {
    deleteAfterSeconds: number | null;
    enabled: boolean;
    id: string;
    prefix: string;
  }[];
  lockRules: readonly {
    condition: JournalLockCondition;
    enabled: boolean;
    id: string;
    prefix: string;
  }[];
  readCredential: {
    bucket: string;
    permission: "object-read-only";
    prefix: string;
  };
};

export type ProductionDeletionJournalProviderPreflightEvidence = {
  appendActions: readonly string[];
  bucketName: typeof PRODUCTION_DELETION_JOURNAL_BUCKET;
  jurisdiction: "eu";
  lifecycleConflictCount: 0;
  lockRuleId: string;
  providerPreflightReady: true;
  retentionSeconds: number | "indefinite";
};

export function evaluateProductionDeletionJournalProviderPreflight(
  snapshot: ProductionDeletionJournalProviderSnapshot,
): ProductionDeletionJournalProviderPreflightEvidence {
  if (snapshot.bucket.name !== PRODUCTION_DELETION_JOURNAL_BUCKET) {
    throw new Error("Journal provider bucket adı onaylanan değer değil.");
  }
  if (snapshot.bucket.jurisdiction !== "eu") {
    throw new Error("Journal provider bucket EU jurisdiction içinde değil.");
  }
  if (snapshot.bucketConfigCredentialExposedToRuntime) {
    throw new Error("Journal bucket-config credential runtime'a açılamaz.");
  }

  const lockRule = snapshot.lockRules.find(
    (rule) =>
      rule.enabled &&
      rule.prefix === PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX &&
      (rule.condition.type === "Indefinite" ||
        (rule.condition.type === "Age" &&
          Number.isSafeInteger(rule.condition.maxAgeSeconds) &&
          rule.condition.maxAgeSeconds >=
            PRODUCTION_DELETION_JOURNAL_RETENTION_SECONDS)),
  );
  if (!lockRule) {
    throw new Error("Journal prefix için en az 1.095 günlük Bucket Lock bulunamadı.");
  }

  const lifecycleConflicts = snapshot.lifecycleRules.filter(
    (rule) =>
      rule.enabled &&
      rule.deleteAfterSeconds !== null &&
      prefixesOverlap(rule.prefix, PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX),
  );
  if (lifecycleConflicts.length > 0) {
    throw new Error("Journal prefix ile çakışan lifecycle delete kuralı bulundu.");
  }

  validateAppendCredential(snapshot.appendCredential);
  if (
    snapshot.readCredential.bucket !== PRODUCTION_DELETION_JOURNAL_BUCKET ||
    snapshot.readCredential.permission !== "object-read-only" ||
    snapshot.readCredential.prefix !== PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX
  ) {
    throw new Error("Journal read credential exact bucket/prefix read-only değil.");
  }

  return {
    appendActions: PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
    bucketName: PRODUCTION_DELETION_JOURNAL_BUCKET,
    jurisdiction: "eu",
    lifecycleConflictCount: 0,
    lockRuleId: normalizeSafeId(lockRule.id, "Journal lock rule kimliği"),
    providerPreflightReady: true,
    retentionSeconds:
      lockRule.condition.type === "Indefinite"
        ? "indefinite"
        : lockRule.condition.maxAgeSeconds,
  };
}

function validateAppendCredential(
  credential: ProductionDeletionJournalProviderSnapshot["appendCredential"],
) {
  if (
    credential.type !== "temporary-explicit-actions" ||
    credential.bucket !== PRODUCTION_DELETION_JOURNAL_BUCKET ||
    credential.prefix !== PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX ||
    credential.sessionToken !== true ||
    !Number.isSafeInteger(credential.ttlSeconds) ||
    credential.ttlSeconds < 60 ||
    credential.ttlSeconds > 604_800
  ) {
    throw new Error("Journal append credential kısa ömürlü exact bucket/prefix değil.");
  }
  const actions = [...credential.actions].sort();
  const expected = [...PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS].sort();
  if (
    actions.length !== expected.length ||
    actions.some((action, index) => action !== expected[index])
  ) {
    throw new Error("Journal append credential izinleri exact action allowlist değil.");
  }
}

function prefixesOverlap(left: string, right: string) {
  const normalizedLeft = normalizePrefix(left, "Lifecycle prefix");
  return normalizedLeft === "" || right.startsWith(normalizedLeft) || normalizedLeft.startsWith(right);
}

function normalizePrefix(value: string, label: string) {
  const normalized = value.trim();
  if (normalized && !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeSafeId(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,119}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}
