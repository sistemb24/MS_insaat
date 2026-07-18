import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type {
  SubscriptionPaymentProvider,
  SubscriptionPaymentProviderCheckoutSession,
} from "./subscription-payment-provider";
import type { TenantScope } from "./tenant-scope";

export type SubscriptionBillingCycle = "monthly" | "yearly";

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  includedModules: string[];
  isCurrent: boolean;
};

export type SubscriptionAddonRow = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  status: "active" | "available" | "included";
};

export type SubscriptionPaymentHistoryRow = {
  id: string;
  invoiceNo: string;
  date: string;
  amount: number;
  status: "Ödendi" | "Bekliyor" | "Başarısız";
  method: string;
  providerRef: string | null;
};

export type SubscriptionPaymentProviderEventRow = {
  errorMessage: string | null;
  eventId: string;
  eventType: "subscription.payment.succeeded" | "subscription.payment.failed";
  invoiceNo: string;
  processedAt: string | null;
  providerRef: string;
  receivedAt: string;
  resultStatus: "activated" | "failed" | null;
  status: "processing" | "processed" | "failed";
};

export type SubscriptionFeatureKey =
  | "progress-payments"
  | "cheques"
  | "tender-management"
  | "document-center"
  | "e-invoice"
  | "bank-integration"
  | "arvento-fleet"
  | "ai-analysis";

export type SubscriptionFeatureAccessSource =
  | "plan"
  | "addon-included"
  | "upgrade-required";

export type SubscriptionFeatureAccessRow = {
  key: SubscriptionFeatureKey;
  label: string;
  enabled: boolean;
  source: SubscriptionFeatureAccessSource;
  requiredPlan: string;
  reason: string;
};

export type SubscriptionFeatureGuardResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      errors: string[];
      featureLabel: string;
      requiredPlan: string;
    };

export type CurrentSubscriptionSummary = {
  subscriptionId?: string;
  planId: string;
  planName: string;
  billingCycle: SubscriptionBillingCycle;
  startsAt: string;
  endsAt: string;
  renewalAmount: number;
  autoRenew: boolean;
  userLimit: number;
  storageLimitGb: number;
};

export type SubscriptionOverview = {
  currentSubscription: CurrentSubscriptionSummary;
  plans: SubscriptionPlanRow[];
  addons: SubscriptionAddonRow[];
  paymentHistory: SubscriptionPaymentHistoryRow[];
  paymentProviderEvents: SubscriptionPaymentProviderEventRow[];
  integrationMode: "read-model" | "persistence-read";
};

export type SubscriptionActionResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type SubscriptionInvoiceDraft = {
  amount: number;
  currency: "TRY";
  invoiceNo: string;
  method: "Ödeme sağlayıcı seçilecek";
  status: "Bekliyor";
};

export type SubscriptionCheckoutDraft = {
  amount: number;
  billingCycle: SubscriptionBillingCycle;
  currency: "TRY";
  currentPlanId: string;
  currentPlanName: string;
  invoiceDraft: SubscriptionInvoiceDraft;
  providerSession?: SubscriptionPaymentProviderCheckoutSession;
  status: "provider-pending";
  targetPlanId: string;
  targetPlanName: string;
};

export type SubscriptionAddonCheckoutDraft = {
  addonId: string;
  addonName: string;
  amount: number;
  currency: "TRY";
  invoiceDraft: SubscriptionInvoiceDraft;
  providerSession?: SubscriptionPaymentProviderCheckoutSession;
  status: "provider-pending";
};

export type SubscriptionPlanCatalogRow = {
  description: string;
  id: string;
  includedModules: string[];
  isActive: boolean;
  monthlyPrice: number;
  name: string;
  sortOrder: number;
  storageLimitGb: number;
  userLimit: number;
};

export type TenantSubscriptionActivationRow = {
  autoRenew: boolean;
  billingCycle: SubscriptionBillingCycle;
  companyId: string;
  createdAt: string;
  createdBy: string;
  endsAt: string;
  id: string;
  periodId: string;
  planId: string;
  renewalAmount: number;
  startsAt: string;
  status: "active";
  storageLimitGb: number;
  tenantId: string;
  updatedAt: string;
  updatedBy: string;
  userLimit: number;
};

export type SubscriptionInvoiceActivationRow = {
  amount: number;
  companyId: string;
  createdAt: string;
  currency: "TRY";
  id: string;
  invoiceDate: string;
  invoiceNo: string;
  method: "Sandbox ödeme onayı";
  periodId: string;
  providerRef: string;
  status: "paid";
  subscriptionId: string;
  tenantId: string;
  updatedAt: string;
};

export type SubscriptionAddonCatalogRow = {
  description: string;
  id: string;
  isActive: boolean;
  monthlyPrice: number;
  name: string;
};

export type TenantSubscriptionAddonActivationRow = {
  addonId: string;
  companyId: string;
  createdAt: string;
  endsAt: string | null;
  id: string;
  monthlyPrice: number;
  periodId: string;
  startsAt: string;
  status: "active";
  subscriptionId: string;
  tenantId: string;
  updatedAt: string;
};

export type SubscriptionCheckoutInvoiceDraftRow = {
  amount: number;
  companyId: string;
  createdAt: string;
  currency: "TRY";
  id: string;
  invoiceDate: string;
  invoiceNo: string;
  method: "Ödeme sağlayıcı seçilecek";
  periodId: string;
  providerRef: string | null;
  status: "pending";
  subscriptionId: string;
  tenantId: string;
  updatedAt: string;
};

export type SubscriptionCheckoutInvoiceFailedRow = {
  amount: number;
  companyId: string;
  createdAt: string;
  currency: "TRY";
  id: string;
  invoiceDate: string;
  invoiceNo: string;
  method: "Ödeme sağlayıcı hata döndü";
  periodId: string;
  providerRef: string;
  status: "failed";
  subscriptionId: string;
  tenantId: string;
  updatedAt: string;
};

export type SubscriptionActivationRepository = {
  activatePlanChange(input: {
    invoice: SubscriptionInvoiceActivationRow;
    previousPlanId: string;
    scope: TenantScope;
    subscription: TenantSubscriptionActivationRow;
    targetPlan: SubscriptionPlanCatalogRow;
  }): Promise<{
    invoice: SubscriptionInvoiceActivationRow;
    subscription: TenantSubscriptionActivationRow;
  }>;
};

