import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { createR2Client } from "../src/lib/document-storage-r2";
import {
  createStagingBackupId,
  readStagingBackupConfig,
} from "../src/lib/staging-backup";

type BinaryBackupEntry = {
  backupKey: string;
  contentType: string;
  sha256: string;
  sizeBytes: number;
  sourceKey: string;
};

async function main() {
  const config = readStagingBackupConfig(process.env);
  const backupId = createStagingBackupId(new Date(), config.releaseId);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "noa-staging-backup-"));
  const dumpPath = join(temporaryRoot, "database.dump");
  const documentClient = createR2Client(config.documentStorage);
  const backupClient = createR2Client(config.backupStorage);

  try {
    await createDatabaseDump(config.databaseUrl, dumpPath);
    const dumpContent = await readFile(dumpPath);
    const databaseKey = `database/${backupId}/database.dump`;

    await backupClient.send(
      new PutObjectCommand({
        Body: dumpContent,
        Bucket: config.backupStorage.bucket,
        ContentType: "application/octet-stream",
        Key: databaseKey,
      }),
    );

    const binaryObjects = await copyDocumentObjects({
      backupBucket: config.backupStorage.bucket,
      backupClient,
      backupId,
      documentBucket: config.documentStorage.bucket,
      documentClient,
    });
    const manifest = {
      backupId,
      binaryObjects,
      createdAt: new Date().toISOString(),
      database: {
        key: databaseKey,
        sha256: sha256(dumpContent),
        sizeBytes: dumpContent.byteLength,
      },
      releaseId: config.releaseId,
      schemaVersion: 1,
    };
    const manifestContent = Buffer.from(JSON.stringify(manifest, null, 2));
    const manifestKey = `manifests/${backupId}.json`;

    await backupClient.send(
      new PutObjectCommand({
        Body: manifestContent,
        Bucket: config.backupStorage.bucket,
        ContentType: "application/json",
        Key: manifestKey,
      }),
    );

    console.log(
      JSON.stringify({
        backupId,
        binaryObjectCount: binaryObjects.length,
        databaseBytes: dumpContent.byteLength,
        manifestKey,
        status: "created",
      }),
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
    documentClient.destroy();
    backupClient.destroy();
  }
}

async function createDatabaseDump(databaseUrl: string, dumpPath: string) {
  const url = new URL(databaseUrl);
  const childEnvironment = {
    ...process.env,
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
    PGHOST: url.hostname,
    PGPASSWORD: decodeURIComponent(url.password),
    PGPORT: url.port || "5432",
    PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
    PGUSER: decodeURIComponent(url.username),
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath],
      { env: childEnvironment, stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump başarısız oldu (${code}): ${stderr.trim()}`));
      }
    });
  });
}

async function copyDocumentObjects({
  backupBucket,
  backupClient,
  backupId,
  documentBucket,
  documentClient,
}: {
  backupBucket: string;
  backupClient: ReturnType<typeof createR2Client>;
  backupId: string;
  documentBucket: string;
  documentClient: ReturnType<typeof createR2Client>;
}) {
  const entries: BinaryBackupEntry[] = [];
  let continuationToken: string | undefined;

  do {
    const listed = await documentClient.send(
      new ListObjectsV2Command({
        Bucket: documentBucket,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of listed.Contents ?? []) {
      if (!object.Key) continue;

      const source = await documentClient.send(
        new GetObjectCommand({ Bucket: documentBucket, Key: object.Key }),
      );
      if (!source.Body) {
        throw new Error(`Doküman nesnesi okunamadı: ${object.Key}`);
      }

      const content = await source.Body.transformToByteArray();
      const backupKey = `binary/${backupId}/${object.Key}`;
      const contentType = source.ContentType ?? "application/octet-stream";

      await backupClient.send(
        new PutObjectCommand({
          Body: content,
          Bucket: backupBucket,
          ContentType: contentType,
          Key: backupKey,
        }),
      );
      entries.push({
        backupKey,
        contentType,
        sha256: sha256(content),
        sizeBytes: content.byteLength,
        sourceKey: object.Key,
      });
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return entries;
}

function sha256(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

void main();
