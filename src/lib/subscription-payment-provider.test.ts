import { describe, expect, test } from "vitest";

import { createSandboxSubscriptionPaymentProvider } from "./subscription-payment-provider";
import { defaultTenantScope } from "./tenant-scope";

describe("subscription payment provider", () => {
  test("creates sandbox checkout sessions with encoded provider reference in the redirect URL", async () => {
    const provider = createSandboxSubscriptionPaymentProvider({
      basePath: "/abonelik",
      ttlMinutes: 15,
    });

    await expect(
      provider.createCheckoutSession({
        amount: 16900,
        billingCycle: "monthly",
        currency: "TRY",
        currentPlanId: "profesyonel",
        currentPlanName: "Profesyonel",
        invoiceNo: "SUB 20260704/KURUMSAL MONTHLY",
        issuedAt: "2026-07-04T09:30:00.000Z",
        scope: defaultTenantScope,
        targetPlanId: "kurumsal",
        targetPlanName: "Kurumsal",
      }),
    ).resolves.toEqual({
      expiresAt: "2026-07-04T09:45:00.000Z",
      provider: "sandbox",
      providerRef: "sandbox-subscription-SUB 20260704/KURUMSAL MONTHLY",
      redirectUrl:
        "/abonelik?checkout=SUB%2020260704%2FKURUMSAL%20MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB%2020260704%2FKURUMSAL%20MONTHLY",
      status: "created",
    });
  });
});
