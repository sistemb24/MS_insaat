import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import {
  buildProductionDeletionReplayEvidence,
  type ProductionDeletionReplayCheckpoint,
  type ProductionDeletionReplayManifest,
} from "./production-deletion-replay";

export const PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION = 1;
export const PRODUCTION_DELETION_JOURNAL_ALGORITHM = "AES-256-GCM";
export const PRODUCTION_DELETION_JOURNAL_PREFIX = "journal/v1";
export const PRODUCTION_DELETION_JOURNAL_RETENTION_DAYS = 1_095;

export type ProductionDeletionJournalCryptoConfig = {
  kek: Uint8Array;
  keyVersion: string;
};

export type ProductionDeletionJournalEnvelope = {
  algorithm: typeof PRODUCTION_DELETION_JOURNAL_ALGORITHM;
  authTag: string;
  ciphertext: string;
  entryChecksum: string;
  iv: string;
  keyVersion: string;
  salt: string;
  schemaVersion: typeof PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION;
  scopeHash: string;
  sequence: number;
};

export type ProductionDeletionJournalPayload = {
  checkpoint: ProductionDeletionReplayCheckpoint;
  eventId: string;
  manifest: ProductionDeletionReplayManifest;
  previousEntryChecksum: string | null;
  recordedAt: string;
  schemaVersion: typeof PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION;
  sequence: number;
};

export type ProductionDeletionJournalObject = {
  body: string;
  entryChecksum: string;
  key: string;
};

export type ProductionDeletionJournalStorePort = {
  createObject(input: {
    body: string;
    ifNoneMatch: "*";
    key: string;
  }): Promise<"already-exists" | "created">;
  listObjects(input: {
    prefix: string;
  }): Promise<readonly { body: string; key: string }[]>;
};

export function readProductionDeletionJournalCryptoConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionDeletionJournalCryptoConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Production imha journal anahtarı yalnız production runtime'da okunur.");
  }
  const keyVersion = normalizeIdentifier(
    env.PRODUCTION_DELETION_JOURNAL_KEY_VERSION ?? "",
    "Journal anahtar sürümü",
  );
  const kek = decodeBase64(
    env.PRODUCTION_DELETION_JOURNAL_KEK ?? "",
    "Journal KEK",
  );
  if (kek.byteLength !== 32) {
    throw new Error("Journal KEK tam olarak 32 byte olmalıdır.");
  }
  return { kek, keyVersion };
}

export function sealProductionDeletionJournalEntry(input: {
  checkpoint: ProductionDeletionReplayCheckpoint;
  crypto: ProductionDeletionJournalCryptoConfig;
  eventId: string;
  manifest: ProductionDeletionReplayManifest;
  previousEntryChecksum: string | null;
  recordedAt: Date;
  sequence: number;
}): ProductionDeletionJournalObject {
  validateManifestAndCheckpoint(input.manifest, input.checkpoint);
  const sequence = normalizeSequence(input.sequence);
  const eventId = normalizeIdentifier(input.eventId, "Journal event kimliği");
  const keyVersion = normalizeIdentifier(
    input.crypto.keyVersion,
    "Journal anahtar sürümü",
  );
  const kek = normalizeKek(input.crypto.kek);
  const previousEntryChecksum = normalizePreviousChecksum(
    input.previousEntryChecksum,
    sequence,
  );
  const recordedAt = normalizeDate(input.recordedAt);
  const scopeHash = createScopeHash({
    kek,
    keyVersion,
    tenantId: input.manifest.tenantId,
  });
  const key = createJournalObjectKey({ eventId, scopeHash, sequence });
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const encryptionKey = deriveKey({
    info: `noa-production-deletion-journal/envelope/${keyVersion}`,
    kek,
    salt,
  });
  const payload: ProductionDeletionJournalPayload = {
    checkpoint: { ...input.checkpoint },
    eventId,
    manifest: input.manifest,
    previousEntryChecksum,
    recordedAt,
    schemaVersion: PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION,
    sequence,
  };
  const aad = createAad({ key, keyVersion, scopeHash, sequence });
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const envelopeWithoutChecksum = {
    algorithm: PRODUCTION_DELETION_JOURNAL_ALGORITHM,
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    keyVersion,
    salt: salt.toString("base64"),
    schemaVersion: PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION,
    scopeHash,
    sequence,
  } as const;
  const entryChecksum = checksum(envelopeWithoutChecksum);
  const envelope: ProductionDeletionJournalEnvelope = {
    ...envelopeWithoutChecksum,
    entryChecksum,
  };
  return { body: JSON.stringify(envelope), entryChecksum, key };
}

