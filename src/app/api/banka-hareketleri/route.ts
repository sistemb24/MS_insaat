import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { createBankIntegrationPrismaRepository } from "@/lib/bank-integration-prisma-repository";
import { createBankIntegrationService } from "@/lib/bank-integration-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const bankService = createBankIntegrationService({
  repository: createBankIntegrationPrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["bank-transactions"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const result = await bankService.listConnections({
    scope: buildTenantScopeFromApiKey(authResult.data.apiKey),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const direction = url.searchParams.get("direction");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  if (status || direction || dateFrom || dateTo) {
    const rows = result.data.transactions.filter((row) =>
      (!status || row.status === status) &&
      (!direction || row.direction === direction) &&
      (!dateFrom || row.occurredAt >= dateFrom) &&
      (!dateTo || row.occurredAt <= dateTo),
    );
    return Response.json({ ok: true, data: { count: rows.length, rows } });
  }

  return Response.json({
    ok: true,
    data: {
      count: result.data.transactions.length,
      rows: result.data.transactions,
    },
  });
}
