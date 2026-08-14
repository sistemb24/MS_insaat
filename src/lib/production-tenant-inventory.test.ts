import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { REQUIRED_RETENTION_CATEGORIES } from "./production-retention-policy";
import {
  PRODUCTION_TENANT_MODEL_CATEGORIES,
  PRODUCTION_TENANT_MODEL_GROUPS,
  PRODUCTION_TENANT_MODELS,
  PRODUCTION_TENANT_NON_DIRECT_MODEL_ALLOWLIST,
  buildProductionTenantInventoryManifest,
  type ProductionTenantModelCount,
} from "./production-tenant-inventory";

const modelCounts = PRODUCTION_TENANT_MODELS.map((model) => ({
  count: model === "DocumentFile" ? 2 : 1,
  model,
})) satisfies ProductionTenantModelCount[];

const validInput = {
  documents: {
    metadataCount: 2,
    objectHeadVerifiedCount: 2,
    storageKeyCount: 2,
    totalSizeBytes: 4_096,
  },
  generatedAt: new Date("2026-08-10T08:00:00.000Z"),
  modelCounts,
  releaseId: "50bfff8f4456bacd2c213b8de22a87b7258453db",
  tenant: {
    activeLegalHoldCount: 0,
    activeSessionCount: 3,
    lifecycleStatus: "ACTIVE" as const,
    lifecycleVersion: 2,
  },
  tenantId: "tenant-001",
};

describe("production tenant inventory contract", () => {
  test("classifies every direct tenant Prisma model exactly once", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );
    const prismaModels = [
      ...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm),
    ];
    const directTenantModels = prismaModels
      .filter((match) => /^\s*tenantId\s+/m.test(match[2]))
      .map((match) => match[1])
      .sort();
    const nonDirectModels = prismaModels
      .filter((match) => !/^\s*tenantId\s+/m.test(match[2]))
      .map((match) => match[1])
      .sort();
    const groupedModels = REQUIRED_RETENTION_CATEGORIES.flatMap(
      (category) => PRODUCTION_TENANT_MODEL_GROUPS[category],
    );

    expect(prismaModels).toHaveLength(120);
    expect(directTenantModels).toHaveLength(94);
    expect(Object.keys(PRODUCTION_TENANT_NON_DIRECT_MODEL_ALLOWLIST).sort()).toEqual(
      nonDirectModels,
    );
    expect(new Set(groupedModels).size).toBe(groupedModels.length);
    expect([...PRODUCTION_TENANT_MODELS]).toEqual(directTenantModels);
    expect(Object.keys(PRODUCTION_TENANT_MODEL_CATEGORIES).sort()).toEqual(
      directTenantModels,
    );
  });

  test("builds a deterministic PII-free canonical inventory manifest", () => {
    const first = buildProductionTenantInventoryManifest(validInput);
    const second = buildProductionTenantInventoryManifest({
      ...validInput,
      modelCounts: [...validInput.modelCounts].reverse(),
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      readOnly: true,
      retentionPolicyVersion: "2026-08-09.a",
      schemaVersion: 2,
      tenantId: "tenant-001",
    });
    expect(first.categories).toHaveLength(9);
    expect(first.models).toHaveLength(94);
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain('"storageKey":');
    expect(serialized).not.toMatch(/person@example|serbest metin/i);
  });

  test("fails closed for missing, duplicate or unknown model counts", () => {
    expect(() =>
      buildProductionTenantInventoryManifest({
        ...validInput,
        modelCounts: validInput.modelCounts.slice(1),
      }),
    ).toThrow(/envanteri eksik/);
    expect(() =>
      buildProductionTenantInventoryManifest({
        ...validInput,
        modelCounts: [validInput.modelCounts[0], ...validInput.modelCounts],
      }),
    ).toThrow(/tekrar eden model/);
    expect(() =>
      buildProductionTenantInventoryManifest({
        ...validInput,
        modelCounts: [
          ...validInput.modelCounts.slice(0, -1),
          { count: 1, model: "UnknownTenantTable" as never },
        ],
      }),
    ).toThrow(/bilinmeyen model/);
  });

  test("fails closed for document or tenant summary mismatches", () => {
    expect(() =>
      buildProductionTenantInventoryManifest({
        ...validInput,
        documents: { ...validInput.documents, objectHeadVerifiedCount: 1 },
      }),
    ).toThrow(/metadata\/storage\/head/);
    expect(() =>
      buildProductionTenantInventoryManifest({
        ...validInput,
        tenant: { ...validInput.tenant, lifecycleVersion: 0 },
      }),
    ).toThrow(/sürümü geçerli değil/);
  });
});
