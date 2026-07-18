CREATE TABLE "SubscriptionPaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultStatus" TEXT,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPaymentWebhookEvent_tenantId_eventId_key"
    ON "SubscriptionPaymentWebhookEvent"("tenantId", "eventId");

CREATE INDEX "SubscriptionPaymentWebhookEvent_scope_status_idx"
    ON "SubscriptionPaymentWebhookEvent"("tenantId", "companyId", "periodId", "status");

CREATE INDEX "SubscriptionPaymentWebhookEvent_scope_invoiceNo_idx"
    ON "SubscriptionPaymentWebhookEvent"("tenantId", "companyId", "periodId", "invoiceNo");

CREATE INDEX "SubscriptionPaymentWebhookEvent_tenantId_providerRef_idx"
    ON "SubscriptionPaymentWebhookEvent"("tenantId", "providerRef");

ALTER TABLE "SubscriptionPaymentWebhookEvent"
    ADD CONSTRAINT "SubscriptionPaymentWebhookEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPaymentWebhookEvent"
    ADD CONSTRAINT "SubscriptionPaymentWebhookEvent_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionPaymentWebhookEvent"
    ADD CONSTRAINT "SubscriptionPaymentWebhookEvent_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;