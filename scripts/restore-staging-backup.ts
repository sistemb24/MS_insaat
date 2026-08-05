import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Client } from "pg";

import { normalizeDocumentStorageKey } from "../src/lib/document-storage";
import { createR2Client } from "../src/lib/document-storage-r2";
import {
  readStagingBackupVerificationConfig,
  readStagingDatabaseUrl,
} from "../src/lib/staging-backup";
import {
  assertStagingRestoreDatabaseName,
  createNodePostgresConnectionString,
  createStagingRestoreDatabaseName,
  evaluateStagingRecoverySource,
} from "../src/lib/staging-recovery";
import {
  evaluateStagingRecoveryFixture,
  STAGING_RECOVERY_FIXTURE,
} from "../src/lib/staging-recovery-fixture";
import {
  readStagingRecoveryInventory,
  readTableCount,
} from "../src/lib/staging-recovery-postgres";

type BackupManifest = {
  backupId: string;
  binaryObjects: Array<{
    backupKey: string;
    contentType: string;
    sha256: string;
    sizeBytes: number;
    sourceKey: string;
  }>;
  createdAt: string;
  database: { key: string; sha256: string; sizeBytes: number };
  schemaVersion: number;
};

async function main() {
  const startedAt = Date.now();
  const sourceDatabaseUrl = readStagingDatabaseUrl(process.env);
  const backupConfig = readStagingBackupVerificationConfig(process.env);
  const expectedMigrationCount = await countMigrationDirectories();
  const restoreDatabaseName = assertStagingRestoreDatabaseName(
    createStagingRestoreDatabaseName(new Date()),
  );
  const temporaryRoot = await mkdtemp(join(tmpdir(), "noa-staging-restore-"));
  const dumpPath = join(temporaryRoot, "database.dump");
  const backupClient = createR2Client(backupConfig.backupStorage);
  const adminClient = new Client({
    connectionString: createNodePostgresConnectionString(sourceDatabaseUrl),
  });
  const restoredKeys: string[] = [];
  let databaseCreated = false;
  let result: Record<string, unknown> | undefined;

  try {
    const manifest = await readLatestManifest(
      backupClient,
      backupConfig.backupStorage.bucket,
      backupConfig.backupId,
    );
    const dump = await readBackupObject(
      backupClient,
      backupConfig.backupStorage.bucket,
      manifest.database.key,
    );
    assertIntegrity(dump, manifest.database, "database dump");
    await writeFile(dumpPath, dump);

    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${restoreDatabaseName}"`);
    databaseCreated = true;
    await restoreDatabase(sourceDatabaseUrl, restoreDatabaseName, dumpPath);

    const restoreUrl = new URL(sourceDatabaseUrl);
    restoreUrl.pathname = `/${restoreDatabaseName}`;
    const restoreClient = new Client({
      connectionString: createNodePostgresConnectionString(restoreUrl.toString()),
    });
    let recoveryResult;
    let tenantCount = 0;
    let companyCount = 0;
    let documentFileCount = 0;
    let fixtureResult = {
      foreignScopeCount: -1,
      identityMatches: false,
      ready: false,
    };
    try {
      await restoreClient.connect();
      recoveryResult = evaluateStagingRecoverySource(
        await readStagingRecoveryInventory(restoreClient, expectedMigrationCount),
      );
      if (!recoveryResult.ready) {
        throw new Error("İzole restore veritabanı şema doğrulamasını geçemedi.");
      }
      tenantCount = await readTableCount(restoreClient, "Tenant");
      companyCount = await readTableCount(restoreClient, "Company");
      documentFileCount = await readTableCount(restoreClient, "DocumentFile");
      fixtureResult = await readFixtureEvidence(restoreClient);
      if (!fixtureResult.ready) {
        throw new Error("İzole restore sentetik tenant izolasyonu doğrulamasını geçemedi.");
      }
    } finally {
      await restoreClient.end();
    }

    const namespacePrefix = `restore-rehearsal/${restoreDatabaseName}`;
    const fixtureManifestEntry = manifest.binaryObjects.find(
      (entry) => entry.sourceKey === STAGING_RECOVERY_FIXTURE.storageKey,
    );
    if (!fixtureManifestEntry) {
      throw new Error("Restore manifestinde sentetik binary fixture bulunamadı.");
    }
    if (
      fixtureManifestEntry.sizeBytes !== STAGING_RECOVERY_FIXTURE.fileSizeBytes ||
      fixtureManifestEntry.sha256 !== STAGING_RECOVERY_FIXTURE.fileSha256
    ) {
      throw new Error("Restore manifesti sentetik binary fixture bütünlüğünü doğrulamadı.");
    }
    for (const entry of manifest.binaryObjects) {
      const content = await readBackupObject(
        backupClient,
        backupConfig.backupStorage.bucket,
        entry.backupKey,
      );
      assertIntegrity(content, entry, `binary object ${entry.sourceKey}`);
      const restoredKey = normalizeDocumentStorageKey(
        `${namespacePrefix}/binary/${entry.sourceKey}`,
      );
      await backupClient.send(
        new PutObjectCommand({
          Body: content,
          Bucket: backupConfig.backupStorage.bucket,
          ContentType: entry.contentType,
          Key: restoredKey,
        }),
      );
      restoredKeys.push(restoredKey);
      assertIntegrity(
        await readBackupObject(
          backupClient,
          backupConfig.backupStorage.bucket,
          restoredKey,
        ),
        entry,
        `restored binary object ${entry.sourceKey}`,
      );
    }

    const markerKey = `${namespacePrefix}/rehearsal.json`;
    const marker = Buffer.from(
      JSON.stringify({ backupId: manifest.backupId, schemaVersion: 1 }),
    );
    await backupClient.send(
      new PutObjectCommand({
        Body: marker,
        Bucket: backupConfig.backupStorage.bucket,
        ContentType: "application/json",
        Key: markerKey,
      }),
    );
    restoredKeys.push(markerKey);
    assertIntegrity(
      await readBackupObject(
        backupClient,
        backupConfig.backupStorage.bucket,
        markerKey,
      ),
      { sha256: sha256(marker), sizeBytes: marker.byteLength },
      "restore namespace marker",
    );

    result = {
      appliedMigrationCount: recoveryResult.appliedMigrationCount,
      backupAgeSeconds: Math.max(
        0,
        Math.round((Date.now() - Date.parse(manifest.createdAt)) / 1000),
      ),
      backupId: manifest.backupId,
      binaryObjectCount: manifest.binaryObjects.length,
      companyCount,
      databaseBytes: recoveryResult.databaseBytes,
      documentFileCount,
      expectedMigrationCount,
      fixtureBinarySha256: fixtureManifestEntry.sha256,
      fixtureForeignScopeCount: fixtureResult.foreignScopeCount,
      fixtureIdentityMatches: fixtureResult.identityMatches,
      fixtureStorageKey: STAGING_RECOVERY_FIXTURE.storageKey,
      fixtureVerified: fixtureResult.ready,
      publicTableCount: recoveryResult.publicTableCount,
      restoreDurationSeconds: Math.round((Date.now() - startedAt) / 1000),
      status: "verified",
      tenantCount,
    };
  } finally {
    for (const key of restoredKeys.reverse()) {
      await backupClient.send(
        new DeleteObjectCommand({
          Bucket: backupConfig.backupStorage.bucket,
          Key: key,
        }),
      );
    }
    if (databaseCreated) {
      await adminClient.query(`DROP DATABASE "${restoreDatabaseName}" WITH (FORCE)`);
    }
    await adminClient.end();
    backupClient.destroy();
    await rm(temporaryRoot, { force: true, recursive: true });
  }

  console.log(JSON.stringify({ ...result, cleanupStatus: "complete" }));
}

