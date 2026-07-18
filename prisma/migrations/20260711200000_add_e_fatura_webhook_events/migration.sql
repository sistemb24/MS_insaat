CREATE TABLE "EFaturaWebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "providerStatus" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EFaturaWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EFaturaWebhookEvent_tenantId_eventId_key"
    ON "EFaturaWebhookEvent"("tenantId", "eventId");

CREATE INDEX "EFaturaWebhookEvent_scope_receivedAt_idx"
    ON "EFaturaWebhookEvent"("tenantId", "companyId", "periodId", "receivedAt");

CREATE INDEX "EFaturaWebhookEvent_scope_invoiceNo_idx"
    ON "EFaturaWebhookEvent"("tenantId", "companyId", "periodId", "invoiceNo");

ALTER TABLE "EFaturaWebhookEvent"
    ADD CONSTRAINT "EFaturaWebhookEvent_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EFaturaWebhookEvent"
    ADD CONSTRAINT "EFaturaWebhookEvent_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EFaturaWebhookEvent"
    ADD CONSTRAINT "EFaturaWebhookEvent_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