export type SubscriptionRenewalRepository = {
  renewSubscription(input: {
    invoice: SubscriptionInvoiceActivationRow;
    scope: TenantScope;
    subscription: TenantSubscriptionActivationRow;
  }): Promise<{
    invoice: SubscriptionInvoiceActivationRow;
    subscription: TenantSubscriptionActivationRow;
  }>;
};

export type SubscriptionAddonActivationRepository = {
  activateAddon(input: {
    addon: TenantSubscriptionAddonActivationRow;
    addonCatalog: SubscriptionAddonCatalogRow;
    invoice: SubscriptionInvoiceActivationRow;
    scope: TenantScope;
  }): Promise<{
    addon: TenantSubscriptionAddonActivationRow;
    invoice: SubscriptionInvoiceActivationRow;
  }>;
};

export type SubscriptionCheckoutInvoiceDraftRepository = {
  createCheckoutInvoiceDraft(input: {
    invoice: SubscriptionCheckoutInvoiceDraftRow;
    scope: TenantScope;
  }): Promise<SubscriptionCheckoutInvoiceDraftRow>;
};

export type SubscriptionCheckoutInvoiceFailureRepository = {
  markCheckoutInvoicePaymentFailed(input: {
    invoice: SubscriptionCheckoutInvoiceFailedRow;
    scope: TenantScope;
  }): Promise<SubscriptionCheckoutInvoiceFailedRow>;
};

const YEARLY_DISCOUNT_RATE = 0.17;

export type SubscriptionPersistenceSnapshot = {
  activeAddonIds?: string[];
  currentSubscription?: CurrentSubscriptionSummary;
  paymentHistory?: SubscriptionPaymentHistoryRow[];
  paymentProviderEvents?: SubscriptionPaymentProviderEventRow[];
};

const subscriptionFeatureCatalog: Array<{
  key: SubscriptionFeatureKey;
  label: string;
  moduleName: string;
  requiredPlan: "Profesyonel" | "Kurumsal";
  sourceWhenEnabled: Extract<
    SubscriptionFeatureAccessSource,
    "plan" | "addon-included"
  >;
}> = [
  {
    key: "progress-payments",
    label: "Hakediş",
    moduleName: "Hakediş",
    requiredPlan: "Profesyonel",
    sourceWhenEnabled: "plan",
  },
  {
    key: "cheques",
    label: "Çek",
    moduleName: "Çek",
    requiredPlan: "Profesyonel",
    sourceWhenEnabled: "plan",
  },
  {
    key: "tender-management",
    label: "İhale Yönetimi",
    moduleName: "İhale",
    requiredPlan: "Profesyonel",
    sourceWhenEnabled: "plan",
  },
  {
    key: "document-center",
    label: "Döküman Merkezi",
    moduleName: "Döküman Merkezi",
    requiredPlan: "Profesyonel",
    sourceWhenEnabled: "plan",
  },
  {
    key: "e-invoice",
    label: "E-Fatura/E-Arşiv",
    moduleName: "E-Fatura",
    requiredPlan: "Profesyonel",
    sourceWhenEnabled: "addon-included",
  },
  {
    key: "bank-integration",
    label: "Banka Entegrasyonu",
    moduleName: "Banka Entegrasyonu",
    requiredPlan: "Kurumsal",
    sourceWhenEnabled: "plan",
  },
  {
    key: "arvento-fleet",
    label: "Arvento Filo Takip",
    moduleName: "Araç/Filo",
    requiredPlan: "Kurumsal",
    sourceWhenEnabled: "plan",
  },
  {
    key: "ai-analysis",
    label: "AI Analiz",
    moduleName: "AI Analiz",
    requiredPlan: "Kurumsal",
    sourceWhenEnabled: "plan",
  },
];

const planSeeds = [
  {
    description: "P0 temel operasyon ve finans başlangıcı",
    id: "baslangic",
    includedModules: [
      "Şantiye",
      "Tedarikçi",
      "Kasa/Banka",
      "Gider",
      "Temel Raporlar",
    ],
    monthlyPrice: 2900,
    name: "Başlangıç",
  },
  {
    description: "Günlük inşaat operasyonlarının standart kapsamı",
    id: "standart",
    includedModules: [
      "Başlangıç",
      "Taşeron",
      "Personel/Puantaj",
      "Stok/Depo",
      "Alış/Satış Faturası",
    ],
    monthlyPrice: 5900,
    name: "Standart",
  },
  {
    description: "Hakediş, çek, ihale ve merkezi evrak akışları",
    id: "profesyonel",
    includedModules: [
      "Standart",
      "Hakediş",
      "Çek",
      "İhale",
      "Döküman Merkezi",
      "E-Fatura",
    ],
    monthlyPrice: 9900,
    name: "Profesyonel",
  },
  {
    description: "Entegrasyonlar, filo ve gelişmiş analiz kapsamı",
    id: "kurumsal",
    includedModules: [
      "Hakediş",
      "Çek",
      "İhale",
      "Döküman Merkezi",
      "E-Fatura",
      "Banka Entegrasyonu",
      "Araç/Filo",
      "AI Analiz",
    ],
    monthlyPrice: 16900,
    name: "Kurumsal",
  },
] as const;

const planLimits: Record<
  (typeof planSeeds)[number]["id"],
  { storageLimitGb: number; userLimit: number }
> = {
  baslangic: { storageLimitGb: 5, userLimit: 5 },
  kurumsal: { storageLimitGb: 100, userLimit: 75 },
  profesyonel: { storageLimitGb: 25, userLimit: 25 },
  standart: { storageLimitGb: 10, userLimit: 10 },
};

