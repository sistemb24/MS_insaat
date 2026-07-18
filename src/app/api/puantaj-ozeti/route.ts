import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createTimesheetPrismaRepository, type TimesheetPrismaClientLike } from "@/lib/timesheet-prisma-repository";
import { createTimesheetService } from "@/lib/timesheet-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const timesheetService = createTimesheetService({ now: () => new Date().toISOString(), repository: createTimesheetPrismaRepository(prisma as unknown as TimesheetPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["timesheets"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await timesheetService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  const statusCounts = result.data.rows.reduce<Record<string, number>>((counts, row) => { counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, {});
  return Response.json({ ok: true, data: { totalCount: result.data.rows.length, statusCounts, totalWorkedDays: result.data.rows.reduce((sum, row) => sum + row.totalWorkedDays, 0), totalOvertimeHours: result.data.rows.reduce((sum, row) => sum + row.totalOvertimeHours, 0) } });
}
