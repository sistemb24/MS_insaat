import { navigationItems } from "./navigation";
import {
  listSubscriptionFeatureAccessRows,
  type SubscriptionFeatureAccessRow,
  type SubscriptionFeatureKey,
  type SubscriptionOverview,
} from "./subscription-service";

const subscriptionRouteFeatureMap: Partial<Record<string, SubscriptionFeatureKey>> = {
  araclar: "arvento-fleet",
  cek: "cheques",
  "dokuman-merkezi": "document-center",
  "e-fatura-yonetimi": "e-invoice",
  hakedis: "progress-payments",
  "ihale-yonetimi": "tender-management",
};

export function getSubscriptionFeatureKeyForRoute(routeSlug: string) {
  return subscriptionRouteFeatureMap[routeSlug];
}

export function listSubscriptionGuardedRouteSlugs() {
  return navigationItems
    .map((item) => item.href.slice(1))
    .filter((slug) => Boolean(getSubscriptionFeatureKeyForRoute(slug)));
}

export function findSubscriptionFeatureAccessRow(
  overview: SubscriptionOverview,
  featureKey: SubscriptionFeatureKey,
  today?: string,
): SubscriptionFeatureAccessRow | undefined {
  return listSubscriptionFeatureAccessRows(overview, today).find(
    (row) => row.key === featureKey,
  );
}

export function findSubscriptionRouteAccessRow(
  overview: SubscriptionOverview,
  routeSlug: string,
  today?: string,
): SubscriptionFeatureAccessRow | undefined {
  const featureKey = getSubscriptionFeatureKeyForRoute(routeSlug);

  return featureKey
    ? findSubscriptionFeatureAccessRow(overview, featureKey, today)
    : undefined;
}

export function canLoadSubscriptionGuardedRouteData(
  access?: SubscriptionFeatureAccessRow,
) {
  return access?.enabled ?? true;
}
