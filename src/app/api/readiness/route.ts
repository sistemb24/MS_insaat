import { createOperationalReadinessProbe, operationalResponseHeaders } from "@/lib/operational-health";
import { prisma } from "@/lib/prisma";
import { writeStructuredLog } from "@/lib/structured-logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const probe = createOperationalReadinessProbe({
  checkDatabase: () => prisma.$queryRawUnsafe("SELECT 1"),
});

export async function GET() {
  const readiness = await probe();

  if (readiness.status !== "ready") {
    writeStructuredLog("warn", "readiness.unavailable", {
      database: readiness.checks.database,
    });
  }

  return Response.json(readiness, {
    headers: operationalResponseHeaders(),
    status: readiness.status === "ready" ? 200 : 503,
  });
}