async function readLatestManifest(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  backupId?: string,
) {
  const key = backupId
    ? `manifests/${backupId}.json`
    : await findLatestManifestKey(client, bucket);
  const content = await readBackupObject(client, bucket, key);
  const candidate = JSON.parse(Buffer.from(content).toString("utf8")) as BackupManifest;
  if (
    candidate.schemaVersion !== 1 ||
    !candidate.backupId ||
    !candidate.createdAt ||
    !candidate.database ||
    !Array.isArray(candidate.binaryObjects)
  ) {
    throw new Error("Restore backup manifesti geçerli değil.");
  }
  return candidate;
}

async function findLatestManifestKey(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
) {
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: "manifests/" }),
  );
  const key = (listed.Contents ?? [])
    .flatMap((entry) => (entry.Key ? [entry.Key] : []))
    .sort()
    .at(-1);
  if (!key) throw new Error("Restore edilecek backup manifesti bulunamadı.");
  return key;
}

async function readBackupObject(
  client: ReturnType<typeof createR2Client>,
  bucket: string,
  key: string,
) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Backup nesnesi okunamadı: ${key}`);
  return response.Body.transformToByteArray();
}

function assertIntegrity(
  content: Uint8Array,
  expected: { sha256: string; sizeBytes: number },
  label: string,
) {
  if (
    content.byteLength !== expected.sizeBytes ||
    sha256(content) !== expected.sha256
  ) {
    throw new Error(`${label} bütünlük doğrulaması başarısız.`);
  }
}

function sha256(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

async function readFixtureEvidence(client: Client) {
  const f = STAGING_RECOVERY_FIXTURE;
  const exact = await client.query<{
    companyId: string;
    fileId: string;
    fileSizeBytes: string;
    folderId: string;
    periodId: string;
    storageKey: string;
    tenantId: string;
  }>(
    `SELECT
       df."companyId", df.id AS "fileId", df."sizeBytes"::text AS "fileSizeBytes",
       df."folderId", df."periodId", df."storageKey", df."tenantId"
     FROM public."DocumentFile" df
     JOIN public."DocumentFolder" folder
       ON folder.id = df."folderId" AND folder."tenantId" = df."tenantId"
     JOIN public."Period" period
       ON period.id = df."periodId" AND period."tenantId" = df."tenantId"
     JOIN public."Company" company
       ON company.id = df."companyId" AND company."tenantId" = df."tenantId"
     JOIN public."Tenant" tenant ON tenant.id = df."tenantId"
     WHERE df.id = $1 AND df."tenantId" = $2 AND df."companyId" = $3 AND df."periodId" = $4`,
    [f.fileId, f.tenantId, f.companyId, f.periodId],
  );
  if (exact.rowCount !== 1 || !exact.rows[0]) {
    throw new Error("Restore edilen sentetik fixture kaydı bulunamadı.");
  }
  const foreign = await client.query<{ count: number }>(
    `SELECT count(*)::integer AS count
     FROM public."DocumentFile"
     WHERE id = $1 AND "tenantId" = $2`,
    [f.fileId, f.foreignTenantId],
  );
  const row = exact.rows[0];
  return evaluateStagingRecoveryFixture({
    companyId: row.companyId,
    fileId: row.fileId,
    fileSizeBytes: Number(row.fileSizeBytes),
    folderId: row.folderId,
    foreignScopeCount: foreign.rows[0]?.count ?? 0,
    periodId: row.periodId,
    storageKey: row.storageKey,
    tenantId: row.tenantId,
  });
}

async function countMigrationDirectories() {
  const entries = await readdir(resolve(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  });
  return entries.filter((entry) => entry.isDirectory()).length;
}

async function restoreDatabase(
  sourceDatabaseUrl: string,
  restoreDatabaseName: string,
  dumpPath: string,
) {
  const url = new URL(sourceDatabaseUrl);
  const env = {
    ...process.env,
    PGDATABASE: restoreDatabaseName,
    PGHOST: url.hostname,
    PGPASSWORD: decodeURIComponent(url.password),
    PGPORT: url.port || "5432",
    PGSSLMODE: url.searchParams.get("sslmode") ?? "require",
    PGUSER: decodeURIComponent(url.username),
  };
  await runCommand("pg_restore", [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    restoreDatabaseName,
    dumpPath,
  ], env);
}

async function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} başarısız oldu (${code}): ${stderr.trim()}`));
    });
  });
}

void main();