export function listSubscriptionOverview(
  snapshot: SubscriptionPersistenceSnapshot = {},
): SubscriptionOverview {
  const currentSubscription =
    snapshot.currentSubscription ?? getDefaultCurrentSubscription();
  const activeAddonIds = new Set(snapshot.activeAddonIds ?? []);
  const plans = planSeeds.map<SubscriptionPlanRow>((plan) => ({
    ...plan,
    includedModules: [...plan.includedModules],
    isCurrent: plan.id === currentSubscription.planId,
    yearlyPrice: calculateYearlyPrice(plan.monthlyPrice),
  }));

  return {
    addons: getDefaultAddons().map((addon) =>
      addon.status === "available" && activeAddonIds.has(addon.id)
        ? { ...addon, status: "active" }
        : addon,
    ),
    currentSubscription,
    integrationMode: snapshot.currentSubscription ? "persistence-read" : "read-model",
    paymentHistory: snapshot.paymentHistory ?? getDefaultPaymentHistory(),
    paymentProviderEvents: snapshot.paymentProviderEvents ?? [],
    plans,
  };
}

export function listSubscriptionFeatureAccessRows(
  overview: SubscriptionOverview,
  today = new Date().toISOString().slice(0, 10),
): SubscriptionFeatureAccessRow[] {
  const currentPlan = overview.plans.find(
    (plan) => plan.id === overview.currentSubscription.planId,
  );
  const currentModules = new Set(currentPlan?.includedModules ?? []);
  const includedAddonIds = new Set(
    overview.addons
      .filter((addon) => addon.status === "included" || addon.status === "active")
      .map((addon) => addon.id),
  );
  const isExpired = isSubscriptionExpired(overview.currentSubscription, today);
  const expiredReason = `Abonelik süresi ${overview.currentSubscription.endsAt} tarihinde doldu. Paketi yenilemek gerekir.`;

  return subscriptionFeatureCatalog.map((feature) => {
    const enabledByPlan = currentModules.has(feature.moduleName);
    const enabledByAddon =
      includedAddonIds.has(feature.key) ||
      (feature.key === "e-invoice" && includedAddonIds.has("e-invoice"));
    const enabled = !isExpired && (enabledByPlan || enabledByAddon);
    const source = enabled
      ? enabledByAddon
        ? "addon-included"
        : feature.sourceWhenEnabled
      : "upgrade-required";

    return {
      enabled,
      key: feature.key,
      label: feature.label,
      reason: isExpired
        ? expiredReason
        : enabled
          ? enabledByAddon
            ? `${feature.label} ek özelliği aktif.`
            : `${overview.currentSubscription.planName} paketi kapsamında kullanılabilir.`
          : `${feature.requiredPlan} pakete yükseltme gerekir.`,
      requiredPlan: feature.requiredPlan,
      source,
    };
  });
}

export function canUseSubscriptionFeature(
  overview: SubscriptionOverview,
  featureKey: SubscriptionFeatureKey,
  today?: string,
) {
  const accessRow = listSubscriptionFeatureAccessRows(overview, today).find(
    (row) => row.key === featureKey,
  );

  return {
    enabled: accessRow?.enabled ?? false,
    reason:
      accessRow?.reason ?? "Bu özellik abonelik kataloğunda tanımlı değildir.",
  };
}

export function requireSubscriptionFeature(
  overview: SubscriptionOverview,
  featureKey: SubscriptionFeatureKey,
  today?: string,
): SubscriptionFeatureGuardResult {
  const accessRow = listSubscriptionFeatureAccessRows(overview, today).find(
    (row) => row.key === featureKey,
  );

  if (accessRow?.enabled) {
    return { ok: true };
  }

  const featureLabel = accessRow?.label ?? "Bu özellik";
  const requiredPlan = accessRow?.requiredPlan ?? "uygun";

  const error = accessRow?.reason.startsWith("Abonelik süresi")
    ? `${featureLabel} için abonelik süresi doldu. Paketi yenilemek gerekir.`
    : `${featureLabel} için ${requiredPlan} pakete yükseltme gerekir.`;

  return {
    errors: [error],
    featureLabel,
    ok: false,
    requiredPlan,
  };
}

function isSubscriptionExpired(
  subscription: CurrentSubscriptionSummary,
  today: string,
) {
  return subscription.endsAt < today;
}

export async function createSubscriptionPlanChangeCheckout({
  auditLogRepository,
  billingCycle,
  now = () => new Date().toISOString(),
  overview,
  paymentProvider,
  repository,
  scope,
  targetPlanId,
}: {
  auditLogRepository?: AuditLogRepository;
  billingCycle: SubscriptionBillingCycle;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProvider?: SubscriptionPaymentProvider;
  repository?: SubscriptionCheckoutInvoiceDraftRepository;
  scope: TenantScope;
  targetPlanId: string;
}): Promise<SubscriptionActionResult<{ checkout: SubscriptionCheckoutDraft }>> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: [
        "Abonelik paketi değiştirme yetkisi admin veya muhasebe rolündedir.",
      ],
    };
  }

  const currentPlan = overview.currentSubscription;
  const targetPlan = overview.plans.find((plan) => plan.id === targetPlanId);

  if (!targetPlan) {
    return { ok: false, errors: ["Hedef abonelik paketi bulunamadı."] };
  }

  if (targetPlan.id === currentPlan.planId) {
    return {
      ok: false,
      errors: ["Mevcut paket için yeni satın alma taslağı oluşturulamaz."],
    };
  }

  const amount =
    billingCycle === "yearly" ? targetPlan.yearlyPrice : targetPlan.monthlyPrice;
  const issuedAt = now();
  const invoiceNo = buildSubscriptionInvoiceDraftNo({
    billingCycle,
    issuedAt,
    planId: targetPlan.id,
  });
  const providerSession = await paymentProvider?.createCheckoutSession({
    amount,
    billingCycle,
    currency: "TRY",
    currentPlanId: currentPlan.planId,
    currentPlanName: currentPlan.planName,
    invoiceNo,
    issuedAt,
    scope,
    targetPlanId: targetPlan.id,
    targetPlanName: targetPlan.name,
  });
  const checkout: SubscriptionCheckoutDraft = {
    amount,
    billingCycle,
    currency: "TRY",
    currentPlanId: currentPlan.planId,
    currentPlanName: currentPlan.planName,
    invoiceDraft: {
      amount,
      currency: "TRY",
      invoiceNo,
      method: "Ödeme sağlayıcı seçilecek",
      status: "Bekliyor",
    },
    ...(providerSession ? { providerSession } : {}),
    status: "provider-pending",
    targetPlanId: targetPlan.id,
    targetPlanName: targetPlan.name,
  };

  if (currentPlan.subscriptionId) {
    await repository?.createCheckoutInvoiceDraft({
      invoice: {
        amount,
        companyId: scope.companyId,
        createdAt: issuedAt,
        currency: "TRY",
        id: buildSubscriptionCheckoutInvoiceDraftId({
          invoiceNo,
          scope,
        }),
        invoiceDate: issuedAt.slice(0, 10),
        invoiceNo,
        method: "Ödeme sağlayıcı seçilecek",
        periodId: scope.periodId,
        providerRef: providerSession?.providerRef ?? null,
        status: "pending",
        subscriptionId: currentPlan.subscriptionId,
        tenantId: scope.tenantId,
        updatedAt: issuedAt,
      },
      scope,
    });
  }

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.checkout-draft.create",
      entityId: invoiceNo,
      entityLabel: `${currentPlan.planName} -> ${targetPlan.name}`,
      entityType: "subscription",
      occurredAt: issuedAt,
      metadata: {
        amount,
        billingCycle,
        currency: "TRY",
        paymentProviderStatus: providerSession ? "created" : "not-started",
        ...(providerSession
          ? {
              paymentProvider: providerSession.provider,
              paymentProviderRef: providerSession.providerRef,
            }
          : {}),
        planFrom: currentPlan.planId,
        planTo: targetPlan.id,
      },
    }),
  );

  return {
    ok: true,
    data: {
      checkout,
    },
  };
}

