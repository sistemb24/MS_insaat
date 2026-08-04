-- Baseline tables that existed in the Prisma schema but were absent from the migration history.
-- This migration intentionally precedes the access-profile extension of UserInvitation.

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "targetHref" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "StockMinimumSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "stockCode" TEXT,
    "stockName" TEXT,
    "unit" TEXT NOT NULL,
    "minimumQuantity" DECIMAL(18,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMinimumSetting_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessProfileId" TEXT,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "EmailOutbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(18,2) NOT NULL,
    "includedModules" JSONB NOT NULL,
    "userLimit" INTEGER NOT NULL,
    "storageLimitGb" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "SubscriptionAddon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(18,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionAddon_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "renewalAmount" DECIMAL(18,2) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "userLimit" INTEGER NOT NULL,
    "storageLimitGb" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "TenantSubscriptionAddon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "monthlyPrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscriptionAddon_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "BankIntegrationConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastTestStatus" TEXT NOT NULL,
    "lastTestMessage" TEXT NOT NULL,
    "lastTestedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankIntegrationConnection_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "bankConnectionId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "BankLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "cashBankMovementId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "documentNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cashBankAccountCode" TEXT NOT NULL,
    "cashBankAccountName" TEXT NOT NULL,
    "ledgerDirection" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankLedgerEntry_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "tenderNo" TEXT NOT NULL,
    "ikn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authorityName" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "city" TEXT,
    "noticeDate" TIMESTAMP(3),
    "specPurchaseDeadline" TIMESTAMP(3),
    "questionAnswerDeadline" TIMESTAMP(3),
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "sessionDate" TIMESTAMP(3),
    "contractSignDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL,
    "estimatedValue" DECIMAL(18,2) NOT NULL,
    "overheadRate" DECIMAL(5,2) NOT NULL,
    "profitMargin" DECIMAL(5,2) NOT NULL,
    "bidValue" DECIMAL(18,2) NOT NULL,
    "thresholdValue" DECIMAL(18,2) NOT NULL,
    "contractValue" DECIMAL(18,2) NOT NULL,
    "convertedSiteCode" TEXT,
    "convertedSiteName" TEXT,
    "convertedToSiteAt" TIMESTAMP(3),
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "TenderBoqLine" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "pozNo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "materialCost" DECIMAL(18,2) NOT NULL,
    "laborCost" DECIMAL(18,2) NOT NULL,
    "equipmentCost" DECIMAL(18,2) NOT NULL,
    "subcontractorCost" DECIMAL(18,2) NOT NULL,
    "shippingCost" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "lineCostTotal" DECIMAL(18,2) NOT NULL,
    "unitBid" DECIMAL(18,2) NOT NULL,
    "lineBidTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "TenderBoqLine_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" TEXT,
    "color" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT true,
    "canRename" BOOLEAN NOT NULL DEFAULT true,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "linkedModule" TEXT,
    "linkedRecordId" TEXT,
    "linkedRecordLabel" TEXT,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "Notification_tenantId_companyId_periodId_userId_createdAt_idx" ON "Notification"("tenantId", "companyId", "periodId", "userId", "createdAt");


-- CreateIndex
CREATE INDEX "Notification_tenantId_companyId_periodId_userId_readAt_idx" ON "Notification"("tenantId", "companyId", "periodId", "userId", "readAt");


-- CreateIndex
CREATE INDEX "Notification_tenantId_companyId_periodId_userId_category_idx" ON "Notification"("tenantId", "companyId", "periodId", "userId", "category");


-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_userId_idx" ON "NotificationPreference"("tenantId", "userId");


-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_tenantId_userId_category_key" ON "NotificationPreference"("tenantId", "userId", "category");


-- CreateIndex
CREATE INDEX "StockMinimumSetting_tenantId_companyId_periodId_isActive_idx" ON "StockMinimumSetting"("tenantId", "companyId", "periodId", "isActive");


-- CreateIndex
CREATE INDEX "StockMinimumSetting_tenantId_companyId_periodId_warehouse_idx" ON "StockMinimumSetting"("tenantId", "companyId", "periodId", "warehouse");


-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");


-- CreateIndex
CREATE INDEX "UserInvitation_tenantId_companyId_periodId_status_idx" ON "UserInvitation"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "UserInvitation_tenantId_companyId_periodId_email_idx" ON "UserInvitation"("tenantId", "companyId", "periodId", "email");


-- CreateIndex
CREATE INDEX "UserInvitation_tenantId_tokenHash_idx" ON "UserInvitation"("tenantId", "tokenHash");


-- CreateIndex
CREATE INDEX "EmailOutbox_tenantId_companyId_periodId_status_createdAt_idx" ON "EmailOutbox"("tenantId", "companyId", "periodId", "status", "createdAt");


-- CreateIndex
CREATE INDEX "EmailOutbox_tenantId_recipientEmail_createdAt_idx" ON "EmailOutbox"("tenantId", "recipientEmail", "createdAt");


-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_sortOrder_idx" ON "SubscriptionPlan"("isActive", "sortOrder");


-- CreateIndex
CREATE INDEX "SubscriptionAddon_isActive_name_idx" ON "SubscriptionAddon"("isActive", "name");


-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_companyId_periodId_status_idx" ON "TenantSubscription"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_planId_idx" ON "TenantSubscription"("tenantId", "planId");


-- CreateIndex
CREATE INDEX "SubscriptionInvoice_tenantId_companyId_periodId_invoiceDate_idx" ON "SubscriptionInvoice"("tenantId", "companyId", "periodId", "invoiceDate");


-- CreateIndex
CREATE INDEX "SubscriptionInvoice_tenantId_companyId_periodId_subscriptio_idx" ON "SubscriptionInvoice"("tenantId", "companyId", "periodId", "subscriptionId");


-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_tenantId_companyId_periodId_invoiceNo_key" ON "SubscriptionInvoice"("tenantId", "companyId", "periodId", "invoiceNo");


-- CreateIndex
CREATE INDEX "TenantSubscriptionAddon_tenantId_companyId_periodId_status_idx" ON "TenantSubscriptionAddon"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "TenantSubscriptionAddon_tenantId_addonId_idx" ON "TenantSubscriptionAddon"("tenantId", "addonId");


-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscriptionAddon_tenantId_companyId_periodId_subscri_key" ON "TenantSubscriptionAddon"("tenantId", "companyId", "periodId", "subscriptionId", "addonId");


-- CreateIndex
CREATE INDEX "BankIntegrationConnection_tenantId_companyId_periodId_statu_idx" ON "BankIntegrationConnection"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "BankIntegrationConnection_tenantId_companyId_periodId_bankC_idx" ON "BankIntegrationConnection"("tenantId", "companyId", "periodId", "bankCode");


-- CreateIndex
CREATE UNIQUE INDEX "BankIntegrationConnection_tenantId_companyId_periodId_bankC_key" ON "BankIntegrationConnection"("tenantId", "companyId", "periodId", "bankCode", "environment");


-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_companyId_periodId_occurredAt_idx" ON "BankTransaction"("tenantId", "companyId", "periodId", "occurredAt");


-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_companyId_periodId_status_idx" ON "BankTransaction"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "BankTransaction_bankConnectionId_occurredAt_idx" ON "BankTransaction"("bankConnectionId", "occurredAt");


-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_tenantId_companyId_periodId_bankConnectionI_key" ON "BankTransaction"("tenantId", "companyId", "periodId", "bankConnectionId", "externalId");


-- CreateIndex
CREATE INDEX "BankLedgerEntry_tenantId_companyId_periodId_entryDate_idx" ON "BankLedgerEntry"("tenantId", "companyId", "periodId", "entryDate");


-- CreateIndex
CREATE INDEX "BankLedgerEntry_tenantId_companyId_periodId_status_idx" ON "BankLedgerEntry"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE INDEX "BankLedgerEntry_tenantId_companyId_periodId_cashBankMovemen_idx" ON "BankLedgerEntry"("tenantId", "companyId", "periodId", "cashBankMovementId", "status");


-- CreateIndex
CREATE UNIQUE INDEX "BankLedgerEntry_tenantId_companyId_periodId_bankTransaction_key" ON "BankLedgerEntry"("tenantId", "companyId", "periodId", "bankTransactionId", "cashBankMovementId");


-- CreateIndex
CREATE INDEX "Tender_tenantId_companyId_periodId_submissionDeadline_idx" ON "Tender"("tenantId", "companyId", "periodId", "submissionDeadline");


-- CreateIndex
CREATE INDEX "Tender_tenantId_companyId_periodId_status_idx" ON "Tender"("tenantId", "companyId", "periodId", "status");


-- CreateIndex
CREATE UNIQUE INDEX "Tender_tenantId_companyId_periodId_tenderNo_key" ON "Tender"("tenantId", "companyId", "periodId", "tenderNo");


-- CreateIndex
CREATE INDEX "TenderBoqLine_tenderId_idx" ON "TenderBoqLine"("tenderId");


-- CreateIndex
CREATE UNIQUE INDEX "TenderBoqLine_tenderId_lineNo_key" ON "TenderBoqLine"("tenderId", "lineNo");


-- CreateIndex
CREATE INDEX "DocumentFolder_tenantId_companyId_periodId_deletedAt_idx" ON "DocumentFolder"("tenantId", "companyId", "periodId", "deletedAt");


-- CreateIndex
CREATE INDEX "DocumentFolder_tenantId_companyId_periodId_isSystem_idx" ON "DocumentFolder"("tenantId", "companyId", "periodId", "isSystem");


-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolder_tenantId_companyId_periodId_systemKey_key" ON "DocumentFolder"("tenantId", "companyId", "periodId", "systemKey");


-- CreateIndex
CREATE INDEX "DocumentFile_tenantId_companyId_periodId_deletedAt_idx" ON "DocumentFile"("tenantId", "companyId", "periodId", "deletedAt");


-- CreateIndex
CREATE INDEX "DocumentFile_tenantId_companyId_periodId_fileType_idx" ON "DocumentFile"("tenantId", "companyId", "periodId", "fileType");


-- CreateIndex
CREATE INDEX "DocumentFile_tenantId_companyId_periodId_linkedModule_linke_idx" ON "DocumentFile"("tenantId", "companyId", "periodId", "linkedModule", "linkedRecordId");


-- CreateIndex
CREATE INDEX "DocumentFile_folderId_deletedAt_idx" ON "DocumentFile"("folderId", "deletedAt");


-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "StockMinimumSetting" ADD CONSTRAINT "StockMinimumSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "StockMinimumSetting" ADD CONSTRAINT "StockMinimumSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "StockMinimumSetting" ADD CONSTRAINT "StockMinimumSetting_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TenantSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscriptionAddon" ADD CONSTRAINT "TenantSubscriptionAddon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscriptionAddon" ADD CONSTRAINT "TenantSubscriptionAddon_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscriptionAddon" ADD CONSTRAINT "TenantSubscriptionAddon_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscriptionAddon" ADD CONSTRAINT "TenantSubscriptionAddon_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "TenantSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenantSubscriptionAddon" ADD CONSTRAINT "TenantSubscriptionAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "SubscriptionAddon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankIntegrationConnection" ADD CONSTRAINT "BankIntegrationConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankIntegrationConnection" ADD CONSTRAINT "BankIntegrationConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankIntegrationConnection" ADD CONSTRAINT "BankIntegrationConnection_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankIntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "BankLedgerEntry" ADD CONSTRAINT "BankLedgerEntry_cashBankMovementId_fkey" FOREIGN KEY ("cashBankMovementId") REFERENCES "CashBankMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "TenderBoqLine" ADD CONSTRAINT "TenderBoqLine_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

