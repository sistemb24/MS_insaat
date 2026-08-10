import { S3Client } from "@aws-sdk/client-s3";
import { AwsClient } from "aws4fetch";

import {
  PRODUCTION_DELETION_JOURNAL_BUCKET,
  PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX,
  probeProductionDeletionJournalR2Credential,
  type ProductionDeletionJournalR2Config,
} from "./production-deletion-journal-r2";
import type { ProductionR2TemporaryCredentials } from "./production-r2-temporary-credentials";

export const PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION =
  "production-r2-temp-credential-protocol-diagnostic";

export type ProductionR2ProtocolDiagnosticClient =
  | "aws4fetch"
  | "aws-sdk-v3";

export type ProductionR2TemporaryCredentialProtocolDiagnosticConfig = {
  accountId: string;
  bucket: typeof PRODUCTION_DELETION_JOURNAL_BUCKET;
  confirmation: typeof PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION;
  endpoint: string;
  parentAccessKeyId: string;
  parentSecretAccessKey: string;
  releaseId: string;
};

type Aws4FetchClientLike = {
  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
};

type DiagnosticProbeResult =
  | {
      client: ProductionR2ProtocolDiagnosticClient;
      status: "passed";
    }
  | {
      client: ProductionR2ProtocolDiagnosticClient;
      httpStatus: string;
      providerCode: string;
      status: "failed";
    };

export function readProductionR2TemporaryCredentialProtocolDiagnosticConfig(
  env: Readonly<Record<string, string | undefined>>,
): ProductionR2TemporaryCredentialProtocolDiagnosticConfig {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("R2 temporary credential protokol tanısı yalnız production runtime'da çalışır.");
  }
  if (env.NOA_SOURCE_REF !== "refs/heads/main") {
    throw new Error("R2 temporary credential protokol tanısı yalnız main dalında çalışır.");
  }
  const confirmation = env.NOA_PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION;
  if (
    confirmation !==
    PRODUCTION_R2_TEMPORARY_CREDENTIAL_PROTOCOL_DIAGNOSTIC_CONFIRMATION
  ) {
    throw new Error("R2 temporary credential protokol tanısı confirmation değeri eşleşmiyor.");
  }
  const releaseId = normalizeSha(env.NOA_RELEASE_ID ?? "", "Tanı release SHA");
  const expectedReleaseId = normalizeSha(
    env.NOA_EXPECTED_RELEASE_SHA ?? "",
    "Beklenen tanı release SHA",
  );
  if (releaseId !== expectedReleaseId) {
    throw new Error("R2 temporary credential protokol tanısı exact SHA ile eşleşmiyor.");
  }
  const bucket = env.PRODUCTION_DELETION_JOURNAL_R2_BUCKET?.trim();
  if (bucket !== PRODUCTION_DELETION_JOURNAL_BUCKET) {
    throw new Error("R2 temporary credential protokol tanısı bucket adı eşleşmiyor.");
  }
  const accountId = normalizeAccountId(env.CLOUDFLARE_ACCOUNT_ID ?? "");

  return {
    accountId,
    bucket,
    confirmation,
    endpoint: normalizeEndpoint(
      env.PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT ?? "",
      accountId,
    ),
    parentAccessKeyId: normalizeCredential(
      env.PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID ?? "",
      "Journal parent access key kimliği",
    ),
    parentSecretAccessKey: normalizeSecret(
      env.PRODUCTION_DELETION_JOURNAL_R2_PARENT_SECRET_ACCESS_KEY ?? "",
    ),
    releaseId,
  };
}

export function createProductionR2ProtocolDiagnosticAwsSdkClient(
  config: ProductionDeletionJournalR2Config,
) {
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    },
    endpoint: config.endpoint,
    forcePathStyle: true,
    maxAttempts: 1,
    region: "auto",
  });
}

export function createProductionR2ProtocolDiagnosticAws4FetchClient(
  config: ProductionDeletionJournalR2Config,
) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    region: "auto",
    retries: 0,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
  });
}

export async function probeProductionR2CredentialWithAws4Fetch(input: {
  bucket: string;
  client: Aws4FetchClientLike;
  endpoint: string;
}) {
  if (input.bucket.trim() !== PRODUCTION_DELETION_JOURNAL_BUCKET) {
    throw new Error("R2 protocol tanısı bucket adı onaylanan değer değil.");
  }
  const endpoint = normalizeDiagnosticEndpoint(input.endpoint);
  const url = new URL(`${PRODUCTION_DELETION_JOURNAL_BUCKET}/`, endpoint);
  url.searchParams.set("list-type", "2");
  url.searchParams.set("max-keys", "1");
  url.searchParams.set("prefix", PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX);

  const response = await input.client.fetch(url, { method: "GET" });
  const responseBody = await response.text();
  if (Buffer.byteLength(responseBody, "utf8") > 65_536) {
    throw createProviderError("ResponseTooLarge", response.status);
  }
  if (!response.ok) {
    throw createProviderError(readProviderCode(responseBody), response.status);
  }

  const keys = readObjectKeys(responseBody);
  if (
    keys.length > 1 ||
    keys.some(
      (key) =>
        !key.startsWith(PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX),
    )
  ) {
    throw createProviderError("UnsafePrefixResponse", response.status);
  }
  return { credentialProbeReady: true as const };
}

