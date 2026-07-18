import { describe, expect, test } from "vitest";

import { listSubscriptionOverview } from "./subscription-service";
import {
  canLoadSubscriptionGuardedRouteData,
  findSubscriptionFeatureAccessRow,
  findSubscriptionRouteAccessRow,
  getSubscriptionFeatureKeyForRoute,
  listSubscriptionGuardedRouteSlugs,
} from "./subscription-route-guard";

describe("subscription route guard", () => {
  test("maps route slugs to package feature keys without panel-only features", () => {
    expect(getSubscriptionFeatureKeyForRoute("hakedis")).toBe(
      "progress-payments",
    );
    expect(getSubscriptionFeatureKeyForRoute("cek")).toBe("cheques");
    expect(getSubscriptionFeatureKeyForRoute("ihale-yonetimi")).toBe(
      "tender-management",
    );
    expect(getSubscriptionFeatureKeyForRoute("dokuman-merkezi")).toBe(
      "document-center",
    );
    expect(getSubscriptionFeatureKeyForRoute("araclar")).toBe("arvento-fleet");
    expect(getSubscriptionFeatureKeyForRoute("e-fatura-yonetimi")).toBe(
      "e-invoice",
    );
    expect(getSubscriptionFeatureKeyForRoute("ayarlar")).toBeUndefined();
  });

  test("lists guarded route slugs in navigation order", () => {
    expect(listSubscriptionGuardedRouteSlugs()).toEqual([
      "ihale-yonetimi",
      "dokuman-merkezi",
      "araclar",
      "e-fatura-yonetimi",
      "hakedis",
      "cek",
    ]);
  });

  test("finds feature access rows from a subscription overview", () => {
    const overview = listSubscriptionOverview();

    expect(findSubscriptionFeatureAccessRow(overview, "bank-integration")).toMatchObject({
      enabled: false,
      key: "bank-integration",
      requiredPlan: "Kurumsal",
    });
    expect(findSubscriptionFeatureAccessRow(overview, "document-center")).toMatchObject({
      enabled: true,
      key: "document-center",
      requiredPlan: "Profesyonel",
    });
  });

  test("closes guarded routes when a high-tier subscription has expired", () => {
    const overview = listSubscriptionOverview({
      currentSubscription: {
        autoRenew: false,
        billingCycle: "monthly",
        endsAt: "2026-07-03",
        planId: "kurumsal",
        planName: "Kurumsal",
        renewalAmount: 16900,
        startsAt: "2026-06-04",
        storageLimitGb: 100,
        subscriptionId: "expired-kurumsal-subscription",
        userLimit: 75,
      },
    });

    expect(findSubscriptionRouteAccessRow(overview, "hakedis", "2026-07-04")).toMatchObject({
      enabled: false,
      key: "progress-payments",
      reason: "Abonelik süresi 2026-07-03 tarihinde doldu. Paketi yenilemek gerekir.",
    });
    expect(
      canLoadSubscriptionGuardedRouteData(
        findSubscriptionRouteAccessRow(overview, "hakedis", "2026-07-04"),
      ),
    ).toBe(false);
  });
  test("finds route access rows through the route map", () => {
    const overview = listSubscriptionOverview({
      currentSubscription: {
        autoRenew: false,
        billingCycle: "monthly",
        endsAt: "2026-08-31",
        planId: "baslangic",
        planName: "Başlangıç",
        renewalAmount: 2900,
        startsAt: "2026-08-01",
        storageLimitGb: 10,
        userLimit: 5,
      },
    });

    expect(findSubscriptionRouteAccessRow(overview, "hakedis")).toMatchObject({
      enabled: false,
      key: "progress-payments",
      label: "Hakediş",
      requiredPlan: "Profesyonel",
    });
    expect(findSubscriptionRouteAccessRow(overview, "ayarlar")).toBeUndefined();
    expect(findSubscriptionRouteAccessRow(overview, "araclar")).toMatchObject({
      enabled: false,
      key: "arvento-fleet",
      label: "Arvento Filo Takip",
      requiredPlan: "Kurumsal",
    });
  });

  test("allows domain data loading only when guarded route access is open", () => {
    expect(canLoadSubscriptionGuardedRouteData()).toBe(true);
    expect(
      canLoadSubscriptionGuardedRouteData({
        enabled: true,
        key: "document-center",
        label: "Döküman Merkezi",
        reason: "Profesyonel paketi kapsamında kullanılabilir.",
        requiredPlan: "Profesyonel",
        source: "plan",
      }),
    ).toBe(true);
    expect(
      canLoadSubscriptionGuardedRouteData({
        enabled: false,
        key: "progress-payments",
        label: "Hakediş",
        reason: "Profesyonel pakete yükseltme gerekir.",
        requiredPlan: "Profesyonel",
        source: "upgrade-required",
      }),
    ).toBe(false);
  });
});