export async function createSubscriptionRenewalCheckout({
  auditLogRepository,
  billingCycle,
  now = () => new Date().toISOString(),
  overview,
  paymentProvider,
  repository,
  scope,
}: {
  auditLogRepository?: AuditLogRepository;
  billingCycle: SubscriptionBillingCycle;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProvider?: SubscriptionPaymentProvider;
  repository?: SubscriptionCheckoutInvoiceDraftRepository;
  scope: TenantScope;
}): Promise<SubscriptionActionResult<{ checkout: SubscriptionCheckoutDraft }>> {
  if (scope.userRole === "viewer") {
    return { ok: false, errors: ["Abonelik yenileme admin veya muhasebe rolü gerektirir."] };
  }

  const current = overview.currentSubscription;
  if (!current.subscriptionId) {
    return { ok: false, errors: ["Yenileme için kalıcı aktif abonelik satırı bulunamadı."] };
  }

  const plan = overview.plans.find((item) => item.id === current.planId);
  if (!plan) {
    return { ok: false, errors: ["Mevcut abonelik paketi bulunamadı."] };
  }

  const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const issuedAt = now();
  const invoiceNo = `REN-${issuedAt.slice(0, 10).replaceAll("-", "")}-${plan.id.toUpperCase()}-${billingCycle.toUpperCase()}`;
  const existingPendingInvoice = overview.paymentHistory.find(
    (invoice) => invoice.invoiceNo === invoiceNo && invoice.status === "Bekliyor",
  );
  if (existingPendingInvoice) {
    return {
      ok: true,
      data: {
        checkout: {
          amount,
          billingCycle,
          currency: "TRY",
          currentPlanId: plan.id,
          currentPlanName: plan.name,
          invoiceDraft: {
            amount,
            currency: "TRY",
            invoiceNo,
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          },
          status: "provider-pending",
          targetPlanId: plan.id,
          targetPlanName: plan.name,
        },
      },
    };
  }
  const providerSession = await paymentProvider?.createCheckoutSession({
    amount,
    billingCycle,
    currency: "TRY",
    currentPlanId: plan.id,
    currentPlanName: plan.name,
    invoiceNo,
    issuedAt,
    scope,
    targetPlanId: plan.id,
    targetPlanName: plan.name,
  });
  const checkout: SubscriptionCheckoutDraft = {
    amount,
    billingCycle,
    currency: "TRY",
    currentPlanId: plan.id,
    currentPlanName: plan.name,
    invoiceDraft: { amount, currency: "TRY", invoiceNo, method: "Ödeme sağlayıcı seçilecek", status: "Bekliyor" },
    ...(providerSession ? { providerSession } : {}),
    status: "provider-pending",
    targetPlanId: plan.id,
    targetPlanName: plan.name,
  };

  await repository?.createCheckoutInvoiceDraft({
    invoice: {
      amount,
      companyId: scope.companyId,
      createdAt: issuedAt,
      currency: "TRY",
      id: buildSubscriptionCheckoutInvoiceDraftId({ invoiceNo, scope }),
      invoiceDate: issuedAt.slice(0, 10),
      invoiceNo,
      method: "Ödeme sağlayıcı seçilecek",
      periodId: scope.periodId,
      providerRef: providerSession?.providerRef ?? null,
      status: "pending",
      subscriptionId: current.subscriptionId,
      tenantId: scope.tenantId,
      updatedAt: issuedAt,
    },
    scope,
  });

  await auditLogRepository?.record(createAuditLogEntry(scope, {
    action: "subscription.renewal-checkout-draft.create",
    entityId: invoiceNo,
    entityLabel: plan.name,
    entityType: "subscription",
    occurredAt: issuedAt,
    metadata: { amount, billingCycle, currency: "TRY", paymentProviderStatus: providerSession ? "created" : "not-started", ...(providerSession ? { paymentProvider: providerSession.provider, paymentProviderRef: providerSession.providerRef } : {}), planId: plan.id },
  }));

  return { ok: true, data: { checkout } };
}

