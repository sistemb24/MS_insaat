import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  PRODUCTION_TENANT_MODELS,
  type ProductionTenantModelCount,
} from "./production-tenant-inventory";
import {
  readProductionTenantInventoryPreflightConfig,
  runProductionTenantInventoryPreflight,
} from "./production-tenant-inventory-preflight";

const sha = "56a6125acc9229fc1e164c61955dd0159d878452";
const validEnv = {
  DATABASE_URL: "postgresql://readonly:secret@production.example/db?sslmode=require",
  GITHUB_SHA: sha,
  NOA_RELEASE_ID: sha,
  NOA_RUNTIME_ENV: "production",
  NOA_SOURCE_REF: "refs/heads/main",
  NOA_TENANT_INVENTORY_CONFIRMATION: "production-tenant-inventory-preflight",
  NOA_TENANT_INVENTORY_TENANT_ID: "tenant-001",
  R2_ACCESS_KEY_ID: "document-read",
  R2_BUCKET: "noa-insaat-production-eu",
  R2_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_SECRET_ACCESS_KEY: "document-secret",
};

const modelCounts = PRODUCTION_TENANT_MODELS.map((model) => ({
  count: model === "DocumentFile" ? 1 : 0,
  model,
})) satisfies ProductionTenantModelCount[];

describe("production tenant inventory live preflight", () => {
  test("accepts only exact production, main, SHA, tenant and document storage config", () => {
    expect(readProductionTenantInventoryPreflightConfig(validEnv)).toMatchObject({
      databaseUrl: validEnv.DATABASE_URL,
      releaseId: sha,
      tenantId: "tenant-001",
      documentStorage: { bucket: "noa-insaat-production-eu" },
    });
    for (const env of [
      { ...validEnv, NOA_RUNTIME_ENV: "staging" },
      { ...validEnv, NOA_SOURCE_REF: "refs/heads/feature" },
      { ...validEnv, GITHUB_SHA: "a".repeat(40) },
      { ...validEnv, R2_BUCKET: "another-production-bucket" },
    ]) {
      expect(() => readProductionTenantInventoryPreflightConfig(env)).toThrow();
    }
  });

  test("builds the manifest and keeps destructive closure gates closed", async () => {
    const repository = {
      readTenantInventory: vi.fn().mockResolvedValue({
        documents: [
          { sizeBytes: 12, storageKey: "document-center/a/file.pdf" },
        ],
        modelCounts,
        tenant: {
          activeLegalHoldCount: 0,
          activeSessionCount: 2,
          lifecycleStatus: "FROZEN",
          lifecycleVersion: 3,
        },
      }),
    };
    const objectHeadPort = {
      headObjects: vi.fn().mockResolvedValue([
        {
          exists: true,
          sizeBytes: 12,
          storageKey: "document-center/a/file.pdf",
        },
      ]),
    };

    const result = await runProductionTenantInventoryPreflight({
      generatedAt: new Date("2026-08-09T12:00:00.000Z"),
      objectHeadPort,
      releaseId: sha,
      repository,
      tenantId: "tenant-001",
    });

    expect(result.manifest).toMatchObject({
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      documents: {
        metadataCount: 1,
        objectHeadVerifiedCount: 1,
        storageKeyCount: 1,
        totalSizeBytes: 12,
      },
      readOnly: true,
    });
    expect(result.closurePreflight).toMatchObject({
      accessFreezeAllowed: false,
      blockers: ["backup-deletion-replay-not-ready"],
      destructiveDeleteAllowed: false,
      preflightReady: false,
      purgeAllowed: false,
      readOnly: true,
    });
    expect(repository.readTenantInventory).toHaveBeenCalledWith({
      activeAt: new Date("2026-08-09T12:00:00.000Z"),
      models: PRODUCTION_TENANT_MODELS,
      tenantId: "tenant-001",
    });
  });

  test("fails closed for missing tenant, duplicate keys, missing objects and byte drift", async () => {
    const baseRead = {
      documents: [{ sizeBytes: 12, storageKey: "document-center/a/file.pdf" }],
      modelCounts,
      tenant: {
        activeLegalHoldCount: 0,
        activeSessionCount: 0,
        lifecycleStatus: "ACTIVE" as const,
        lifecycleVersion: 1,
      },
    };
    const run = (databaseRead: unknown, headRows: unknown[]) =>
      runProductionTenantInventoryPreflight({
        generatedAt: new Date("2026-08-09T12:00:00.000Z"),
        objectHeadPort: { headObjects: vi.fn().mockResolvedValue(headRows) },
        releaseId: sha,
        repository: {
          readTenantInventory: vi.fn().mockResolvedValue(databaseRead),
        },
        tenantId: "tenant-001",
      });

    await expect(run({ ...baseRead, tenant: null }, [])).rejects.toThrow(
      /tenant kaydını bulamadı/,
    );
    await expect(
      run(
        { ...baseRead, documents: [...baseRead.documents, ...baseRead.documents] },
        [],
      ),
    ).rejects.toThrow(/tekrar eden storage key/);
    await expect(
      run(baseRead, [
        {
          exists: false,
          sizeBytes: 0,
          storageKey: "document-center/a/file.pdf",
        },
      ]),
    ).rejects.toThrow(/R2 nesnesi eksik/);
    await expect(
      run(baseRead, [
        {
          exists: true,
          sizeBytes: 13,
          storageKey: "document-center/a/file.pdf",
        },
      ]),
    ).rejects.toThrow(/byte uyuşmazlığı/);
  });

  test("keeps workflow and live adapters read-only and main-pinned", () => {
    const workflow = readFileSync(
      resolve(
        process.cwd(),
        ".github/workflows/production-tenant-inventory-preflight.yml",
      ),
      "utf8",
    );
    const prismaSource = readFileSync(
      resolve(
        process.cwd(),
        "src/lib/production-tenant-inventory-prisma-repository.ts",
      ),
      "utf8",
    );
    const r2Source = readFileSync(
      resolve(process.cwd(), "src/lib/production-tenant-inventory-r2.ts"),
      "utf8",
    );
    const script = readFileSync(
      resolve(
        process.cwd(),
        "scripts/verify-production-tenant-inventory-preflight.ts",
      ),
      "utf8",
    );

    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("PRODUCTION_TENANT_INVENTORY_DATABASE_URL");
    expect(workflow).not.toContain("secrets.PRODUCTION_DATABASE_URL");
    expect(workflow).not.toMatch(/upload-artifact|schedule:/);
    expect(prismaSource).not.toMatch(
      /\.(create|delete|deleteMany|update|updateMany|upsert)\s*\(/,
    );
    expect(prismaSource).not.toContain("$queryRawUnsafe");
    expect(r2Source).toContain("HeadObjectCommand");
    expect(r2Source).not.toMatch(
      /ListObjects|GetObjectCommand|PutObjectCommand|DeleteObjectCommand/,
    );
    expect(script).not.toMatch(/ListObjects|GetObject|PutObject|DeleteObject/);
  });
});
