import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import {
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

import { createR2Client } from "../src/lib/document-storage-r2";
import { readStagingBackupVerificationConfig } from "../src/lib/staging-backup";

type BackupManifest = {
  backupId: string;
  binaryObjects: Array<{
    backupKey: string;
    sha256: string;
    sizeBytes: number;
    sourceKey: string;
  }>;
  database: { key: string; sha256: string; sizeBytes: number };
  releaseId: string;
  schemaVersion: number;
};

async function main() {
  const config = readStagingBackupVerificationConfig(process.env);
  const client = createR2Client(config.backupStorage);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "noa-staging-verify-"));

  try {
    const manifestKey = config.backupId
      ? `manifests/${config.backupId}.json`
      : await findLatestManifestKey(client, config.backupStorage.bucket);
    const manifestContent = await readObject(
      client,
      config.backupStorage.bucket,
      manifestKey,
    );
    const manifest = parseManifest(manifestContent);
    const databaseDump = await readObject(
      client,
      config.backupStorage.bucket,
      manifest.database.key,
    );

    assertObjectIntegrity(databaseDump, manifest.database, "database dump");
    const dumpPath = join(temporaryRoot, "database.dump");
    await writeFile(dumpPath, databaseDump);
    await verifyPgArchive(dumpPath);

    for (const entry of manifest.binaryObjects) {
      const content = await readObject(
        client,
        config.backupStorage.bucket,
        entry.backupKey,
      );
      assertObjectIntegrity(content, entry, `binary object ${entry.sourceKey}`);
    }

    console.log(
      JSON.stringify({
        backupId: manifest.backupId,
        binaryObjectCount: manifest.binaryObjects.length,
        databaseBytes: databaseDump.byteLength,
        status: "verified",
      }),
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
    client.destroy();
  }
}

async function findLatestManifestKey(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
) {
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: "manifests/" }),
  );
  const latest = (listed.Contents ?? [])
    .flatMap((entry) => (entry.Key ? [entry.Key] : []))
    .sort()
    .at(-1);

  if (!latest) {
    throw new Error("Doğrulanacak staging backup manifesti bulunamadı.");
  }

  return latest;
}

async function readObject(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  key: string,
) {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!response.Body) {
    throw new Error(`Backup nesnesi okunamadı: ${key}`);
  }

  return response.Body.transformToByteArray();
}

function parseManifest(content: Uint8Array): BackupManifest {
  let candidate: unknown;
  try {
    candidate = JSON.parse(Buffer.from(content).toString("utf8"));
  } catch {
    throw new Error("Backup manifesti geçerli JSON değil.");
  }

  if (!isBackupManifest(candidate)) {
    throw new Error("Backup manifest sözleşmesi geçerli değil.");
  }

  return candidate;
}

function isBackupManifest(value: unknown): value is BackupManifest {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value as Partial<BackupManifest>;

  return (
    manifest.schemaVersion === 1 &&
    typeof manifest.backupId === "string" &&
    typeof manifest.releaseId === "string" &&
    isIntegrityEntry(manifest.database) &&
    Array.isArray(manifest.binaryObjects) &&
    manifest.binaryObjects.every(
      (entry) =>
        isIntegrityEntry(entry) &&
        typeof entry.backupKey === "string" &&
        typeof entry.sourceKey === "string",
    )
  );
}

function isIntegrityEntry(
  value: unknown,
): value is { key: string; sha256: string; sizeBytes: number } {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as { key?: unknown; sha256?: unknown; sizeBytes?: unknown };
  const key = "key" in entry ? entry.key : (entry as { backupKey?: unknown }).backupKey;

  return (
    typeof key === "string" &&
    /^[a-f0-9]{64}$/.test(String(entry.sha256)) &&
    typeof entry.sizeBytes === "number" &&
    Number.isSafeInteger(entry.sizeBytes) &&
    entry.sizeBytes >= 0
  );
}

function assertObjectIntegrity(
  content: Uint8Array,
  expected: { sha256: string; sizeBytes: number },
  label: string,
) {
  const digest = createHash("sha256").update(content).digest("hex");
  if (content.byteLength !== expected.sizeBytes || digest !== expected.sha256) {
    throw new Error(`${label} bütünlük doğrulaması başarısız.`);
  }
}

async function verifyPgArchive(dumpPath: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pg_restore", ["--list", dumpPath], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_restore arşiv doğrulaması başarısız (${code}): ${stderr.trim()}`));
    });
  });
}

void main();
