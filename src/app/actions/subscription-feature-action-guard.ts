import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";
import {
  listSubscriptionOverview,
  requireSubscriptionFeature,
  type SubscriptionFeatureGuardResult,
  type SubscriptionFeatureKey,
} from "@/lib/subscription-service";
import type { TenantScope } from "@/lib/tenant-scope";

const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);

export type SubscriptionFeatureActionContext =
  | {
      ok: true;
      scope: TenantScope;
    }
  | {
      ok: false;
      result: Extract<SubscriptionFeatureGuardResult, { ok: false }>;
    };

export async function getSubscriptionFeatureActionContext(
  featureKey: SubscriptionFeatureKey,
): Promise<SubscriptionFeatureActionContext> {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);

  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const guard = requireSubscriptionFeature(
    listSubscriptionOverview(snapshot),
    featureKey,
  );

  if (!guard.ok) {
    return {
      ok: false,
      result: guard,
    };
  }

  return {
    ok: true,
    scope,
  };
}
