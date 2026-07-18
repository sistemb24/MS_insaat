import type {
  SubscriptionAddonActivationRepository,
  SubscriptionAddonCatalogRow,
  CurrentSubscriptionSummary,
  SubscriptionActivationRepository,
  SubscriptionBillingCycle,
  SubscriptionCheckoutInvoiceDraftRow,
  SubscriptionCheckoutInvoiceDraftRepository,
  SubscriptionInvoiceActivationRow,
  SubscriptionCheckoutInvoiceFailedRow,
  SubscriptionCheckoutInvoiceFailureRepository,
  SubscriptionPaymentHistoryRow,
  SubscriptionPaymentProviderEventRow,
  SubscriptionPersistenceSnapshot,
  SubscriptionPlanCatalogRow,
  SubscriptionRenewalRepository,
  TenantSubscriptionAddonActivationRow,
  TenantSubscriptionActivationRow,
} from "./subscription-service";
import type {
  SubscriptionPaymentWebhookClaimResult,
  SubscriptionPaymentWebhookEventRow,
} from "./subscription-payment-webhook";
import type { TenantScope } from "./tenant-scope";

type SubscriptionPlanRecord = {
  id: string;
  name: string;
};

type TenantSubscriptionRecord = {
  autoRenew: boolean;
  billingCycle: string;
  endsAt: Date | string;
  id: string;
  plan: SubscriptionPlanRecord;
  planId: string;
  renewalAmount: unknown;
  startsAt: Date | string;
  storageLimitGb: number;
  userLimit: number;
};

type SubscriptionInvoiceRecord = {
  amount: unknown;
  currency: string;
  id: string;
  invoiceDate: Date | string;
  invoiceNo: string;
  method: string;
  providerRef: string | null;
  status: string;
};

type SubscriptionPaymentWebhookEventRecord = {
  companyId: string;
  errorMessage: string | null;
  eventId: string;
  eventType: string;
  invoiceNo: string;
  periodId: string;
  processedAt: Date | string | null;
  providerRef: string;
  receivedAt: Date | string;
  resultStatus: string | null;
  status: string;
  tenantId: string;
};

type TenantSubscriptionAddonRecord = {
  addonId: string;
  companyId: string;
  createdAt: Date | string;
  endsAt: Date | string | null;
  id: string;
  monthlyPrice: unknown;
  periodId: string;
  startsAt: Date | string;
  status: string;
  subscriptionId: string;
  tenantId: string;
  updatedAt: Date | string;
};

type TenantSubscriptionClient = {
  create?(input: {
    data: ReturnType<typeof subscriptionActivationRowToCreateData>;
  }): Promise<TenantSubscriptionRecord>;
  findFirst(input: {
    include: {
      plan: true;
    };
    orderBy: Array<{ endsAt: "asc" | "desc" }>;
    where: ReturnType<typeof subscriptionScopeWhere> & {
      status: "active";
    };
  }): Promise<TenantSubscriptionRecord | null>;
  updateMany?(input: {
    data: Record<string, unknown>;
    where: ReturnType<typeof subscriptionScopeWhere> & { id?: string; status: "active" };
  }): Promise<{ count: number }>;
};

type SubscriptionInvoiceClient = {
  findMany(input: {
    orderBy: Array<{ invoiceDate: "asc" | "desc" }>;
    take: number;
    where: ReturnType<typeof subscriptionScopeWhere> & {
      subscriptionId: string;
    };
  }): Promise<SubscriptionInvoiceRecord[]>;
  upsert?(input: {
    create: ReturnType<typeof invoicePersistenceRowToCreateData>;
    update: ReturnType<typeof invoicePersistenceRowToUpdateData>;
    where: {
      tenantId_companyId_periodId_invoiceNo: ReturnType<
        typeof invoiceNoScopeWhere
      >;
    };
  }): Promise<SubscriptionInvoiceRecord>;
};

