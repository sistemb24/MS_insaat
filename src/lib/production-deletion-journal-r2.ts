import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { ProductionDeletionJournalStorePort } from "./production-deletion-journal";

export const PRODUCTION_DELETION_JOURNAL_BUCKET =
  "noa-insaat-production-deletion-journal-eu";
export const PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX = "journal/";
export const PRODUCTION_DELETION_JOURNAL_MAX_OBJECT_BYTES = 1_048_576;
export const PRODUCTION_DELETION_JOURNAL_MAX_OBJECT_COUNT = 10_000;

export type ProductionDeletionJournalR2Role = "append" | "read";

export type ProductionDeletionJournalR2Config = {
  accessKeyId: string;
  bucket: typeof PRODUCTION_DELETION_JOURNAL_BUCKET;
  endpoint: string;
  secretAccessKey: string;
  sessionToken?: string;
};

type JournalR2Command =
  | GetObjectCommand
  | ListObjectsV2Command
  | PutObjectCommand;

export type ProductionDeletionJournalR2ClientLike = {
  send(command: JournalR2Command): Promise<unknown>;
};

export function readProductionDeletionJournalR2Config(
  env: Readonly<Record<string, string | undefined>>,
  role: ProductionDeletionJournalR2Role,
): ProductionDeletionJournalR2Config {
  if (env.NOA_RUNTIME_ENV !== "production") {
    throw new Error("Production imha journal R2 ayarı yalnız production runtime'da okunur.");
  }

  const rolePrefix =
    role === "append"
      ? "PRODUCTION_DELETION_JOURNAL_R2_APPEND"
      : "PRODUCTION_DELETION_JOURNAL_R2_READ";
  const config = {
    accessKeyId: env[`${rolePrefix}_ACCESS_KEY_ID`]?.trim() ?? "",
    bucket: env.PRODUCTION_DELETION_JOURNAL_R2_BUCKET?.trim() ?? "",
    endpoint: env.PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT?.trim() ?? "",
    secretAccessKey: env[`${rolePrefix}_SECRET_ACCESS_KEY`]?.trim() ?? "",
    sessionToken: env[`${rolePrefix}_SESSION_TOKEN`]?.trim() || undefined,
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "sessionToken" && !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Production imha journal R2 ayarı eksik: ${missing.join(", ")}`);
  }
  if (role === "append" && !config.sessionToken) {
    throw new Error(
      "Journal append credential explicit-action kısa ömürlü session token taşımalıdır.",
    );
  }

  const endpoint = normalizeEndpoint(config.endpoint);
  const bucket = normalizeBucket(config.bucket);
  return {
    accessKeyId: config.accessKeyId,
    bucket,
    endpoint,
    secretAccessKey: config.secretAccessKey,
    ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
  };
}

export function createProductionDeletionJournalR2Client(
  config: ProductionDeletionJournalR2Config,
) {
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken ? { sessionToken: config.sessionToken } : {}),
    },
    endpoint: config.endpoint,
    region: "auto",
  });
}

export async function probeProductionDeletionJournalR2Credential(input: {
  bucket: string;
  client: ProductionDeletionJournalR2ClientLike;
}) {
  const bucket = normalizeBucket(input.bucket);
  const response = (await input.client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 1,
      Prefix: PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX,
    }),
  )) as { Contents?: readonly { Key?: string }[] };
  const contents = response.Contents ?? [];
  if (
    contents.length > 1 ||
    contents.some(
      (object) =>
        !object.Key?.startsWith(PRODUCTION_DELETION_JOURNAL_CREDENTIAL_PROBE_PREFIX),
    )
  ) {
    throw new Error("Journal R2 credential probe güvenli prefix sınırını aştı.");
  }
  return { credentialProbeReady: true as const };
}

export function createProductionDeletionJournalR2Store(input: {
  bucket: string;
  client: ProductionDeletionJournalR2ClientLike;
  maxObjectBytes?: number;
  maxObjectCount?: number;
}): ProductionDeletionJournalStorePort {
  const bucket = normalizeBucket(input.bucket);
  const maxObjectBytes = normalizeLimit(
    input.maxObjectBytes ?? PRODUCTION_DELETION_JOURNAL_MAX_OBJECT_BYTES,
    "Journal azami nesne boyutu",
  );
  const maxObjectCount = normalizeLimit(
    input.maxObjectCount ?? PRODUCTION_DELETION_JOURNAL_MAX_OBJECT_COUNT,
    "Journal azami nesne sayısı",
  );

  return {
    async createObject({ body, ifNoneMatch, key }) {
      if (ifNoneMatch !== "*") {
        throw new Error("Journal R2 adapter yalnız If-None-Match=* kabul eder.");
      }
      normalizeObjectKey(key);
      assertBodySize(body, maxObjectBytes);
      try {
        await input.client.send(
          new PutObjectCommand({
            Body: Buffer.from(body, "utf8"),
            Bucket: bucket,
            ContentType: "application/json",
            IfNoneMatch: "*",
            Key: key,
          }),
        );
        return "created";
      } catch (error) {
        if (isPreconditionFailed(error)) return "already-exists";
        throw error;
      }
    },

    async listObjects({ prefix }) {
      const safePrefix = normalizeScopePrefix(prefix);
      const listed = new Map<string, number>();
      const seenTokens = new Set<string>();
      let continuationToken: string | undefined;

      do {
        const response = (await input.client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
            Prefix: safePrefix,
          }),
        )) as {
          Contents?: readonly { Key?: string; Size?: number }[];
          IsTruncated?: boolean;
          NextContinuationToken?: string;
        };

        for (const object of response.Contents ?? []) {
          if (!object.Key) throw new Error("Journal R2 listesi anahtarsız nesne içeriyor.");
          const key = normalizeObjectKey(object.Key, safePrefix);
          if (listed.has(key)) {
            throw new Error("Journal R2 listesi tekrar eden object key içeriyor.");
          }
          const size = normalizeObjectSize(object.Size, "Journal R2 liste nesne boyutu");
          if (size > maxObjectBytes) {
            throw new Error("Journal R2 nesnesi izin verilen boyutu aşıyor.");
          }
          listed.set(key, size);
          if (listed.size > maxObjectCount) {
            throw new Error("Journal R2 nesne sayısı güvenli sınırı aşıyor.");
          }
        }

        if (!response.IsTruncated) {
          continuationToken = undefined;
          continue;
        }
        const nextToken = response.NextContinuationToken?.trim();
        if (!nextToken || seenTokens.has(nextToken)) {
          throw new Error("Journal R2 pagination tokenı eksik veya tekrar ediyor.");
        }
        seenTokens.add(nextToken);
        continuationToken = nextToken;
      } while (continuationToken);

      const objects = [];
      for (const [key, listedSize] of [...listed.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        const response = (await input.client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        )) as {
          Body?: { transformToString(encoding?: string): Promise<string> };
          ContentLength?: number;
          ContentType?: string;
        };
        if (!response.Body) throw new Error("Journal R2 nesne gövdesi alınamadı.");
        if (response.ContentType !== "application/json") {
          throw new Error("Journal R2 nesnesi beklenen content type değerini taşımıyor.");
        }
        const contentLength = normalizeObjectSize(
          response.ContentLength,
          "Journal R2 nesne content length",
        );
        if (contentLength !== listedSize || contentLength > maxObjectBytes) {
          throw new Error("Journal R2 nesne metadata boyutu eşleşmiyor.");
        }
        const body = await response.Body.transformToString("utf-8");
        if (Buffer.byteLength(body, "utf8") !== contentLength) {
          throw new Error("Journal R2 nesne gövdesi metadata boyutuyla eşleşmiyor.");
        }
        objects.push({ body, key });
      }
      return objects;
    },
  };
}

function normalizeBucket(value: string): typeof PRODUCTION_DELETION_JOURNAL_BUCKET {
  if (value.trim() !== PRODUCTION_DELETION_JOURNAL_BUCKET) {
    throw new Error("Production imha journal R2 bucket adı onaylanan değer değil.");
  }
  return PRODUCTION_DELETION_JOURNAL_BUCKET;
}

function normalizeEndpoint(value: string) {
  let endpoint: URL;
  try {
    endpoint = new URL(value.trim());
  } catch {
    throw new Error("Production imha journal R2 endpoint geçerli değil.");
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
    throw new Error("Production imha journal R2 endpoint EU jurisdiction biçiminde değil.");
  }
  return endpoint.toString();
}

function normalizeScopePrefix(value: string) {
  const normalized = value.trim();
  if (!/^journal\/v1\/[a-f0-9]{64}\/$/.test(normalized)) {
    throw new Error("Journal R2 scope prefix geçerli değil.");
  }
  return normalized;
}

function normalizeObjectKey(value: string, expectedPrefix?: string) {
  const normalized = value.trim();
  if (
    !/^journal\/v1\/[a-f0-9]{64}\/\d{12}-[A-Za-z0-9][A-Za-z0-9._-]{1,119}\.json\.enc$/.test(
      normalized,
    ) ||
    (expectedPrefix && !normalized.startsWith(expectedPrefix))
  ) {
    throw new Error("Journal R2 object key geçerli scope içinde değil.");
  }
  return normalized;
}

function normalizeObjectSize(value: number | undefined, label: string) {
  if (!Number.isSafeInteger(value) || (value ?? -1) < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
  return value as number;
}

function normalizeLimit(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} geçerli değil.`);
  }
  return value;
}

function assertBodySize(body: string, maxObjectBytes: number) {
  if (typeof body !== "string" || Buffer.byteLength(body, "utf8") > maxObjectBytes) {
    throw new Error("Journal R2 nesne gövdesi izin verilen boyutu aşıyor.");
  }
}

function isPreconditionFailed(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    name?: string;
  };
  return (
    candidate.$metadata?.httpStatusCode === 412 ||
    candidate.name === "PreconditionFailed"
  );
}