export async function activateSubscriptionRenewal({
  auditLogRepository,
  billingCycle,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-renewal-payment",
  repository,
  scope,
}: {
  auditLogRepository?: AuditLogRepository;
  billingCycle: SubscriptionBillingCycle;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderRef?: string;
  repository: SubscriptionRenewalRepository;
  scope: TenantScope;
}): Promise<SubscriptionActionResult<{ invoice: SubscriptionInvoiceActivationRow; subscription: TenantSubscriptionActivationRow }>> {
  if (scope.userRole === "viewer") {
    return { ok: false, errors: ["Abonelik yenileme admin veya muhasebe rolü gerektirir."] };
  }
  const current = overview.currentSubscription;
  if (!current.subscriptionId) {
    return { ok: false, errors: ["Yenileme için kalıcı aktif abonelik satırı bulunamadı."] };
  }
  const plan = overview.plans.find((item) => item.id === current.planId);
  if (!plan) return { ok: false, errors: ["Mevcut abonelik paketi bulunamadı."] };

  const activatedAt = now();
  const today = activatedAt.slice(0, 10);
  const renewalBase = current.endsAt >= today ? current.endsAt : today;
  const endsAt = calculateSubscriptionEndsAt(renewalBase, billingCycle);
  const amount = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const subscription: TenantSubscriptionActivationRow = {
    autoRenew: current.autoRenew,
    billingCycle,
    companyId: scope.companyId,
    createdAt: activatedAt,
    createdBy: scope.userId,
    endsAt,
    id: current.subscriptionId,
    periodId: scope.periodId,
    planId: plan.id,
    renewalAmount: amount,
    startsAt: current.startsAt,
    status: "active",
    storageLimitGb: current.storageLimitGb,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
    updatedBy: scope.userId,
    userLimit: current.userLimit,
  };
  const invoice: SubscriptionInvoiceActivationRow = {
    amount,
    companyId: scope.companyId,
    createdAt: activatedAt,
    currency: "TRY",
    id: `${current.subscriptionId}::invoice::${invoiceNo}`,
    invoiceDate: today,
    invoiceNo,
    method: "Sandbox ödeme onayı",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "paid",
    subscriptionId: current.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
  };
  const renewed = await repository.renewSubscription({ invoice, scope, subscription });
  await auditLogRepository?.record(createAuditLogEntry(scope, {
    action: "subscription.renewal.activate",
    entityId: invoiceNo,
    entityLabel: plan.name,
    entityType: "subscription",
    occurredAt: activatedAt,
    metadata: { amount, billingCycle, currency: "TRY", endsAtFrom: current.endsAt, endsAtTo: endsAt, paymentProviderRef, planId: plan.id, statusTo: "active" },
  }));
  return { ok: true, data: renewed };
}

export async function createSubscriptionAddonCheckout({
  addonId,
  auditLogRepository,
  now = () => new Date().toISOString(),
  overview,
  paymentProvider,
  repository,
  scope,
}: {
  addonId: string;
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProvider?: SubscriptionPaymentProvider;
  repository?: SubscriptionCheckoutInvoiceDraftRepository;
  scope: TenantScope;
}): Promise<SubscriptionActionResult<{ checkout: SubscriptionAddonCheckoutDraft }>> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: [
        "Ek özellik satın alma yetkisi admin veya muhasebe rolündedir.",
      ],
    };
  }

  const addon = overview.addons.find((item) => item.id === addonId);

  if (!addon) {
    return { ok: false, errors: ["Ek özellik bulunamadı."] };
  }

  if (addon.status === "included") {
    return {
      ok: false,
      errors: ["Bu ek özellik mevcut pakete dahildir."],
    };
  }

  const issuedAt = now();
  const invoiceNo = buildSubscriptionAddonInvoiceDraftNo({
    addonId: addon.id,
    issuedAt,
  });
  const providerSession = await paymentProvider?.createCheckoutSession({
    amount: addon.monthlyPrice,
    billingCycle: "monthly",
    currency: "TRY",
    currentPlanId: overview.currentSubscription.planId,
    currentPlanName: overview.currentSubscription.planName,
    invoiceNo,
    issuedAt,
    scope,
    targetPlanId: addon.id,
    targetPlanName: addon.name,
  });
  const checkout: SubscriptionAddonCheckoutDraft = {
    addonId: addon.id,
    addonName: addon.name,
    amount: addon.monthlyPrice,
    currency: "TRY",
    invoiceDraft: {
      amount: addon.monthlyPrice,
      currency: "TRY",
      invoiceNo,
      method: "Ödeme sağlayıcı seçilecek",
      status: "Bekliyor",
    },
    ...(providerSession ? { providerSession } : {}),
    status: "provider-pending",
  };

  if (overview.currentSubscription.subscriptionId) {
    await repository?.createCheckoutInvoiceDraft({
      invoice: {
        amount: addon.monthlyPrice,
        companyId: scope.companyId,
        createdAt: issuedAt,
        currency: "TRY",
        id: buildSubscriptionCheckoutInvoiceDraftId({
          invoiceNo,
          scope,
        }),
        invoiceDate: issuedAt.slice(0, 10),
        invoiceNo,
        method: "Ödeme sağlayıcı seçilecek",
        periodId: scope.periodId,
        providerRef: providerSession?.providerRef ?? null,
        status: "pending",
        subscriptionId: overview.currentSubscription.subscriptionId,
        tenantId: scope.tenantId,
        updatedAt: issuedAt,
      },
      scope,
    });
  }

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.addon-checkout-draft.create",
      entityId: invoiceNo,
      entityLabel: addon.name,
      entityType: "subscription",
      occurredAt: issuedAt,
      metadata: {
        addonId: addon.id,
        amount: addon.monthlyPrice,
        currency: "TRY",
        paymentProviderStatus: providerSession ? "created" : "not-started",
        ...(providerSession
          ? {
              paymentProvider: providerSession.provider,
              paymentProviderRef: providerSession.providerRef,
            }
          : {}),
      },
    }),
  );

  return {
    ok: true,
    data: {
      checkout,
    },
  };
}

function buildSubscriptionCheckoutInvoiceDraftId({
  invoiceNo,
  scope,
}: {
  invoiceNo: string;
  scope: TenantScope;
}) {
  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}::subscription-checkout::${invoiceNo}`;
}

function buildTenantSubscriptionAddonId({
  addonId,
  scope,
  subscriptionId,
}: {
  addonId: string;
  scope: TenantScope;
  subscriptionId: string;
}) {
  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}::subscription-addon::${subscriptionId}::${addonId}`;
}

export async function activateSubscriptionPlanChange({
  auditLogRepository,
  billingCycle,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-payment",
  repository,
  scope,
  targetPlanId,
}: {
  auditLogRepository?: AuditLogRepository;
  billingCycle: SubscriptionBillingCycle;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderRef?: string;
  repository: SubscriptionActivationRepository;
  scope: TenantScope;
  targetPlanId: string;
}): Promise<
  SubscriptionActionResult<{
    invoice: SubscriptionInvoiceActivationRow;
    subscription: TenantSubscriptionActivationRow;
  }>
> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: ["Abonelik aktivasyonu admin veya muhasebe rolü gerektirir."],
    };
  }

  const currentPlan = overview.currentSubscription;
  const targetPlan = getSubscriptionPlanCatalogRow(targetPlanId);

  if (!targetPlan) {
    return { ok: false, errors: ["Hedef abonelik paketi bulunamadı."] };
  }

  if (targetPlan.id === currentPlan.planId) {
    return {
      ok: false,
      errors: ["Mevcut paket tekrar aktive edilemez."],
    };
  }

  const activatedAt = now();
  const startsAt = activatedAt.slice(0, 10);
  const endsAt = calculateSubscriptionEndsAt(startsAt, billingCycle);
  const amount =
    billingCycle === "yearly"
      ? calculateYearlyPrice(targetPlan.monthlyPrice)
      : targetPlan.monthlyPrice;
  const subscriptionId = buildActivatedSubscriptionId({
    activatedAt,
    planId: targetPlan.id,
    scope,
  });
  const subscription: TenantSubscriptionActivationRow = {
    autoRenew: true,
    billingCycle,
    companyId: scope.companyId,
    createdAt: activatedAt,
    createdBy: scope.userId,
    endsAt,
    id: subscriptionId,
    periodId: scope.periodId,
    planId: targetPlan.id,
    renewalAmount: amount,
    startsAt,
    status: "active",
    storageLimitGb: targetPlan.storageLimitGb,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
    updatedBy: scope.userId,
    userLimit: targetPlan.userLimit,
  };
  const invoice: SubscriptionInvoiceActivationRow = {
    amount,
    companyId: scope.companyId,
    createdAt: activatedAt,
    currency: "TRY",
    id: `${subscriptionId}::invoice::${invoiceNo}`,
    invoiceDate: startsAt,
    invoiceNo,
    method: "Sandbox ödeme onayı",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "paid",
    subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
  };

  const activated = await repository.activatePlanChange({
    invoice,
    previousPlanId: currentPlan.planId,
    scope,
    subscription,
    targetPlan,
  });

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.plan-change.activate",
      entityId: invoiceNo,
      entityLabel: `${currentPlan.planName} -> ${targetPlan.name}`,
      entityType: "subscription",
      occurredAt: activatedAt,
      metadata: {
        amount,
        billingCycle,
        currency: "TRY",
        paymentProviderRef,
        planFrom: currentPlan.planId,
        planTo: targetPlan.id,
        statusTo: "active",
      },
    }),
  );

  return {
    ok: true,
    data: activated,
  };
}

export async function activateSubscriptionAddonCheckout({
  addonId,
  auditLogRepository,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-addon-payment",
  repository,
  scope,
}: {
  addonId: string;
  auditLogRepository?: AuditLogRepository;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderRef?: string;
  repository: SubscriptionAddonActivationRepository;
  scope: TenantScope;
}): Promise<
  SubscriptionActionResult<{
    addon: TenantSubscriptionAddonActivationRow;
    invoice: SubscriptionInvoiceActivationRow;
  }>
> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: ["Ek özellik aktivasyonu admin veya muhasebe rolü gerektirir."],
    };
  }

  const currentSubscription = overview.currentSubscription;
  const addon = overview.addons.find((item) => item.id === addonId);

  if (!currentSubscription.subscriptionId) {
    return {
      ok: false,
      errors: ["Ek özellik aktivasyonu için kalıcı aktif abonelik satırı bulunamadı."],
    };
  }

  if (!addon) {
    return { ok: false, errors: ["Ek özellik bulunamadı."] };
  }

  if (addon.status === "included") {
    return {
      ok: false,
      errors: ["Bu ek özellik mevcut pakete dahildir."],
    };
  }

  const activatedAt = now();
  const startsAt = activatedAt.slice(0, 10);
  const addonActivation: TenantSubscriptionAddonActivationRow = {
    addonId: addon.id,
    companyId: scope.companyId,
    createdAt: activatedAt,
    endsAt: currentSubscription.endsAt,
    id: buildTenantSubscriptionAddonId({
      addonId: addon.id,
      scope,
      subscriptionId: currentSubscription.subscriptionId,
    }),
    monthlyPrice: addon.monthlyPrice,
    periodId: scope.periodId,
    startsAt,
    status: "active",
    subscriptionId: currentSubscription.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
  };
  const invoice: SubscriptionInvoiceActivationRow = {
    amount: addon.monthlyPrice,
    companyId: scope.companyId,
    createdAt: activatedAt,
    currency: "TRY",
    id: `${addonActivation.id}::invoice::${invoiceNo}`,
    invoiceDate: startsAt,
    invoiceNo,
    method: "Sandbox ödeme onayı",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "paid",
    subscriptionId: currentSubscription.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: activatedAt,
  };

  const activated = await repository.activateAddon({
    addon: addonActivation,
    addonCatalog: {
      description: addon.description,
      id: addon.id,
      isActive: true,
      monthlyPrice: addon.monthlyPrice,
      name: addon.name,
    },
    invoice,
    scope,
  });

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.addon.activate",
      entityId: invoiceNo,
      entityLabel: addon.name,
      entityType: "subscription",
      occurredAt: activatedAt,
      metadata: {
        addonId: addon.id,
        amount: addon.monthlyPrice,
        currency: "TRY",
        paymentProviderRef,
        statusTo: "active",
      },
    }),
  );

  return {
    ok: true,
    data: activated,
  };
}

