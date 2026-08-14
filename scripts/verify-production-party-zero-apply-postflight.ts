import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createProductionPartyZeroApplyPostflightPrismaRepository } from
  "../src/lib/production-party-zero-apply-postflight-prisma-repository";
import { runProductionPartyZeroApplyPostflight } from
  "../src/lib/production-party-zero-apply-postflight";
import { readProductionPartyZeroApplyConfig } from
  "../src/lib/production-party-transition";

async function main() {
  const config = readProductionPartyZeroApplyConfig(process.env);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  try {
    const result = await runProductionPartyZeroApplyPostflight({
      config,
      repository: createProductionPartyZeroApplyPostflightPrismaRepository(prisma),
    });
    console.log(JSON.stringify(result));
    if (!result.ready) process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void main().catch(() => {
  console.error("Party production zero-apply postflight fail-closed durdu.");
  process.exitCode = 1;
});
