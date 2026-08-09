import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

import { createR2Client } from "../src/lib/document-storage-r2";
import {
  evaluateProductionBackupFreshness,
  readProductionBackupFreshnessConfig,
} from "../src/lib/production-backup-freshness";

async function main() {
  const config = readProductionBackupFreshnessConfig(process.env);
  const client = createR2Client(config.backupStorage);

  try {
    const manifestKey = await findLatestManifestKey(
      client,
      config.backupStorage.bucket,
    );
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.backupStorage.bucket,
        Key: manifestKey,
      }),
    );
    if (!response.Body) {
      throw new Error("Production backup manifest gövdesi okunamadı.");
    }

    const content = await response.Body.transformToString("utf-8");
    const result = evaluateProductionBackupFreshness(
      JSON.parse(content) as unknown,
      new Date(),
      config.maxAgeHours,
    );
    if (manifestKey !== `manifests/${result.backupId}.json`) {
      throw new Error("Production backup manifest anahtarı kimlikle eşleşmiyor.");
    }

    console.log(JSON.stringify({ ...result, manifestKey }));
    if (!result.fresh) {
      throw new Error(
        `Production backup stale: ${result.ageHours.toFixed(2)} saat > ${result.maxAgeHours} saat.`,
      );
    }
  } finally {
    client.destroy();
  }
}

async function findLatestManifestKey(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
) {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        Prefix: "manifests/",
      }),
    );
    for (const object of response.Contents ?? []) {
      if (/^manifests\/\d{8}T\d{6}Z-[a-z0-9._-]{7,80}\.json$/.test(object.Key ?? "")) {
        keys.push(object.Key!);
      }
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const latest = keys.sort().at(-1);
  if (!latest) {
    throw new Error("Production backup manifest bulunamadı.");
  }
  return latest;
}

void main();
