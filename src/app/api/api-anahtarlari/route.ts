import { prisma } from "@/lib/prisma";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { createApiKeyService } from "@/lib/api-key-service";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const apiKeyService = createApiKeyService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  repository: apiKeyRepository,
});

export async function GET(request: Request) {
  const result = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    repository: apiKeyRepository,
    requiredScopes: ["api-keys"],
  });

  if (!result.ok) {
    return Response.json(result, {
      headers: result.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: result.status,
    });
  }

  const overview = await apiKeyService.listOverview({
    scope: buildTenantScopeFromApiKey(result.data.apiKey),
  });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const used = url.searchParams.get("used");
  if (status === null && used === null) {
    return Response.json({ ok: true, data: overview.data.overview });
  }
  const rows = overview.data.overview.rows.filter((row) => {
    const statusMatches = status ? row.status === status : true;
    const usedMatches = used === "true" ? Boolean(row.lastUsedAt) : used === "false" ? !row.lastUsedAt : true;
    return statusMatches && usedMatches;
  });

  return Response.json({ ok: true, data: { rows, summary: { totalCount: rows.length, activeCount: rows.filter((row) => row.status === "active").length, expiredCount: rows.filter((row) => row.status === "expired").length, revokedCount: rows.filter((row) => row.status === "revoked").length } } });
}
