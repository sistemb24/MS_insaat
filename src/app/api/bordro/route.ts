import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createPayrollAccrualPrismaRepository, type PayrollAccrualPrismaClientLike } from "@/lib/payroll-accrual-prisma-repository";
import { createPayrollAccrualService } from "@/lib/payroll-accrual-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const payrollService = createPayrollAccrualService({
  now: () => new Date().toISOString(),
  repository: createPayrollAccrualPrismaRepository(prisma as unknown as PayrollAccrualPrismaClientLike),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["payroll"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await payrollService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json({ ok: true, data: { count: result.data.rows.length, rows: result.data.rows } });
}
