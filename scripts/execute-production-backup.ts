import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

import { createR2Client } from "../src/lib/document-storage-r2";
import { createProductionBackupId, readProductionBackupConfig } from "../src/lib/production-backup";

type IntegrityEntry = { key: string; sha256: string; sizeBytes: number };
type BinaryEntry = IntegrityEntry & { contentType: string; sourceKey: string };

async function main() {
  const config = readProductionBackupConfig(process.env);
  const backupId = createProductionBackupId(new Date(), config.releaseId);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "noa-production-backup-"));
  const dumpPath = join(temporaryRoot, "database.dump");
  const documentClient = createR2Client(config.documentStorage);
  const backupClient = createR2Client(config.backupStorage);

  try {
    await createDatabaseDump(config.databaseUrl, dumpPath);
    const databaseDump = await readFile(dumpPath);
    const database: IntegrityEntry = { key: `database/${backupId}/database.dump`, sha256: sha256(databaseDump), sizeBytes: databaseDump.byteLength };
    await putObject(backupClient, config.backupStorage.bucket, database.key, databaseDump);
    const binaryObjects = await copyDocumentObjects({ backupBucket: config.backupStorage.bucket, backupClient, backupId, documentBucket: config.documentStorage.bucket, documentClient });
    const manifestKey = `manifests/${backupId}.json`;
    await putObject(backupClient, config.backupStorage.bucket, manifestKey, Buffer.from(JSON.stringify({ backupId, binaryObjects, createdAt: new Date().toISOString(), database, releaseId: config.releaseId, schemaVersion: 1 }, null, 2)), "application/json");
    await assertIntegrity(await readObject(backupClient, config.backupStorage.bucket, database.key), database, "database dump");
    await writeFile(dumpPath, databaseDump);
    await verifyPgArchive(dumpPath);
    for (const binary of binaryObjects) await assertIntegrity(await readObject(backupClient, config.backupStorage.bucket, binary.key), binary, "binary backup");
    console.log(JSON.stringify({ backupId, binaryObjectCount: binaryObjects.length, databaseBytes: database.sizeBytes, manifestKey, status: "verified" }));
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
    documentClient.destroy();
    backupClient.destroy();
  }
}

async function createDatabaseDump(databaseUrl: string, dumpPath: string) {
  const url = new URL(databaseUrl);
  await runCommand("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath], { ...process.env, PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")), PGHOST: url.hostname, PGPASSWORD: decodeURIComponent(url.password), PGPORT: url.port || "5432", PGSSLMODE: url.searchParams.get("sslmode") ?? "require", PGUSER: decodeURIComponent(url.username) });
}

async function copyDocumentObjects({ backupBucket, backupClient, backupId, documentBucket, documentClient }: { backupBucket: string; backupClient: ReturnType<typeof createR2Client>; backupId: string; documentBucket: string; documentClient: ReturnType<typeof createR2Client> }) {
  const entries: BinaryEntry[] = [];
  let continuationToken: string | undefined;
  do {
    const listed = await documentClient.send(new ListObjectsV2Command({ Bucket: documentBucket, ContinuationToken: continuationToken }));
    for (const object of listed.Contents ?? []) {
      if (!object.Key) continue;
      const source = await readObject(documentClient, documentBucket, object.Key);
      const key = `binary/${backupId}/${object.Key}`;
      await putObject(backupClient, backupBucket, key, source);
      entries.push({ contentType: "application/octet-stream", key, sha256: sha256(source), sizeBytes: source.byteLength, sourceKey: object.Key });
    }
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
  return entries;
}

async function putObject(client: ReturnType<typeof createR2Client>, bucket: string, key: string, body: Uint8Array, contentType = "application/octet-stream") { await client.send(new PutObjectCommand({ Body: body, Bucket: bucket, ContentType: contentType, Key: key })); }
async function readObject(client: ReturnType<typeof createR2Client>, bucket: string, key: string) { const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key })); if (!response.Body) throw new Error("Backup nesnesi okunamadı."); return response.Body.transformToByteArray(); }
async function assertIntegrity(content: Uint8Array, expected: IntegrityEntry, label: string) { if (content.byteLength !== expected.sizeBytes || sha256(content) !== expected.sha256) throw new Error(`${label} bütünlük doğrulaması başarısız.`); }
async function verifyPgArchive(dumpPath: string) { await runCommand("pg_restore", ["--list", dumpPath], process.env); }
async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) { await new Promise<void>((resolve, reject) => { const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] }); let stderr = ""; child.stderr.setEncoding("utf8"); child.stderr.on("data", (chunk: string) => { stderr += chunk; }); child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} başarısız oldu (${code}): ${stderr.trim()}`))); }); }
function sha256(content: Uint8Array) { return createHash("sha256").update(content).digest("hex"); }

void main();