export function openProductionDeletionJournalEntry(input: {
  body: string;
  key: string;
  keyring: Readonly<Record<string, Uint8Array>>;
}) {
  const envelope = parseEnvelope(input.body);
  const expectedChecksum = checksum(envelopeWithoutChecksum(envelope));
  if (expectedChecksum !== envelope.entryChecksum) {
    throw new Error("Journal envelope checksum doğrulamasını geçemedi.");
  }
  const kekCandidate = input.keyring[envelope.keyVersion];
  if (!kekCandidate) {
    throw new Error("Journal anahtar sürümü keyring içinde bulunamadı.");
  }
  const kek = normalizeKek(kekCandidate);
  const salt = decodeBase64(envelope.salt, "Journal salt");
  const iv = decodeBase64(envelope.iv, "Journal IV");
  const authTag = decodeBase64(envelope.authTag, "Journal auth tag");
  const ciphertext = decodeBase64(envelope.ciphertext, "Journal ciphertext");
  if (salt.byteLength !== 32 || iv.byteLength !== 12 || authTag.byteLength !== 16) {
    throw new Error("Journal kriptografi parametre uzunluğu geçerli değil.");
  }
  const encryptionKey = deriveKey({
    info: `noa-production-deletion-journal/envelope/${envelope.keyVersion}`,
    kek,
    salt,
  });
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAAD(
      Buffer.from(
        createAad({
          key: input.key,
          keyVersion: envelope.keyVersion,
          scopeHash: envelope.scopeHash,
          sequence: envelope.sequence,
        }),
        "utf8",
      ),
    );
    decipher.setAuthTag(authTag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Journal ciphertext, AAD veya anahtar doğrulaması başarısız.");
  }
  const payload = parsePayload(plaintext.toString("utf8"));
  validateManifestAndCheckpoint(payload.manifest, payload.checkpoint);
  if (payload.sequence !== envelope.sequence) {
    throw new Error("Journal payload ve envelope sequence değeri eşleşmiyor.");
  }
  const expectedScopeHash = createScopeHash({
    kek,
    keyVersion: envelope.keyVersion,
    tenantId: payload.manifest.tenantId,
  });
  if (expectedScopeHash !== envelope.scopeHash) {
    throw new Error("Journal tenant scope hash değeri eşleşmiyor.");
  }
  const expectedKey = createJournalObjectKey({
    eventId: payload.eventId,
    scopeHash: envelope.scopeHash,
    sequence: payload.sequence,
  });
  if (expectedKey !== input.key) {
    throw new Error("Journal object key payload ile eşleşmiyor.");
  }
  return { envelope, payload };
}

export async function appendProductionDeletionJournalEntry(input: {
  checkpoint: ProductionDeletionReplayCheckpoint;
  crypto: ProductionDeletionJournalCryptoConfig;
  eventId: string;
  manifest: ProductionDeletionReplayManifest;
  recordedAt: Date;
  store: ProductionDeletionJournalStorePort;
}) {
  const prefix = createScopePrefix({
    crypto: input.crypto,
    tenantId: input.manifest.tenantId,
  });
  const chain = await readProductionDeletionJournalChain({
    keyring: { [input.crypto.keyVersion]: input.crypto.kek },
    prefix,
    store: input.store,
  });
  const previousEntryChecksum = chain.at(-1)?.envelope.entryChecksum ?? null;
  const entry = sealProductionDeletionJournalEntry({
    checkpoint: input.checkpoint,
    crypto: input.crypto,
    eventId: input.eventId,
    manifest: input.manifest,
    previousEntryChecksum,
    recordedAt: input.recordedAt,
    sequence: chain.length + 1,
  });
  const result = await input.store.createObject({
    body: entry.body,
    ifNoneMatch: "*",
    key: entry.key,
  });
  if (result !== "created") {
    throw new Error("Journal object key zaten var; append-only overwrite reddedildi.");
  }
  return {
    entryChecksum: entry.entryChecksum,
    key: entry.key,
    sequence: chain.length + 1,
  };
}