export async function failSubscriptionPlanChangeCheckout({
  amount,
  auditLogRepository,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-payment-failed",
  paymentProviderFailureCode,
  reason = "Ödeme sağlayıcı işlem başarısız döndü.",
  repository,
  scope,
  targetPlanId,
}: {
  amount: number;
  auditLogRepository?: AuditLogRepository;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderFailureCode?: string;
  paymentProviderRef?: string;
  reason?: string;
  repository: SubscriptionCheckoutInvoiceFailureRepository;
  scope: TenantScope;
  targetPlanId: string;
}): Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: [
        "Başarısız abonelik ödemesi işleme yetkisi admin veya muhasebe rolündedir.",
      ],
    };
  }

  const currentPlan = overview.currentSubscription;
  const targetPlan = overview.plans.find((plan) => plan.id === targetPlanId);

  if (!targetPlan) {
    return { ok: false, errors: ["Hedef abonelik paketi bulunamadı."] };
  }

  if (!currentPlan.subscriptionId) {
    return {
      ok: false,
      errors: ["Başarısız ödeme için kalıcı aktif abonelik satırı bulunamadı."],
    };
  }

  const failedAt = now();
  const invoice: SubscriptionCheckoutInvoiceFailedRow = {
    amount,
    companyId: scope.companyId,
    createdAt: failedAt,
    currency: "TRY",
    id: buildSubscriptionCheckoutInvoiceDraftId({
      invoiceNo,
      scope,
    }),
    invoiceDate: failedAt.slice(0, 10),
    invoiceNo,
    method: "Ödeme sağlayıcı hata döndü",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "failed",
    subscriptionId: currentPlan.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: failedAt,
  };

  const failedInvoice = await repository.markCheckoutInvoicePaymentFailed({
    invoice,
    scope,
  });

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.checkout-payment.fail",
      entityId: invoiceNo,
      entityLabel: `${currentPlan.planName} -> ${targetPlan.name}`,
      entityType: "subscription",
      occurredAt: failedAt,
      metadata: {
        amount,
        currency: "TRY",
        failureReason: reason,
        ...(paymentProviderFailureCode ? { paymentProviderFailureCode } : {}),
        paymentProviderRef,
        planFrom: currentPlan.planId,
        planTo: targetPlan.id,
        statusTo: "failed",
      },
    }),
  );

  return {
    ok: true,
    data: {
      invoice: failedInvoice,
    },
  };
}

export async function failSubscriptionRenewalCheckout({
  amount,
  auditLogRepository,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-renewal-payment-failed",
  paymentProviderFailureCode,
  reason = "Ödeme sağlayıcı işlem başarısız döndü.",
  repository,
  scope,
}: {
  amount: number;
  auditLogRepository?: AuditLogRepository;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderFailureCode?: string;
  paymentProviderRef?: string;
  reason?: string;
  repository: SubscriptionCheckoutInvoiceFailureRepository;
  scope: TenantScope;
}): Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>> {
  if (scope.userRole === "viewer") {
    return { ok: false, errors: ["Başarısız abonelik yenilemesi admin veya muhasebe rolü gerektirir."] };
  }

  const current = overview.currentSubscription;
  if (!current.subscriptionId) {
    return { ok: false, errors: ["Başarısız yenileme için kalıcı aktif abonelik satırı bulunamadı."] };
  }

  const existingFailedInvoice = overview.paymentHistory.find(
    (invoice) => invoice.invoiceNo === invoiceNo && invoice.status === "Başarısız",
  );
  if (existingFailedInvoice) {
    const failedAt = `${existingFailedInvoice.date}T00:00:00.000Z`;
    return {
      ok: true,
      data: {
        invoice: {
          amount: existingFailedInvoice.amount,
          companyId: scope.companyId,
          createdAt: failedAt,
          currency: "TRY",
          id: existingFailedInvoice.id,
          invoiceDate: existingFailedInvoice.date,
          invoiceNo,
          method: "Ödeme sağlayıcı hata döndü",
          periodId: scope.periodId,
          providerRef: existingFailedInvoice.providerRef ?? paymentProviderRef,
          status: "failed",
          subscriptionId: current.subscriptionId,
          tenantId: scope.tenantId,
          updatedAt: failedAt,
        },
      },
    };
  }

  const failedAt = now();
  const invoice: SubscriptionCheckoutInvoiceFailedRow = {
    amount,
    companyId: scope.companyId,
    createdAt: failedAt,
    currency: "TRY",
    id: buildSubscriptionCheckoutInvoiceDraftId({ invoiceNo, scope }),
    invoiceDate: failedAt.slice(0, 10),
    invoiceNo,
    method: "Ödeme sağlayıcı hata döndü",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "failed",
    subscriptionId: current.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: failedAt,
  };
  const failedInvoice = await repository.markCheckoutInvoicePaymentFailed({ invoice, scope });

  await auditLogRepository?.record(createAuditLogEntry(scope, {
    action: "subscription.renewal-checkout-payment.fail",
    entityId: invoiceNo,
    entityLabel: current.planName,
    entityType: "subscription",
    occurredAt: failedAt,
    metadata: {
      amount,
      currency: "TRY",
      failureReason: reason,
      ...(paymentProviderFailureCode ? { paymentProviderFailureCode } : {}),
      paymentProviderRef,
      planId: current.planId,
      statusTo: "failed",
    },
  }));

  return { ok: true, data: { invoice: failedInvoice } };
}

