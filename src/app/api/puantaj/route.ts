import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { createTimesheetPrismaRepository } from "@/lib/timesheet-prisma-repository";
import { createTimesheetService } from "@/lib/timesheet-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const timesheetService = createTimesheetService({
  now: () => new Date().toISOString(),
  repository: createTimesheetPrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["timesheets"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const result = await timesheetService.list({
    scope: buildTenantScopeFromApiKey(authResult.data.apiKey),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  return Response.json({
    ok: true,
    data: {
      count: result.data.rows.length,
      rows: result.data.rows,
    },
  });
}
