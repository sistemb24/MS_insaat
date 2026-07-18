import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "@/lib/audit-log-prisma-repository";
import { createUserManagementPrismaRepository, type UserManagementPrismaClientLike } from "@/lib/user-management-prisma-repository";
import { createUserManagementService } from "@/lib/user-management-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const auditRepository = createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike);
const userManagementService = createUserManagementService({ auditLogReadRepository: auditRepository, auditLogRepository: auditRepository, repository: createUserManagementPrismaRepository(prisma as unknown as UserManagementPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["user-management"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await userManagementService.listOverview({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json({ ok: true, data: result.data.overview });
}
