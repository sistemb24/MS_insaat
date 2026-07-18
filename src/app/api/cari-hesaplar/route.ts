import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["counterparties"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const scope = buildTenantScopeFromApiKey(authResult.data.apiKey);
  const [musteriler, tedarikciler, taseronlar] = await Promise.all([
    entityService.list({ scope, slug: "musteriler" }),
    entityService.list({ scope, slug: "tedarikciler" }),
    entityService.list({ scope, slug: "taseronlar" }),
  ]);

  if (!musteriler.ok) {
    return Response.json(musteriler, { status: 400 });
  }

  if (!tedarikciler.ok) {
    return Response.json(tedarikciler, { status: 400 });
  }

  if (!taseronlar.ok) {
    return Response.json(taseronlar, { status: 400 });
  }

  return Response.json({
    ok: true,
    data: {
      count:
        musteriler.data.rows.length +
        tedarikciler.data.rows.length +
        taseronlar.data.rows.length,
      musteriCariKartlari: musteriler.data.rows,
      tedarikciCariKartlari: tedarikciler.data.rows,
      taseronCariKartlari: taseronlar.data.rows,
    },
  });
}
