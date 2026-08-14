import "dotenv/config";

import {
  asProductionScopeBootstrapPrismaClient,
  createProductionScopeBootstrapPrismaRepository,
} from "../src/lib/production-scope-bootstrap-prisma-repository";
import {
  readProductionScopeBootstrapConfig,
  runProductionScopeBootstrap,
} from "../src/lib/production-scope-bootstrap";
import { prisma } from "../src/lib/prisma";

async function main() {
  const command = readProductionScopeBootstrapConfig(process.env);
  const result = await runProductionScopeBootstrap({
    command,
    repository: createProductionScopeBootstrapPrismaRepository(
      asProductionScopeBootstrapPrismaClient(prisma),
    ),
  });

  console.log(JSON.stringify(result));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Production scope bootstrap başarısız.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