export async function readProductionDeletionJournalChain(input: {
  keyring: Readonly<Record<string, Uint8Array>>;
  prefix: string;
  store: ProductionDeletionJournalStorePort;
}) {
  const prefix = normalizePrefix(input.prefix);
  const objects = await input.store.listObjects({ prefix });
  const entries = objects.map((object) =>
    openProductionDeletionJournalEntry({
      body: object.body,
      key: object.key,
      keyring: input.keyring,
    }),
  );
  entries.sort(
    (left, right) =>
      left.payload.sequence - right.payload.sequence ||
      left.payload.eventId.localeCompare(right.payload.eventId),
  );
  let previousEntryChecksum: string | null = null;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const expectedSequence = index + 1;
    if (entry.payload.sequence !== expectedSequence) {
      const duplicate = entries.some(
        (candidate, candidateIndex) =>
          candidateIndex !== index &&
          candidate.payload.sequence === entry.payload.sequence,
      );
      throw new Error(
        duplicate
          ? "Journal hash chain fork içeriyor."
          : "Journal hash chain sequence boşluğu içeriyor.",
      );
    }
    if (entry.payload.previousEntryChecksum !== previousEntryChecksum) {
      throw new Error("Journal önceki entry checksum zinciri eşleşmiyor.");
    }
    previousEntryChecksum = entry.envelope.entryChecksum;
  }
  return entries;
}

export function createInMemoryProductionDeletionJournalStore(): ProductionDeletionJournalStorePort {
  const objects = new Map<string, string>();
  return {
    async createObject({ body, ifNoneMatch, key }) {
      if (ifNoneMatch !== "*") {
        throw new Error("Journal store yalnız If-None-Match=* kabul eder.");
      }
      if (objects.has(key)) return "already-exists";
      objects.set(key, body);
      return "created";
    },
    async listObjects({ prefix }) {
      return [...objects.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, body]) => ({ body, key }));
    },
  };
}

export function createProductionDeletionJournalScopePrefix(input: {
  crypto: ProductionDeletionJournalCryptoConfig;
  tenantId: string;
}) {
  return createScopePrefix(input);
}

function createScopePrefix(input: {
  crypto: ProductionDeletionJournalCryptoConfig;
  tenantId: string;
}) {
  const keyVersion = normalizeIdentifier(
    input.crypto.keyVersion,
    "Journal anahtar sürümü",
  );
  const scopeHash = createScopeHash({
    kek: normalizeKek(input.crypto.kek),
    keyVersion,
    tenantId: normalizeIdentifier(input.tenantId, "Tenant kimliği"),
  });
  return `${PRODUCTION_DELETION_JOURNAL_PREFIX}/${scopeHash}/`;
}

function createScopeHash(input: {
  kek: Uint8Array;
  keyVersion: string;
  tenantId: string;
}) {
  const scopeKey = deriveKey({
    info: `noa-production-deletion-journal/scope/${input.keyVersion}`,
    kek: input.kek,
    salt: Buffer.alloc(32),
  });
  return createHmac("sha256", scopeKey).update(input.tenantId).digest("hex");
}

function createJournalObjectKey(input: {
  eventId: string;
  scopeHash: string;
  sequence: number;
}) {
  return `${PRODUCTION_DELETION_JOURNAL_PREFIX}/${input.scopeHash}/${String(
    input.sequence,
  ).padStart(12, "0")}-${input.eventId}.json.enc`;
}

function createAad(input: {
  key: string;
  keyVersion: string;
  scopeHash: string;
  sequence: number;
}) {
  return JSON.stringify({
    algorithm: PRODUCTION_DELETION_JOURNAL_ALGORITHM,
    key: input.key,
    keyVersion: input.keyVersion,
    schemaVersion: PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION,
    scopeHash: input.scopeHash,
    sequence: input.sequence,
  });
}

function deriveKey(input: {
  info: string;
  kek: Uint8Array;
  salt: Uint8Array;
}) {
  return Buffer.from(
    hkdfSync("sha256", input.kek, input.salt, Buffer.from(input.info), 32),
  );
}

function parseEnvelope(body: string): ProductionDeletionJournalEnvelope {
  let candidate: unknown;
  try {
    candidate = JSON.parse(body);
  } catch {
    throw new Error("Journal envelope geçerli JSON değil.");
  }
  if (!isRecord(candidate)) throw new Error("Journal envelope geçerli değil.");
  const envelope = {
    algorithm: candidate.algorithm,
    authTag: candidate.authTag,
    ciphertext: candidate.ciphertext,
    entryChecksum: candidate.entryChecksum,
    iv: candidate.iv,
    keyVersion: candidate.keyVersion,
    salt: candidate.salt,
    schemaVersion: candidate.schemaVersion,
    scopeHash: candidate.scopeHash,
    sequence: candidate.sequence,
  };
  if (
    envelope.algorithm !== PRODUCTION_DELETION_JOURNAL_ALGORITHM ||
    envelope.schemaVersion !== PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION ||
    typeof envelope.authTag !== "string" ||
    typeof envelope.ciphertext !== "string" ||
    typeof envelope.entryChecksum !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.keyVersion !== "string" ||
    typeof envelope.salt !== "string" ||
    typeof envelope.scopeHash !== "string" ||
    typeof envelope.sequence !== "number"
  ) {
    throw new Error("Journal envelope alanları geçerli değil.");
  }
  normalizeIdentifier(envelope.keyVersion, "Journal anahtar sürümü");
  normalizeSequence(envelope.sequence);
  normalizeSha256(envelope.scopeHash, "Journal scope hash");
  normalizeSha256(envelope.entryChecksum, "Journal entry checksum");
  return envelope as ProductionDeletionJournalEnvelope;
}

