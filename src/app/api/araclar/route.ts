import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { createVehiclePrismaRepository } from "@/lib/vehicle-prisma-repository";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const vehicleRepository = createVehiclePrismaRepository(prisma);

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["vehicles"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const scope = buildTenantScopeFromApiKey(authResult.data.apiKey);
  const rows = await vehicleRepository.list({ scope });

  return Response.json({
    ok: true,
    data: {
      count: rows.length,
      activeCount: rows.filter((row) => row.status === "Aktif").length,
      passiveCount: rows.filter((row) => row.status === "Pasif").length,
      rows,
    },
  });
}
