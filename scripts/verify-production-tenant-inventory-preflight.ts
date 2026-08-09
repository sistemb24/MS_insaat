import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createR2Client } from "../src/lib/document-storage-r2";
import { createProductionTenantInventoryPrismaRepository } from "../src/lib/production-tenant-inventory-prisma-repository";
import {
  readProductionTenantInventoryPreflightConfig,
  runProductionTenantInventoryPreflight,
} from "../src/lib/production-tenant-inventory-preflight";
import { createProductionTenantInventoryR2HeadPort } from "../src/lib/production-tenant-inventory-r2";

async function main() {
  const config = readProductionTenantInventoryPreflightConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
    log: ["error"],
  });
  const r2Client = createR2Client(config.documentStorage);

  try {
    const result = await runProductionTenantInventoryPreflight({
      generatedAt: new Date(),
      objectHeadPort: createProductionTenantInventoryR2HeadPort({
        bucket: config.documentStorage.bucket,
        client: r2Client,
      }),
      releaseId: config.releaseId,
      repository: createProductionTenantInventoryPrismaRepository(prisma),
      tenantId: config.tenantId,
    });
    const totalRecordCount = result.manifest.categories.reduce(
      (sum, category) => sum + category.recordCount,
      0,
    );

    console.log(
      JSON.stringify({
        activeLegalHoldCount: result.manifest.tenant.activeLegalHoldCount,
        activeSessionCount: result.manifest.tenant.activeSessionCount,
        checksum: result.manifest.checksum,
        closureBlockers: result.closurePreflight.blockers,
        closurePreflightReady: result.closurePreflight.preflightReady,
        destructiveDeleteAllowed:
          result.closurePreflight.destructiveDeleteAllowed,
        documentCount: result.manifest.documents.metadataCount,
        lifecycleStatus: result.manifest.tenant.lifecycleStatus,
        modelCount: result.manifest.models.length,
        purgeAllowed: result.closurePreflight.purgeAllowed,
        readOnly: result.manifest.readOnly,
        releaseId: result.manifest.releaseId,
        retentionPolicyVersion: result.manifest.retentionPolicyVersion,
        status: "inventory-ready",
        totalRecordCount,
      }),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    r2Client.destroy();
  }
}

void main();