function parsePayload(value: string): ProductionDeletionJournalPayload {
  let candidate: unknown;
  try {
    candidate = JSON.parse(value);
  } catch {
    throw new Error("Journal payload geçerli JSON değil.");
  }
  if (!isRecord(candidate)) throw new Error("Journal payload geçerli değil.");
  if (
    candidate.schemaVersion !== PRODUCTION_DELETION_JOURNAL_SCHEMA_VERSION ||
    typeof candidate.eventId !== "string" ||
    typeof candidate.recordedAt !== "string" ||
    typeof candidate.sequence !== "number" ||
    !(candidate.previousEntryChecksum === null ||
      typeof candidate.previousEntryChecksum === "string") ||
    !isRecord(candidate.manifest) ||
    !isRecord(candidate.checkpoint)
  ) {
    throw new Error("Journal payload alanları geçerli değil.");
  }
  normalizeIdentifier(candidate.eventId, "Journal event kimliği");
  normalizeIsoString(candidate.recordedAt, "Journal kayıt zamanı");
  normalizeSequence(candidate.sequence);
  normalizePreviousChecksum(candidate.previousEntryChecksum, candidate.sequence);
  return candidate as unknown as ProductionDeletionJournalPayload;
}

function validateManifestAndCheckpoint(
  manifest: ProductionDeletionReplayManifest,
  checkpoint: ProductionDeletionReplayCheckpoint,
) {
  buildProductionDeletionReplayEvidence(manifest);
  if (
    checkpoint.manifestId !== manifest.manifestId ||
    checkpoint.manifestChecksum !== manifest.checksum ||
    !(["PREPARED", "R2_APPLIED", "DB_APPLIED", "VERIFIED"] as const).includes(
      checkpoint.status,
    )
  ) {
    throw new Error("Journal checkpoint manifest ile eşleşmiyor.");
  }
}

function envelopeWithoutChecksum(envelope: ProductionDeletionJournalEnvelope) {
  return {
    algorithm: envelope.algorithm,
    authTag: envelope.authTag,
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    keyVersion: envelope.keyVersion,
    salt: envelope.salt,
    schemaVersion: envelope.schemaVersion,
    scopeHash: envelope.scopeHash,
    sequence: envelope.sequence,
  };
}

function normalizePreviousChecksum(value: string | null, sequence: number) {
  if (sequence === 1 && value !== null) {
    throw new Error("İlk journal entry previous checksum taşıyamaz.");
  }
  if (sequence > 1 && value === null) {
    throw new Error("Journal entry previous checksum olmadan eklenemez.");
  }
  return value === null ? null : normalizeSha256(value, "Önceki entry checksum");
}

function normalizePrefix(value: string) {
  const normalized = value.trim();
  if (!/^journal\/v1\/[a-f0-9]{64}\/$/.test(normalized)) {
    throw new Error("Journal prefix geçerli değil.");
  }
  return normalized;
}

function normalizeKek(value: Uint8Array) {
  const kek = Buffer.from(value);
  if (kek.byteLength !== 32) {
    throw new Error("Journal KEK tam olarak 32 byte olmalıdır.");
  }
  return kek;
}

function decodeBase64(value: string, label: string) {
  const normalized = value.trim();
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new Error(`${label} base64 biçiminde değil.`);
  }
  const decoded = Buffer.from(normalized, "base64");
  if (decoded.toString("base64") !== normalized) {
    throw new Error(`${label} canonical base64 biçiminde değil.`);
  }
  return decoded;
}

function normalizeIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,119}$/.test(normalized)) {
    throw new Error(`${label} güvenli değil.`);
  }
  return normalized;
}

function normalizeSequence(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error("Journal sequence geçerli değil.");
  }
  return value;
}

function normalizeDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Journal kayıt zamanı geçerli değil.");
  }
  return value.toISOString();
}

function normalizeIsoString(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(`${label} geçerli değil.`);
  }
  return value;
}

function normalizeSha256(value: string, label: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function checksum(value: object) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