type SubscriptionPaymentWebhookEventClient = {
  create(input: {
    data: ReturnType<typeof webhookEventRowToCreateData>;
  }): Promise<SubscriptionPaymentWebhookEventRecord>;
  findMany?(input: {
    orderBy: Array<{ receivedAt: "asc" | "desc" }>;
    take: number;
    where: ReturnType<typeof subscriptionScopeWhere>;
  }): Promise<SubscriptionPaymentWebhookEventRecord[]>;
  findUnique(input: {
    where: {
      tenantId_eventId: ReturnType<typeof webhookEventScopeWhere>;
    };
  }): Promise<SubscriptionPaymentWebhookEventRecord | null>;
  update(input: {
    data: ReturnType<typeof webhookEventRowToUpdateData>;
    where: {
      tenantId_eventId: ReturnType<typeof webhookEventScopeWhere>;
    };
  }): Promise<SubscriptionPaymentWebhookEventRecord>;
};

type SubscriptionPlanClient = {
  upsert(input: {
    create: ReturnType<typeof planCatalogRowToCreateData>;
    update: ReturnType<typeof planCatalogRowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<unknown>;
};

type SubscriptionAddonClient = {
  upsert(input: {
    create: ReturnType<typeof addonCatalogRowToCreateData>;
    update: ReturnType<typeof addonCatalogRowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<unknown>;
};

type TenantSubscriptionAddonClient = {
  findMany?(input: {
    where: ReturnType<typeof subscriptionScopeWhere> & {
      status: "active";
      subscriptionId: string;
    };
  }): Promise<TenantSubscriptionAddonRecord[]>;
  upsert(input: {
    create: ReturnType<typeof tenantSubscriptionAddonRowToCreateData>;
    update: ReturnType<typeof tenantSubscriptionAddonRowToUpdateData>;
    where: {
      tenantId_companyId_periodId_subscriptionId_addonId: ReturnType<
        typeof tenantSubscriptionAddonScopeWhere
      >;
    };
  }): Promise<TenantSubscriptionAddonRecord>;
};

export type SubscriptionPrismaClientLike = {
  subscriptionAddon?: SubscriptionAddonClient;
  subscriptionInvoice: SubscriptionInvoiceClient;
  subscriptionPaymentWebhookEvent?: SubscriptionPaymentWebhookEventClient;
  subscriptionPlan?: SubscriptionPlanClient;
  tenantSubscription: TenantSubscriptionClient;
  tenantSubscriptionAddon?: TenantSubscriptionAddonClient;
};

export type SubscriptionRepository = {
  claimPaymentWebhookEvent(input: {
    event: SubscriptionPaymentWebhookEventRow;
    scope: TenantScope;
  }): Promise<SubscriptionPaymentWebhookClaimResult>;
  completePaymentWebhookEvent(input: {
    event: SubscriptionPaymentWebhookEventRow;
    scope: TenantScope;
  }): Promise<SubscriptionPaymentWebhookEventRow>;
  getCurrentSnapshot(input: {
    scope: TenantScope;
  }): Promise<SubscriptionPersistenceSnapshot>;
} & SubscriptionActivationRepository &
  SubscriptionRenewalRepository &
  SubscriptionAddonActivationRepository &
  SubscriptionCheckoutInvoiceDraftRepository &
  SubscriptionCheckoutInvoiceFailureRepository;

export function createSubscriptionPrismaRepository(
  prisma: SubscriptionPrismaClientLike,
): SubscriptionRepository {
  return {
    async activatePlanChange({
      invoice,
      scope,
      subscription,
      targetPlan,
    }) {
      assertSubscriptionWriteClients(prisma);

      await prisma.subscriptionPlan.upsert({
        create: planCatalogRowToCreateData(targetPlan),
        update: planCatalogRowToUpdateData(targetPlan),
        where: {
          id: targetPlan.id,
        },
      });
      await prisma.tenantSubscription.updateMany({
        data: {
          status: "inactive",
          updatedAt: new Date(subscription.updatedAt),
          updatedBy: subscription.updatedBy,
        },
        where: {
          ...subscriptionScopeWhere(scope),
          status: "active",
        },
      });
      await prisma.tenantSubscription.create({
        data: subscriptionActivationRowToCreateData(subscription),
      });
      await prisma.subscriptionInvoice.upsert({
        create: invoicePersistenceRowToCreateData(invoice),
        update: invoicePersistenceRowToUpdateData(invoice),
        where: {
          tenantId_companyId_periodId_invoiceNo: invoiceNoScopeWhere(
            scope,
            invoice.invoiceNo,
          ),
        },
      });

      return {
        invoice,
        subscription,
      };
    },

    async renewSubscription({ invoice, scope, subscription }) {
      assertSubscriptionWriteClients(prisma);
      const updated = await prisma.tenantSubscription.updateMany({
        data: {
          billingCycle: subscription.billingCycle,
          endsAt: new Date(subscription.endsAt),
          renewalAmount: subscription.renewalAmount,
          updatedAt: new Date(subscription.updatedAt),
          updatedBy: subscription.updatedBy,
        },
        where: {
          ...subscriptionScopeWhere(scope),
          id: subscription.id,
          status: "active",
        },
      });
      if (updated.count !== 1) {
        throw new Error("Yenilenecek aktif abonelik kaydı bulunamadı.");
      }
      await prisma.subscriptionInvoice.upsert({
        create: invoicePersistenceRowToCreateData(invoice),
        update: invoicePersistenceRowToUpdateData(invoice),
        where: {
          tenantId_companyId_periodId_invoiceNo: invoiceNoScopeWhere(
            scope,
            invoice.invoiceNo,
          ),
        },
      });
      return { invoice, subscription };
    },

    async activateAddon({
      addon,
      addonCatalog,
      invoice,
      scope,
    }) {
      assertSubscriptionAddonWriteClients(prisma);

      await prisma.subscriptionAddon.upsert({
        create: addonCatalogRowToCreateData(addonCatalog),
        update: addonCatalogRowToUpdateData(addonCatalog),
        where: {
          id: addonCatalog.id,
        },
      });
      await prisma.tenantSubscriptionAddon.upsert({
        create: tenantSubscriptionAddonRowToCreateData(addon),
        update: tenantSubscriptionAddonRowToUpdateData(addon),
        where: {
          tenantId_companyId_periodId_subscriptionId_addonId:
            tenantSubscriptionAddonScopeWhere(scope, addon),
        },
      });
      await prisma.subscriptionInvoice.upsert({
        create: invoicePersistenceRowToCreateData(invoice),
        update: invoicePersistenceRowToUpdateData(invoice),
        where: {
          tenantId_companyId_periodId_invoiceNo: invoiceNoScopeWhere(
            scope,
            invoice.invoiceNo,
          ),
        },
      });

      return {
        addon,
        invoice,
      };
    },

    async claimPaymentWebhookEvent({ event, scope }) {
      assertPaymentWebhookEventClient(prisma);

      const existingEvent = await prisma.subscriptionPaymentWebhookEvent.findUnique({
        where: {
          tenantId_eventId: webhookEventScopeWhere(scope, event.eventId),
        },
      });

      if (existingEvent) {
        return {
          event: webhookEventRecordToRow(existingEvent),
          status: "duplicate",
        };
      }

      await prisma.subscriptionPaymentWebhookEvent.create({
        data: webhookEventRowToCreateData(event),
      });

      return {
        event,
        status: "claimed",
      };
    },

    async completePaymentWebhookEvent({ event, scope }) {
      assertPaymentWebhookEventClient(prisma);

      const updated = await prisma.subscriptionPaymentWebhookEvent.update({
        data: webhookEventRowToUpdateData(event),
        where: {
          tenantId_eventId: webhookEventScopeWhere(scope, event.eventId),
        },
      });

      return webhookEventRecordToRow(updated);
    },

    async createCheckoutInvoiceDraft({ invoice, scope }) {
      assertSubscriptionInvoiceWriteClient(prisma);

      await prisma.subscriptionInvoice.upsert({
        create: invoicePersistenceRowToCreateData(invoice),
        update: invoicePersistenceRowToUpdateData(invoice),
        where: {
          tenantId_companyId_periodId_invoiceNo: invoiceNoScopeWhere(
            scope,
            invoice.invoiceNo,
          ),
        },
      });

      return invoice;
    },

    async markCheckoutInvoicePaymentFailed({ invoice, scope }) {
      assertSubscriptionInvoiceWriteClient(prisma);

      await prisma.subscriptionInvoice.upsert({
        create: invoicePersistenceRowToCreateData(invoice),
        update: invoicePersistenceRowToUpdateData(invoice),
        where: {
          tenantId_companyId_periodId_invoiceNo: invoiceNoScopeWhere(
            scope,
            invoice.invoiceNo,
          ),
        },
      });

      return invoice;
    },

    async getCurrentSnapshot({ scope }) {
      const subscription = await prisma.tenantSubscription.findFirst({
        include: {
          plan: true,
        },
        orderBy: [{ endsAt: "desc" }],
        where: {
          ...subscriptionScopeWhere(scope),
          status: "active",
        },
      });

      if (!subscription) {
        return {};
      }

      const invoices = await prisma.subscriptionInvoice.findMany({
        orderBy: [{ invoiceDate: "desc" }],
        take: 12,
        where: {
          ...subscriptionScopeWhere(scope),
          subscriptionId: subscription.id,
        },
      });

      const activeAddons = prisma.tenantSubscriptionAddon?.findMany
        ? await prisma.tenantSubscriptionAddon.findMany({
            where: {
              ...subscriptionScopeWhere(scope),
              status: "active",
              subscriptionId: subscription.id,
            },
          })
        : [];
      const effectiveActiveAddons = activeAddons.filter(
        isTenantSubscriptionAddonStillEffective,
      );

      const paymentProviderEvents = prisma.subscriptionPaymentWebhookEvent?.findMany
        ? await prisma.subscriptionPaymentWebhookEvent.findMany({
            orderBy: [{ receivedAt: "desc" }],
            take: 8,
            where: subscriptionScopeWhere(scope),
          })
        : [];

      return {
        ...(effectiveActiveAddons.length > 0
          ? {
              activeAddonIds: effectiveActiveAddons.map((addon) => addon.addonId),
            }
          : {}),
        currentSubscription: subscriptionRecordToSummary(subscription),
        paymentHistory: invoices.map(invoiceRecordToPaymentHistory),
        paymentProviderEvents: paymentProviderEvents.map(webhookEventRecordToPaymentProviderEvent),
      };
    },
  };
}

function assertSubscriptionWriteClients(
  prisma: SubscriptionPrismaClientLike,
): asserts prisma is SubscriptionPrismaClientLike & {
  subscriptionInvoice: SubscriptionInvoiceClient & {
    upsert: NonNullable<SubscriptionInvoiceClient["upsert"]>;
  };
  subscriptionPlan: SubscriptionPlanClient;
  tenantSubscription: TenantSubscriptionClient & {
    create: NonNullable<TenantSubscriptionClient["create"]>;
    updateMany: NonNullable<TenantSubscriptionClient["updateMany"]>;
  };
} {
  if (
    !prisma.subscriptionPlan ||
    !prisma.tenantSubscription.create ||
    !prisma.tenantSubscription.updateMany
  ) {
    throw new Error("Abonelik aktivasyon repository yazma client'ları eksik.");
  }

  assertSubscriptionInvoiceWriteClient(prisma);
}

function assertSubscriptionAddonWriteClients(
  prisma: SubscriptionPrismaClientLike,
): asserts prisma is SubscriptionPrismaClientLike & {
  subscriptionAddon: SubscriptionAddonClient;
  subscriptionInvoice: SubscriptionInvoiceClient & {
    upsert: NonNullable<SubscriptionInvoiceClient["upsert"]>;
  };
  tenantSubscriptionAddon: TenantSubscriptionAddonClient;
} {
  if (!prisma.subscriptionAddon || !prisma.tenantSubscriptionAddon) {
    throw new Error("Abonelik ek özellik repository yazma client'ları eksik.");
  }

  assertSubscriptionInvoiceWriteClient(prisma);
}

function assertPaymentWebhookEventClient(
  prisma: SubscriptionPrismaClientLike,
): asserts prisma is SubscriptionPrismaClientLike & {
  subscriptionPaymentWebhookEvent: SubscriptionPaymentWebhookEventClient;
} {
  if (!prisma.subscriptionPaymentWebhookEvent) {
    throw new Error("Abonelik ödeme webhook repository client'ı eksik.");
  }
}

function assertSubscriptionInvoiceWriteClient(
  prisma: SubscriptionPrismaClientLike,
): asserts prisma is SubscriptionPrismaClientLike & {
  subscriptionInvoice: SubscriptionInvoiceClient & {
    upsert: NonNullable<SubscriptionInvoiceClient["upsert"]>;
  };
} {
  if (!prisma.subscriptionInvoice.upsert) {
    throw new Error("Abonelik fatura repository yazma client'ı eksik.");
  }
}

function subscriptionScopeWhere(scope: TenantScope) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function invoiceNoScopeWhere(scope: TenantScope, invoiceNo: string) {
  return {
    ...subscriptionScopeWhere(scope),
    invoiceNo,
  };
}

function webhookEventScopeWhere(scope: TenantScope, eventId: string) {
  return {
    eventId,
    tenantId: scope.tenantId,
  };
}

function tenantSubscriptionAddonScopeWhere(
  scope: TenantScope,
  addon: Pick<TenantSubscriptionAddonActivationRow, "addonId" | "subscriptionId">,
) {
  return {
    ...subscriptionScopeWhere(scope),
    addonId: addon.addonId,
    subscriptionId: addon.subscriptionId,
  };
}

function subscriptionRecordToSummary(
  row: TenantSubscriptionRecord,
): CurrentSubscriptionSummary {
  return {
    autoRenew: row.autoRenew,
    billingCycle: toBillingCycle(row.billingCycle),
    endsAt: toDateOnly(row.endsAt),
    planId: row.planId,
    planName: row.plan.name,
    renewalAmount: Number(row.renewalAmount ?? 0),
    startsAt: toDateOnly(row.startsAt),
    storageLimitGb: row.storageLimitGb,
    subscriptionId: row.id,
    userLimit: row.userLimit,
  };
}

function invoiceRecordToPaymentHistory(
  row: SubscriptionInvoiceRecord,
): SubscriptionPaymentHistoryRow {
  return {
    amount: Number(row.amount ?? 0),
    date: toDateOnly(row.invoiceDate),
    id: row.id,
    invoiceNo: row.invoiceNo,
    method: row.method,
    providerRef: row.providerRef,
    status: toPaymentHistoryStatus(row.status),
  };
}

function toPaymentHistoryStatus(
  status: string,
): SubscriptionPaymentHistoryRow["status"] {
  if (status === "paid") {
    return "Ödendi";
  }

  if (status === "failed") {
    return "Başarısız";
  }

  return "Bekliyor";
}

function webhookEventRecordToPaymentProviderEvent(
  row: SubscriptionPaymentWebhookEventRecord,
): SubscriptionPaymentProviderEventRow {
  return {
    errorMessage: row.errorMessage,
    eventId: row.eventId,
    eventType: row.eventType as SubscriptionPaymentProviderEventRow["eventType"],
    invoiceNo: row.invoiceNo,
    processedAt: row.processedAt ? toIsoString(row.processedAt) : null,
    providerRef: row.providerRef,
    receivedAt: toIsoString(row.receivedAt),
    resultStatus: row.resultStatus as SubscriptionPaymentProviderEventRow["resultStatus"],
    status: row.status as SubscriptionPaymentProviderEventRow["status"],
  };
}

function isTenantSubscriptionAddonStillEffective(
  row: TenantSubscriptionAddonRecord,
) {
  const today = new Date().toISOString().slice(0, 10);

  if (toDateOnly(row.startsAt) > today) {
    return false;
  }

  if (!row.endsAt) {
    return true;
  }

  return toDateOnly(row.endsAt) >= today;
}

function planCatalogRowToCreateData(row: SubscriptionPlanCatalogRow) {
  return {
    description: row.description,
    id: row.id,
    includedModules: row.includedModules,
    isActive: row.isActive,
    monthlyPrice: row.monthlyPrice,
    name: row.name,
    sortOrder: row.sortOrder,
    storageLimitGb: row.storageLimitGb,
    userLimit: row.userLimit,
  };
}

function planCatalogRowToUpdateData(row: SubscriptionPlanCatalogRow) {
  return {
    description: row.description,
    includedModules: row.includedModules,
    isActive: row.isActive,
    monthlyPrice: row.monthlyPrice,
    name: row.name,
    sortOrder: row.sortOrder,
    storageLimitGb: row.storageLimitGb,
    userLimit: row.userLimit,
  };
}

function addonCatalogRowToCreateData(row: SubscriptionAddonCatalogRow) {
  return {
    description: row.description,
    id: row.id,
    isActive: row.isActive,
    monthlyPrice: row.monthlyPrice,
    name: row.name,
  };
}

function addonCatalogRowToUpdateData(row: SubscriptionAddonCatalogRow) {
  return {
    description: row.description,
    isActive: row.isActive,
    monthlyPrice: row.monthlyPrice,
    name: row.name,
  };
}

function subscriptionActivationRowToCreateData(
  row: TenantSubscriptionActivationRow,
) {
  return {
    autoRenew: row.autoRenew,
    billingCycle: row.billingCycle,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    endsAt: new Date(row.endsAt),
    id: row.id,
    periodId: row.periodId,
    planId: row.planId,
    renewalAmount: row.renewalAmount,
    startsAt: new Date(row.startsAt),
    status: row.status,
    storageLimitGb: row.storageLimitGb,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    userLimit: row.userLimit,
  };
}

function tenantSubscriptionAddonRowToCreateData(
  row: TenantSubscriptionAddonActivationRow,
) {
  return {
    addonId: row.addonId,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    endsAt: row.endsAt ? new Date(row.endsAt) : null,
    id: row.id,
    monthlyPrice: row.monthlyPrice,
    periodId: row.periodId,
    startsAt: new Date(row.startsAt),
    status: row.status,
    subscriptionId: row.subscriptionId,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
  };
}

function tenantSubscriptionAddonRowToUpdateData(
  row: TenantSubscriptionAddonActivationRow,
) {
  return {
    endsAt: row.endsAt ? new Date(row.endsAt) : null,
    monthlyPrice: row.monthlyPrice,
    startsAt: new Date(row.startsAt),
    status: row.status,
    updatedAt: new Date(row.updatedAt),
  };
}

function webhookEventRecordToRow(
  row: SubscriptionPaymentWebhookEventRecord,
): SubscriptionPaymentWebhookEventRow {
  return {
    companyId: row.companyId,
    errorMessage: row.errorMessage,
    eventId: row.eventId,
    eventType: row.eventType as SubscriptionPaymentWebhookEventRow["eventType"],
    invoiceNo: row.invoiceNo,
    periodId: row.periodId,
    processedAt: row.processedAt ? toIsoString(row.processedAt) : null,
    providerRef: row.providerRef,
    receivedAt: toIsoString(row.receivedAt),
    resultStatus: row.resultStatus as SubscriptionPaymentWebhookEventRow["resultStatus"],
    status: row.status as SubscriptionPaymentWebhookEventRow["status"],
    tenantId: row.tenantId,
  };
}

function webhookEventRowToCreateData(row: SubscriptionPaymentWebhookEventRow) {
  return {
    companyId: row.companyId,
    errorMessage: row.errorMessage,
    eventId: row.eventId,
    eventType: row.eventType,
    invoiceNo: row.invoiceNo,
    periodId: row.periodId,
    processedAt: row.processedAt ? new Date(row.processedAt) : null,
    providerRef: row.providerRef,
    receivedAt: new Date(row.receivedAt),
    resultStatus: row.resultStatus,
    status: row.status,
    tenantId: row.tenantId,
  };
}

function webhookEventRowToUpdateData(row: SubscriptionPaymentWebhookEventRow) {
  return {
    errorMessage: row.errorMessage,
    processedAt: row.processedAt ? new Date(row.processedAt) : null,
    resultStatus: row.resultStatus,
    status: row.status,
  };
}

function invoicePersistenceRowToCreateData(
  row:
    | SubscriptionInvoiceActivationRow
    | SubscriptionCheckoutInvoiceDraftRow
    | SubscriptionCheckoutInvoiceFailedRow,
) {
  return {
    amount: row.amount,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    currency: row.currency,
    id: row.id,
    invoiceDate: new Date(row.invoiceDate),
    invoiceNo: row.invoiceNo,
    method: row.method,
    periodId: row.periodId,
    providerRef: row.providerRef,
    status: row.status,
    subscriptionId: row.subscriptionId,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
  };
}

function invoicePersistenceRowToUpdateData(
  row:
    | SubscriptionInvoiceActivationRow
    | SubscriptionCheckoutInvoiceDraftRow
    | SubscriptionCheckoutInvoiceFailedRow,
) {
  return {
    amount: row.amount,
    currency: row.currency,
    invoiceDate: new Date(row.invoiceDate),
    method: row.method,
    providerRef: row.providerRef,
    status: row.status,
    subscriptionId: row.subscriptionId,
    updatedAt: new Date(row.updatedAt),
  };
}

function toBillingCycle(value: string): SubscriptionBillingCycle {
  return value === "monthly" ? "monthly" : "yearly";
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string) {
  return toIsoString(value).slice(0, 10);
}