export async function runProductionR2TemporaryCredentialProtocolDiagnostic(input: {
  createTemporaryCredentials(): Promise<ProductionR2TemporaryCredentials>;
  probeAws4FetchTemporaryCredential(
    credentials: ProductionR2TemporaryCredentials,
  ): Promise<unknown>;
  probeAwsSdkTemporaryCredential(
    credentials: ProductionR2TemporaryCredentials,
  ): Promise<unknown>;
  probeParentCredential(): Promise<unknown>;
  releaseId: string;
}) {
  const releaseId = normalizeSha(input.releaseId, "Tanı release SHA");
  try {
    await input.probeParentCredential();
  } catch (error) {
    throw createSafeDiagnosticPhaseError("parent-credential-probe", error);
  }

  let temporaryCredentials: ProductionR2TemporaryCredentials;
  try {
    temporaryCredentials = await input.createTemporaryCredentials();
  } catch (error) {
    throw createSafeDiagnosticPhaseError("temporary-credential-mint", error);
  }

  const probes: DiagnosticProbeResult[] = [];
  for (const [client, probe] of [
    ["aws4fetch", input.probeAws4FetchTemporaryCredential],
    ["aws-sdk-v3", input.probeAwsSdkTemporaryCredential],
  ] as const) {
    try {
      await probe(temporaryCredentials);
      probes.push({ client, status: "passed" });
    } catch (error) {
      probes.push({ client, status: "failed", ...readSafeProviderFailure(error) });
    }
  }

  if (probes.some((probe) => probe.status === "failed")) {
    throw new Error(
      `R2 temporary credential protokol tanısı başarısız: ${probes
        .map(formatProbeResult)
        .join(" ")}`,
    );
  }

  return {
    parentCredentialProbeReady: true as const,
    probes,
    productionBackupDeletionReplayReady: false as const,
    protocolDiagnosticReady: true as const,
    releaseId,
  };
}

export async function probeProductionR2CredentialWithAwsSdk(input: {
  bucket: string;
  client: ReturnType<typeof createProductionR2ProtocolDiagnosticAwsSdkClient>;
}) {
  return probeProductionDeletionJournalR2Credential(input);
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
  const endpoint = normalizeDiagnosticEndpoint(value);
  if (endpoint !== expected) {
    throw new Error("R2 temporary credential protokol tanısı endpoint EU account ile eşleşmiyor.");
  }
  return endpoint;
}

function normalizeDiagnosticEndpoint(value: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value.trim());
  } catch {
    throw new Error("R2 temporary credential protokol tanısı endpoint geçerli değil.");
  }
  if (
    endpoint.protocol !== "https:" ||
    !/^[a-f0-9]{32}\.eu\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname) ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password ||
    endpoint.port
  ) {
    throw new Error("R2 temporary credential protokol tanısı endpoint EU biçiminde değil.");
  }
  return endpoint.toString();
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

function readProviderCode(body: string) {
  const match = body.match(/<(?:[A-Za-z0-9_-]+:)?Code>([^<]{1,80})<\/(?:[A-Za-z0-9_-]+:)?Code>/);
  return normalizeSafeProviderCode(match?.[1] ?? "unknown");
}

function readObjectKeys(body: string) {
  return [...body.matchAll(/<(?:[A-Za-z0-9_-]+:)?Key>([^<]*)<\/(?:[A-Za-z0-9_-]+:)?Key>/g)]
    .map((match) => match[1]);
}

function createProviderError(providerCode: string, httpStatus: number) {
  return Object.assign(new Error("R2 protocol tanısı provider isteği başarısız."), {
    $metadata: { httpStatusCode: httpStatus },
    Code: normalizeSafeProviderCode(providerCode),
  });
}

function createSafeDiagnosticPhaseError(phase: string, error: unknown) {
  const failure = readSafeProviderFailure(error);
  return new Error(
    `R2 temporary credential protokol tanısı başarısız: phase=${phase} providerCode=${failure.providerCode} httpStatus=${failure.httpStatus}.`,
  );
}

function readSafeProviderFailure(error: unknown) {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          $metadata?: { httpStatusCode?: number };
          Code?: string;
          name?: string;
        })
      : undefined;
  return {
    httpStatus: normalizeSafeHttpStatus(candidate?.$metadata?.httpStatusCode),
    providerCode: normalizeSafeProviderCode(
      candidate?.Code ?? candidate?.name ?? "unknown",
    ),
  };
}

function formatProbeResult(result: DiagnosticProbeResult) {
  return result.status === "passed"
    ? `client=${result.client} status=passed.`
    : `client=${result.client} status=failed providerCode=${result.providerCode} httpStatus=${result.httpStatus}.`;
}

function normalizeSafeProviderCode(value: string) {
  return /^[A-Za-z0-9._-]{1,80}$/.test(value) ? value : "unknown";
}

function normalizeSafeHttpStatus(value: number | undefined) {
  return Number.isSafeInteger(value) && (value ?? 0) >= 100 && (value ?? 0) <= 599
    ? String(value)
    : "unknown";
}
