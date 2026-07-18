import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";
import { listSubscriptionOverview } from "@/lib/subscription-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["subscriptions"],
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
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const overview = listSubscriptionOverview(snapshot);

  return Response.json({
    ok: true,
    data: {
      currentSubscription: overview.currentSubscription,
      plans: overview.plans,
      addons: overview.addons,
      paymentHistory: overview.paymentHistory,
      paymentProviderEvents: overview.paymentProviderEvents,
      integrationMode: overview.integrationMode,
    },
  });
}
