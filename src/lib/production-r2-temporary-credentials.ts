import { createHash } from "node:crypto";

import { SignJWT } from "jose";

import {
  PRODUCTION_DELETION_JOURNAL_BUCKET,
} from "./production-deletion-journal-r2";
import {
  PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
  PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX,
} from "./production-deletion-journal-provider-preflight";

export const PRODUCTION_R2_TEMPORARY_CREDENTIAL_TTL_SECONDS = 900;

export type ProductionR2TemporaryCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
};

export async function createProductionDeletionJournalTemporaryCredentials(input: {
  accountId: string;
  endpoint: string;
  issuedAt: Date;
  parentAccessKeyId: string;
  parentSecretAccessKey: string;
}): Promise<ProductionR2TemporaryCredentials> {
  const accountId = normalizeAccountId(input.accountId);
  const endpointHost = normalizeEndpointHost(input.endpoint, accountId);
  const parentAccessKeyId = normalizeCredentialPart(
    input.parentAccessKeyId,
    "Parent access key kimliği",
  );
  const parentSecretAccessKey = normalizeSecret(input.parentSecretAccessKey);
  const issuedAt = normalizeIssuedAt(input.issuedAt);
  const jwt = await new SignJWT({
    actions: PRODUCTION_DELETION_JOURNAL_APPEND_ACTIONS,
    bucket: PRODUCTION_DELETION_JOURNAL_BUCKET,
    paths: {
      objectPaths: [],
      prefixPaths: [PRODUCTION_DELETION_JOURNAL_LOCK_PREFIX],
    },
    scope: "object-read-write",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(accountId)
    .setIssuer(parentAccessKeyId)
    .setAudience(endpointHost)
    .setIssuedAt(issuedAt)
    .setExpirationTime(
      issuedAt + PRODUCTION_R2_TEMPORARY_CREDENTIAL_TTL_SECONDS,
    )
    .sign(new TextEncoder().encode(parentSecretAccessKey));

  return {
    accessKeyId: parentAccessKeyId,
    secretAccessKey: createHash("sha256").update(jwt).digest("hex"),
    sessionToken: Buffer.from(`jwt/${jwt}`, "utf8").toString("base64"),
  };
}

function normalizeAccountId(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new Error("Cloudflare account kimliği geçerli değil.");
  }
  return normalized;
}

function normalizeEndpointHost(value: string, accountId: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value.trim());
  } catch {
    throw new Error("Cloudflare R2 EU endpoint geçerli değil.");
  }
  const expectedHost = `${accountId}.eu.r2.cloudflarestorage.com`;
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== expectedHost ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password ||
    endpoint.port
  ) {
    throw new Error("Cloudflare R2 endpoint account ve EU jurisdiction ile eşleşmiyor.");
  }
  return expectedHost;
}

function normalizeCredentialPart(value: string, label: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(normalized)) {
    throw new Error(`${label} geçerli değil.`);
  }
  return normalized;
}

function normalizeSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length < 16 || normalized.length > 512 || /\s/.test(normalized)) {
    throw new Error("Parent secret access key geçerli değil.");
  }
  return normalized;
}

function normalizeIssuedAt(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Temporary credential üretim zamanı geçerli değil.");
  }
  return Math.floor(value.getTime() / 1_000);
}
