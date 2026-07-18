import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createVehiclePrismaRepository } from "@/lib/vehicle-prisma-repository";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const vehicleRepository = createVehiclePrismaRepository(prisma);

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["vehicles"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const rows = await vehicleRepository.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  const today = new Date().toISOString().slice(0, 10);
  const dateSummary = ["insuranceEndDate", "inspectionEndDate", "maintenanceDueDate"].reduce<Record<string, { configuredCount: number; overdueCount: number }>>((summary, field) => { summary[field] = { configuredCount: rows.filter((row) => Boolean(row[field as keyof typeof row])).length, overdueCount: rows.filter((row) => { const date = row[field as keyof typeof row]; return typeof date === "string" && date !== "" && date < today; }).length }; return summary; }, {});
  return Response.json({ ok: true, data: { totalCount: rows.length, activeCount: rows.filter((row) => row.status === "Aktif").length, passiveCount: rows.filter((row) => row.status === "Pasif").length, dateSummary } });
}
