import { HeadObjectCommand } from "@aws-sdk/client-s3";

import { normalizeDocumentStorageKey } from "./document-storage";
import type { ProductionTenantObjectHeadPort } from "./production-tenant-inventory";

type HeadObjectClientLike = {
  send(command: HeadObjectCommand): Promise<unknown>;
};

export function createProductionTenantInventoryR2HeadPort(input: {
  bucket: string;
  client: HeadObjectClientLike;
}): ProductionTenantObjectHeadPort {
  const bucket = normalizeBucket(input.bucket);

  return {
    async headObjects({ storageKeys }) {
      const normalizedKeys = storageKeys.map(normalizeDocumentStorageKey);
      if (new Set(normalizedKeys).size !== normalizedKeys.length) {
        throw new Error("Tenant doküman envanteri tekrar eden storage key içeriyor.");
      }

      const results = [];
      for (let index = 0; index < normalizedKeys.length; index += 10) {
        const batch = normalizedKeys.slice(index, index + 10);
        results.push(
          ...(await Promise.all(
            batch.map(async (storageKey) => {
              try {
                const response = (await input.client.send(
                  new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
                )) as { ContentLength?: number };
                return {
                  exists: true,
                  sizeBytes: normalizeSizeBytes(response.ContentLength),
                  storageKey,
                };
              } catch (error) {
                if (isMissingObjectError(error)) {
                  return { exists: false, sizeBytes: 0, storageKey };
                }
                throw error;
              }
            }),
          )),
        );
      }
      return results;
    },
  };
}

function normalizeBucket(value: string) {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(normalized)) {
    throw new Error("Production R2 bucket adı geçerli değil.");
  }
  return normalized;
}

function normalizeSizeBytes(value: number | undefined) {
  if (!Number.isSafeInteger(value) || (value ?? -1) < 0) {
    throw new Error("R2 nesne boyutu geçerli değil.");
  }
  return value as number;
}

function isMissingObjectError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    name?: string;
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === "NoSuchKey" ||
    candidate.name === "NotFound"
  );
}
