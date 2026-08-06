import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "pg";

import { createR2Client } from "../src/lib/document-storage-r2";
import { readProductionRestoreConfig } from "../src/lib/production-backup";
import {
  evaluateProductionMigrationPreflight,
  type ProductionMigrationRecord,
} from "../src/lib/production-recovery-preflight";
import { createNodePostgresConnectionString } from "../src/lib/staging-recovery";

type IntegrityEntry = { key: string; sha256: string; sizeBytes: number };
type BackupManifest = {
  backupId: string;
  binaryObjects: unknown[];
  database: IntegrityEntry;
  releaseId: string;
  schemaVersion: number;
};

async function main() {
  const config = readProductionRestoreConfig(process.env);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "noa-production-restore-"));
  const dumpPath = join(temporaryRoot, "database.dump");
  const backupClient = createR2Client(config.backupStorage);
  const adminClient = new Client({
    connectionString: createNodePostgresConnectionString(config.databaseUrl),
  });
  const restoreDatabaseName = createRestoreDatabaseName(new Date());
  let databaseCreated = false;

  try {
    const manifest = parseManifest(
      await readObject(
        backupClient,
        config.backupStorage.bucket,
        `manifests/${config.backupId}.json`,
      ),
    );
    if (manifest.backupId !== config.backupId) {
      throw new Error("Backup manifest kimliği istenen restore kimliğiyle eşleşmiyor.");
    }
    if (manifest.binaryObjects.length > 0) {
      throw new Error("Binary içeren production backup için ayrı binary restore kanıtı zorunludur.");
    }
    const dump = await readObject(
      backupClient,
      config.backupStorage.bucket,
      manifest.database.key,
    );
    assertIntegrity(dump, manifest.database, "database dump");
    await writeFile(dumpPath, dump);
    await verifyArchive(dumpPath);

    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${restoreDatabaseName}"`);
    databaseCreated = true;
    await restoreDatabase(config.databaseUrl, restoreDatabaseName, dumpPath);

    const restoredUrl = new URL(config.databaseUrl);
    restoredUrl.pathname = `/${restoreDatabaseName}`;
    const restoredClient = new Client({
      connectionString: createNodePostgresConnectionString(restoredUrl.toString()),
    });
    try {
      await restoredClient.connect();
      const inventory = await readMigrationInventory(restoredClient);
      const migration = evaluateProductionMigrationPreflight({
        localMigrationNames: await readLocalMigrationNames(),
        ...inventory,
      });
      if (!migration.ready || migration.pendingMigrationCount !== 0) {
        throw new Error("İzole restore migration envanteri doğrulanamadı.");
      }
      console.log(JSON.stringify({
        appliedMigrationCount: migration.appliedMigrationCount,
        backupId: manifest.backupId,
        binaryObjectCount: manifest.binaryObjects.length,
        databaseBytes: manifest.database.sizeBytes,
        pendingMigrationCount: migration.pendingMigrationCount,
        publicTableCount: migration.publicTableCount,
        status: "verified",
      }));
    } finally {
      await restoredClient.end().catch(() => undefined);
    }
  } finally {
    if (databaseCreated) {
      await adminClient
        .query(`DROP DATABASE IF EXISTS "${restoreDatabaseName}" WITH (FORCE)`)
        .catch((error: unknown) => {
          throw new Error(`Geçici restore veritabanı temizlenemedi: ${String(error)}`);
        });
    }
    await adminClient.end().catch(() => undefined);
    backupClient.destroy();
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

function createRestoreDatabaseName(now: Date) {
  return `noa_production_restore_${now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .toLowerCase()}`;
}

function parseManifest(content: Uint8Array): BackupManifest {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(content).toString("utf8"));
  } catch {
    throw new Error("Production backup manifesti geçerli JSON değil.");
  }
  if (!isManifest(value)) throw new Error("Production backup manifesti geçerli değil.");
  return value;
}

function isManifest(value: unknown): value is BackupManifest {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value as Partial<BackupManifest>;
  return (
    manifest.schemaVersion === 1 &&
    typeof manifest.backupId === "string" &&
    typeof manifest.releaseId === "string" &&
    Array.isArray(manifest.binaryObjects) &&
    isIntegrityEntry(manifest.database)
  );
}

function isIntegrityEntry(value: unknown): value is IntegrityEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<IntegrityEntry>;
  return (
    typeof entry.key === "string" &&
    /^[a-f0-9]{64}$/.test(String(entry.sha256)) &&
    typeof entry.sizeBytes === "number" &&
    Number.isSafeInteger(entry.sizeBytes) &&
    entry.sizeBytes >= 0
  );
}

async function readObject(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  key: string,
) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("Backup nesnesi okunamadı.");
  return response.Body.transformToByteArray();
}

function assertIntegrity(content: Uint8Array, expected: IntegrityEntry, label: string) {
  if (
    content.byteLength !== expected.sizeBytes ||
    createHash("sha256").update(content).digest("hex") !== expected.sha256
  ) {
    throw new Error(`${label} bütünlük doğrulaması başarısız.`);
  }
}

async function verifyArchive(dumpPath: string) {
  await runCommand("pg_restore", ["--list", dumpPath], process.env);
}

async function restoreDatabase(sourceUrl: string, databaseName: string, dumpPath: string) {
  const url = new URL(sourceUrl);
  await runCommand(
    "pg_restore",
    ["--clean", "--if-exists", "--exit-on-error", "--no-owner", "--no-privileges", "--dbname", databaseName, dumpPath],
    {
      ...process.env,
      PGHOST: url.hostname,
      PGPASSWORD: decodeURIComponent(url.password),
      PGPORT: url.port || "5432",
      PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
      PGUSER: decodeURIComponent(url.username),
    },
  );
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} başarısız oldu (${code}): ${stderr.trim()}`)));
  });
}

async function readLocalMigrationNames() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readMigrationInventory(client: Client) {
  const tableResult = await client.query<{ table_name: string }>(`
    SELECT tablename::text AS table_name FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' ORDER BY tablename
  `);
  const publicTableNames = tableResult.rows.map((row) => row.table_name);
  const migrationTableExists = publicTableNames.includes("_prisma_migrations");
  let productionMigrationRecords: ProductionMigrationRecord[] = [];
  if (migrationTableExists) {
    const migrations = await client.query<{ finished: boolean; migration_name: string; rolled_back: boolean }>(`
      SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
      FROM public."_prisma_migrations" ORDER BY started_at, migration_name
    `);
    productionMigrationRecords = migrations.rows.map((row) => ({ finished: row.finished, migrationName: row.migration_name, rolledBack: row.rolled_back }));
  }
  return { migrationTableExists, productionMigrationRecords, publicTableNames };
}

void main();
