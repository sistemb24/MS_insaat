import { createPurchaseInvoicePrismaRepository } from "@/lib/purchase-invoice-prisma-repository";
import { createPurchaseInvoiceService } from "@/lib/purchase-invoice-service";
import { prisma } from "@/lib/prisma";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const purchaseInvoiceService = createPurchaseInvoiceService({
  now: () => new Date().toISOString(),
  repository: createPurchaseInvoicePrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["invoices"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const scope = buildTenantScopeFromApiKey(authResult.data.apiKey);
  const result = await purchaseInvoiceService.list({ scope });

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
