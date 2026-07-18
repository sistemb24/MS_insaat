import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const auditRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["audit"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const url = new URL(request.url);
  const entityType = (url.searchParams.get("entityType") ?? "").trim().slice(0, 80);
  if (!entityType) return Response.json({ ok: false, errors: ["entityType sorgu parametresi zorunludur."] }, { status: 400 });
  const parsedLimit = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const rows = await auditRepository.listByEntityType({ entityType, limit, scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  return Response.json({ ok: true, data: { entityType, count: rows.length, rows } });
}
