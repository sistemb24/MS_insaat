import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Client } from "pg";

import { createR2Client } from "../src/lib/document-storage-r2";
import { readR2DocumentStorageConfig } from "../src/lib/document-storage-runtime";
import { readStagingDatabaseUrl } from "../src/lib/staging-backup";
import {
  assertStagingRecoveryFixtureConfirmation,
  sha256,
  STAGING_RECOVERY_FIXTURE,
} from "../src/lib/staging-recovery-fixture";
import { createNodePostgresConnectionString } from "../src/lib/staging-recovery";

const action = process.argv[2];

async function main() {
  if (!["create", "cleanup"].includes(action ?? "")) {
    throw new Error("Fixture işlemi create veya cleanup olmalıdır.");
  }
  assertStagingRecoveryFixtureConfirmation(process.env);
  const databaseUrl = readStagingDatabaseUrl(process.env);
  const client = new Client({
    connectionString: createNodePostgresConnectionString(databaseUrl),
  });

  await client.connect();
  try {
    if (action === "cleanup") {
      const deleted = await cleanupFixture(client);
      console.log(JSON.stringify({ action, deleted, status: "complete" }));
      return;
    }

    const storage = readR2DocumentStorageConfig(process.env);
    const storageClient = createR2Client(storage);
    try {
      const object = await storageClient.send(
        new GetObjectCommand({
          Bucket: storage.bucket,
          Key: STAGING_RECOVERY_FIXTURE.storageKey,
        }),
      );
      if (!object.Body) throw new Error("Sentetik R2 fixture nesnesi okunamadı.");
      const content = await object.Body.transformToByteArray();
      if (
        content.byteLength !== STAGING_RECOVERY_FIXTURE.fileSizeBytes ||
        sha256(content) !== STAGING_RECOVERY_FIXTURE.fileSha256
      ) {
        throw new Error("Sentetik R2 fixture nesnesi beklenen bütünlük değerini taşımıyor.");
      }

      await createFixture(client, content.byteLength);
      console.log(
        JSON.stringify({
          action,
          fileSizeBytes: content.byteLength,
          objectSha256: sha256(content),
          status: "created",
          storageKey: STAGING_RECOVERY_FIXTURE.storageKey,
          tenantId: STAGING_RECOVERY_FIXTURE.tenantId,
        }),
      );
    } finally {
      storageClient.destroy();
    }
  } finally {
    await client.end();
  }
}

async function createFixture(client: Client, fileSizeBytes: number) {
  const f = STAGING_RECOVERY_FIXTURE;
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      f.tenantId,
    ]);
    const existing = await client.query<{ count: number }>(
      `SELECT count(*)::integer AS count FROM public."Tenant" WHERE id = $1`,
      [f.tenantId],
    );
    if ((existing.rows[0]?.count ?? 0) !== 0) {
      throw new Error("Staging recovery fixture tenant zaten mevcut.");
    }

    await client.query(
      `INSERT INTO public."Tenant" (id, name, "createdAt", "updatedAt")
       VALUES ($1, $2, now(), now())`,
      [f.tenantId, "NOA Recovery Fixture"],
    );
    await client.query(
      `INSERT INTO public."Company" (id, "tenantId", name, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now(), now())`,
      [f.companyId, f.tenantId, "NOA Recovery Fixture Company"],
    );
    await client.query(
      `INSERT INTO public."Period" (id, "tenantId", "companyId", label, "createdAt", "updatedAt", "isClosed")
       VALUES ($1, $2, $3, $4, now(), now(), false)`,
      [f.periodId, f.tenantId, f.companyId, "Recovery Fixture Period"],
    );
    await client.query(
      `INSERT INTO public."DocumentFolder"
       (id, "tenantId", "companyId", "periodId", name, purpose, "isSystem", color,
        "accessLevel", "isStarred", "canDelete", "canRename", "fileCount", "sizeBytes",
        "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, false, true, true, 1, $9,
        $10, $10, now(), now())`,
      [
        f.folderId,
        f.tenantId,
        f.companyId,
        f.periodId,
        "Recovery Fixture",
        "staging-recovery",
        "#64748b",
        "company",
        fileSizeBytes,
        "noa-recovery-automation",
      ],
    );
    await client.query(
      `INSERT INTO public."DocumentFile"
       (id, "tenantId", "companyId", "periodId", "folderId", name, "fileType", "mimeType",
        extension, "sizeBytes", "storageKey", "lastModified", "isStarred", "createdBy",
        "updatedBy", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), false, $12, $12,
        now(), now())`,
      [
        f.fileId,
        f.tenantId,
        f.companyId,
        f.periodId,
        f.folderId,
        f.fileName,
        "other",
        f.mimeType,
        "bin",
        fileSizeBytes,
        f.storageKey,
        "noa-recovery-automation",
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function cleanupFixture(client: Client) {
  const result = await client.query(
    `DELETE FROM public."Tenant" WHERE id = $1`,
    [STAGING_RECOVERY_FIXTURE.tenantId],
  );
  return result.rowCount ?? 0;
}

void main();