export async function failSubscriptionAddonCheckout({
  addonId,
  amount,
  auditLogRepository,
  invoiceNo,
  now = () => new Date().toISOString(),
  overview,
  paymentProviderRef = "sandbox-addon-payment-failed",
  paymentProviderFailureCode,
  reason = "Ödeme sağlayıcı işlem başarısız döndü.",
  repository,
  scope,
}: {
  addonId: string;
  amount: number;
  auditLogRepository?: AuditLogRepository;
  invoiceNo: string;
  now?: () => string;
  overview: SubscriptionOverview;
  paymentProviderFailureCode?: string;
  paymentProviderRef?: string;
  reason?: string;
  repository: SubscriptionCheckoutInvoiceFailureRepository;
  scope: TenantScope;
}): Promise<SubscriptionActionResult<{ invoice: SubscriptionCheckoutInvoiceFailedRow }>> {
  if (scope.userRole === "viewer") {
    return {
      ok: false,
      errors: [
        "Başarısız ek özellik ödemesi işleme yetkisi admin veya muhasebe rolündedir.",
      ],
    };
  }

  const currentSubscription = overview.currentSubscription;
  const addon = overview.addons.find((item) => item.id === addonId);

  if (!currentSubscription.subscriptionId) {
    return {
      ok: false,
      errors: ["Başarısız ek özellik ödemesi için kalıcı aktif abonelik satırı bulunamadı."],
    };
  }

  if (!addon) {
    return { ok: false, errors: ["Ek özellik bulunamadı."] };
  }

  const failedAt = now();
  const invoice: SubscriptionCheckoutInvoiceFailedRow = {
    amount,
    companyId: scope.companyId,
    createdAt: failedAt,
    currency: "TRY",
    id: buildSubscriptionCheckoutInvoiceDraftId({
      invoiceNo,
      scope,
    }),
    invoiceDate: failedAt.slice(0, 10),
    invoiceNo,
    method: "Ödeme sağlayıcı hata döndü",
    periodId: scope.periodId,
    providerRef: paymentProviderRef,
    status: "failed",
    subscriptionId: currentSubscription.subscriptionId,
    tenantId: scope.tenantId,
    updatedAt: failedAt,
  };

  const failedInvoice = await repository.markCheckoutInvoicePaymentFailed({
    invoice,
    scope,
  });

  await auditLogRepository?.record(
    createAuditLogEntry(scope, {
      action: "subscription.addon-checkout-payment.fail",
      entityId: invoiceNo,
      entityLabel: addon.name,
      entityType: "subscription",
      occurredAt: failedAt,
      metadata: {
        addonId: addon.id,
        amount,
        currency: "TRY",
        failureReason: reason,
        ...(paymentProviderFailureCode ? { paymentProviderFailureCode } : {}),
        paymentProviderRef,
        statusTo: "failed",
      },
    }),
  );

  return {
    ok: true,
    data: {
      invoice: failedInvoice,
    },
  };
}

function calculateYearlyPrice(monthlyPrice: number) {
  return Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT_RATE));
}

function buildSubscriptionInvoiceDraftNo({
  billingCycle,
  issuedAt,
  planId,
}: {
  billingCycle: SubscriptionBillingCycle;
  issuedAt: string;
  planId: string;
}) {
  const dateKey = issuedAt.slice(0, 10).replaceAll("-", "");

  return `SUB-${dateKey}-${planId.toUpperCase()}-${billingCycle.toUpperCase()}`;
}

function buildSubscriptionAddonInvoiceDraftNo({
  addonId,
  issuedAt,
}: {
  addonId: string;
  issuedAt: string;
}) {
  const dateKey = issuedAt.slice(0, 10).replaceAll("-", "");

  return `ADD-${dateKey}-${addonId.toUpperCase()}-MONTHLY`;
}

function getSubscriptionPlanCatalogRow(
  planId: string,
): SubscriptionPlanCatalogRow | undefined {
  const planIndex = planSeeds.findIndex((plan) => plan.id === planId);
  const plan = planSeeds[planIndex];

  if (!plan) {
    return undefined;
  }

  const limits = planLimits[plan.id];

  return {
    description: plan.description,
    id: plan.id,
    includedModules: [...plan.includedModules],
    isActive: true,
    monthlyPrice: plan.monthlyPrice,
    name: plan.name,
    sortOrder: planIndex + 1,
    storageLimitGb: limits.storageLimitGb,
    userLimit: limits.userLimit,
  };
}

function buildActivatedSubscriptionId({
  activatedAt,
  planId,
  scope,
}: {
  activatedAt: string;
  planId: string;
  scope: TenantScope;
}) {
  const dateKey = activatedAt.slice(0, 10).replaceAll("-", "");

  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}::subscription::${planId}::${dateKey}`;
}

function calculateSubscriptionEndsAt(
  startsAt: string,
  billingCycle: SubscriptionBillingCycle,
) {
  const [year, month, day] = startsAt.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, day));

  if (billingCycle === "yearly") {
    endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
  } else {
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  }

  endDate.setUTCDate(endDate.getUTCDate() - 1);

  return endDate.toISOString().slice(0, 10);
}

function getDefaultCurrentSubscription(): CurrentSubscriptionSummary {
  return {
    autoRenew: true,
    billingCycle: "yearly",
    endsAt: "2027-06-30",
    planId: "profesyonel",
    planName: "Profesyonel",
    renewalAmount: calculateYearlyPrice(9900),
    startsAt: "2026-07-01",
    storageLimitGb: 25,
    userLimit: 25,
  };
}

function getDefaultAddons(): SubscriptionAddonRow[] {
  return [
    {
      description: "Ek bulut depolama alanı",
      id: "document-storage-5gb",
      monthlyPrice: 790,
      name: "Döküman Yönetimi (+5GB)",
      status: "available",
    },
    {
      description: "GİB entegrasyonu",
      id: "e-invoice",
      monthlyPrice: 1490,
      name: "E-Fatura/E-Arşiv",
      status: "included",
    },
    {
      description: "Open Banking hareket senkronizasyonu",
      id: "bank-integration",
      monthlyPrice: 1290,
      name: "Banka Entegrasyonu",
      status: "available",
    },
    {
      description: "GPS araç takibi",
      id: "arvento-fleet",
      monthlyPrice: 990,
      name: "Arvento Filo Takip",
      status: "available",
    },
    {
      description: "Metraj, risk ve görsel ilerleme analizi",
      id: "ai-analysis",
      monthlyPrice: 2490,
      name: "AI Analiz",
      status: "available",
    },
    {
      description: "Stok giriş/çıkış cihaz akışı",
      id: "barcode-qr",
      monthlyPrice: 690,
      name: "Barkod & QR Tarayıcı",
      status: "available",
    },
  ];
}

function getDefaultPaymentHistory(): SubscriptionPaymentHistoryRow[] {
  return [
    {
      amount: calculateYearlyPrice(9900),
      date: "2026-07-01",
      id: "payment-2026-003",
      invoiceNo: "INV-2026-003",
      method: "Kredi Kartı",
      providerRef: null,
      status: "Ödendi",
    },
    {
      amount: 9900,
      date: "2026-06-01",
      id: "payment-2026-002",
      invoiceNo: "INV-2026-002",
      method: "Kredi Kartı",
      providerRef: null,
      status: "Ödendi",
    },
    {
      amount: 9900,
      date: "2026-05-01",
      id: "payment-2026-001",
      invoiceNo: "INV-2026-001",
      method: "Havale/EFT",
      providerRef: null,
      status: "Ödendi",
    },
  ];
}
