import type { SubscriptionBillingCycle } from "./subscription-service";
import type { TenantScope } from "./tenant-scope";

export type SubscriptionPaymentProviderName = "sandbox";

export type SubscriptionPaymentProviderCheckoutInput = {
  amount: number;
  billingCycle: SubscriptionBillingCycle;
  currency: "TRY";
  currentPlanId: string;
  currentPlanName: string;
  invoiceNo: string;
  issuedAt: string;
  scope: TenantScope;
  targetPlanId: string;
  targetPlanName: string;
};

export type SubscriptionPaymentProviderCheckoutSession = {
  expiresAt: string;
  provider: SubscriptionPaymentProviderName;
  providerRef: string;
  redirectUrl: string;
  status: "created";
};

export type SubscriptionPaymentProvider = {
  createCheckoutSession(
    input: SubscriptionPaymentProviderCheckoutInput,
  ): Promise<SubscriptionPaymentProviderCheckoutSession>;
};

export function createSandboxSubscriptionPaymentProvider({
  basePath = "/abonelik",
  ttlMinutes = 15,
}: {
  basePath?: string;
  ttlMinutes?: number;
} = {}): SubscriptionPaymentProvider {
  return {
    async createCheckoutSession(input) {
      const expiresAt = new Date(input.issuedAt);
      expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
      const providerRef = `sandbox-subscription-${input.invoiceNo}`;

      return {
        expiresAt: expiresAt.toISOString(),
        provider: "sandbox",
        providerRef,
        redirectUrl:
          `${basePath}?checkout=${encodeURIComponent(input.invoiceNo)}` +
          `&provider=sandbox&providerRef=${encodeURIComponent(providerRef)}`,
        status: "created",
      };
    },
  };
}
