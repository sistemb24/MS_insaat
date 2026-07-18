"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import { prisma } from "@/lib/prisma";
import { ensureTenantScope } from "@/lib/prisma-scope-bootstrap";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import {
  createSubscriptionPrismaRepository,
  type SubscriptionPrismaClientLike,
} from "@/lib/subscription-prisma-repository";
import { createSandboxSubscriptionPaymentProvider } from "@/lib/subscription-payment-provider";
import {
  activateSubscriptionAddonCheckout,
  activateSubscriptionPlanChange,
  activateSubscriptionRenewal,
  createSubscriptionAddonCheckout,
  createSubscriptionPlanChangeCheckout,
  createSubscriptionRenewalCheckout,
  failSubscriptionAddonCheckout,
  failSubscriptionPlanChangeCheckout,
  failSubscriptionRenewalCheckout,
  listSubscriptionOverview,
  requireSubscriptionFeature,
  type SubscriptionBillingCycle,
  type SubscriptionFeatureKey,
} from "@/lib/subscription-service";

const subscriptionRepository = createSubscriptionPrismaRepository(
  prisma as unknown as SubscriptionPrismaClientLike,
);
const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);
const subscriptionPaymentProvider = createSandboxSubscriptionPaymentProvider();

export async function listSubscriptionOverviewAction() {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });

  return {
    data: {
      overview: listSubscriptionOverview(snapshot),
      scope,
    },
    ok: true as const,
  };
}

export async function requireSubscriptionFeatureAction(
  featureKey: SubscriptionFeatureKey,
) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });

  return requireSubscriptionFeature(listSubscriptionOverview(snapshot), featureKey);
}

export async function createSubscriptionPlanChangeCheckoutAction(values: {
  billingCycle: SubscriptionBillingCycle;
  targetPlanId: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await createSubscriptionPlanChangeCheckout({
    auditLogRepository,
    billingCycle: values.billingCycle,
    overview: listSubscriptionOverview(snapshot),
    paymentProvider: subscriptionPaymentProvider,
    repository: subscriptionRepository,
    scope,
    targetPlanId: values.targetPlanId,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

export async function createSubscriptionRenewalCheckoutAction(values: {
  billingCycle: SubscriptionBillingCycle;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await createSubscriptionRenewalCheckout({
    auditLogRepository,
    billingCycle: values.billingCycle,
    overview: listSubscriptionOverview(snapshot),
    paymentProvider: subscriptionPaymentProvider,
    repository: subscriptionRepository,
    scope,
  });
  if (result.ok) revalidateSubscriptionSurfaces();
  return result;
}

export async function createSubscriptionAddonCheckoutAction(values: {
  addonId: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await createSubscriptionAddonCheckout({
    addonId: values.addonId,
    auditLogRepository,
    overview: listSubscriptionOverview(snapshot),
    paymentProvider: subscriptionPaymentProvider,
    repository: subscriptionRepository,
    scope,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

export async function activateSubscriptionPlanChangeAction(values: {
  billingCycle: SubscriptionBillingCycle;
  invoiceNo: string;
  paymentProviderRef?: string;
  targetPlanId: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await activateSubscriptionPlanChange({
    auditLogRepository,
    billingCycle: values.billingCycle,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    repository: subscriptionRepository,
    scope,
    targetPlanId: values.targetPlanId,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

export async function activateSubscriptionRenewalAction(values: {
  billingCycle: SubscriptionBillingCycle;
  invoiceNo: string;
  paymentProviderRef?: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await activateSubscriptionRenewal({
    auditLogRepository,
    billingCycle: values.billingCycle,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    repository: subscriptionRepository,
    scope,
  });
  if (result.ok) revalidateSubscriptionSurfaces();
  return result;
}

export async function activateSubscriptionAddonCheckoutAction(values: {
  addonId: string;
  invoiceNo: string;
  paymentProviderRef?: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await activateSubscriptionAddonCheckout({
    addonId: values.addonId,
    auditLogRepository,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    repository: subscriptionRepository,
    scope,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

export async function failSubscriptionPlanChangeCheckoutAction(values: {
  amount: number;
  invoiceNo: string;
  paymentProviderRef?: string;
  reason?: string;
  targetPlanId: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await failSubscriptionPlanChangeCheckout({
    amount: values.amount,
    auditLogRepository,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    reason: values.reason,
    repository: subscriptionRepository,
    scope,
    targetPlanId: values.targetPlanId,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

export async function failSubscriptionRenewalCheckoutAction(values: {
  amount: number;
  invoiceNo: string;
  paymentProviderRef?: string;
  reason?: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await failSubscriptionRenewalCheckout({
    amount: values.amount,
    auditLogRepository,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    reason: values.reason,
    repository: subscriptionRepository,
    scope,
  });
  if (result.ok) revalidateSubscriptionSurfaces();
  return result;
}

export async function failSubscriptionAddonCheckoutAction(values: {
  addonId: string;
  amount: number;
  invoiceNo: string;
  paymentProviderRef?: string;
  reason?: string;
}) {
  const scope = await getActiveTenantScope();
  await ensureTenantScope(prisma, scope);
  const snapshot = await subscriptionRepository.getCurrentSnapshot({ scope });
  const result = await failSubscriptionAddonCheckout({
    addonId: values.addonId,
    amount: values.amount,
    auditLogRepository,
    invoiceNo: values.invoiceNo,
    overview: listSubscriptionOverview(snapshot),
    paymentProviderRef: values.paymentProviderRef,
    reason: values.reason,
    repository: subscriptionRepository,
    scope,
  });

  if (result.ok) {
    revalidateSubscriptionSurfaces();
  }

  return result;
}

function revalidateSubscriptionSurfaces() {
  revalidatePath("/abonelik");
  revalidatePath("/ayarlar");
  revalidatePath("/[module]", "page");
}
