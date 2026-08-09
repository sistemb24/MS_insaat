-- Faz 36: tenant erişim dondurma ve legal hold kayıtları additive olarak eklenir.
ALTER TABLE "Tenant"
ADD COLUMN "lifecycleStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "lifecycleVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "frozenAt" TIMESTAMP(3),
ADD COLUMN "frozenByCredentialId" TEXT;

CREATE INDEX "Tenant_lifecycleStatus_idx" ON "Tenant"("lifecycleStatus");
CREATE INDEX "Tenant_frozenByCredentialId_idx" ON "Tenant"("frozenByCredentialId");

ALTER TABLE "Tenant"
ADD CONSTRAINT "Tenant_frozenByCredentialId_fkey"
FOREIGN KEY ("frozenByCredentialId") REFERENCES "SuperAdminCredential"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TenantLifecycleEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorCredentialId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "lifecycleVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantLifecycleEvent_operationId_key" ON "TenantLifecycleEvent"("operationId");
CREATE UNIQUE INDEX "TenantLifecycleEvent_tenantId_lifecycleVersion_key" ON "TenantLifecycleEvent"("tenantId", "lifecycleVersion");
CREATE INDEX "TenantLifecycleEvent_tenantId_occurredAt_idx" ON "TenantLifecycleEvent"("tenantId", "occurredAt");
CREATE INDEX "TenantLifecycleEvent_actorCredentialId_occurredAt_idx" ON "TenantLifecycleEvent"("actorCredentialId", "occurredAt");

ALTER TABLE "TenantLifecycleEvent"
ADD CONSTRAINT "TenantLifecycleEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLifecycleEvent"
ADD CONSTRAINT "TenantLifecycleEvent_actorCredentialId_fkey"
FOREIGN KEY ("actorCredentialId") REFERENCES "SuperAdminCredential"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TenantLegalHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reasonCode" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "reviewAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByCredentialId" TEXT NOT NULL,
    "releasedByCredentialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantLegalHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantLegalHold_tenantId_referenceId_key" ON "TenantLegalHold"("tenantId", "referenceId");
CREATE INDEX "TenantLegalHold_tenantId_status_reviewAt_idx" ON "TenantLegalHold"("tenantId", "status", "reviewAt");
CREATE INDEX "TenantLegalHold_createdByCredentialId_createdAt_idx" ON "TenantLegalHold"("createdByCredentialId", "createdAt");
CREATE INDEX "TenantLegalHold_releasedByCredentialId_releasedAt_idx" ON "TenantLegalHold"("releasedByCredentialId", "releasedAt");

ALTER TABLE "TenantLegalHold"
ADD CONSTRAINT "TenantLegalHold_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLegalHold"
ADD CONSTRAINT "TenantLegalHold_createdByCredentialId_fkey"
FOREIGN KEY ("createdByCredentialId") REFERENCES "SuperAdminCredential"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TenantLegalHold"
ADD CONSTRAINT "TenantLegalHold_releasedByCredentialId_fkey"
FOREIGN KEY ("releasedByCredentialId") REFERENCES "SuperAdminCredential"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TenantLegalHoldEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalHoldId" TEXT NOT NULL,
    "actorCredentialId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "legalHoldVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantLegalHoldEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantLegalHoldEvent_operationId_key" ON "TenantLegalHoldEvent"("operationId");
CREATE UNIQUE INDEX "TenantLegalHoldEvent_legalHoldId_legalHoldVersion_key" ON "TenantLegalHoldEvent"("legalHoldId", "legalHoldVersion");
CREATE INDEX "TenantLegalHoldEvent_tenantId_occurredAt_idx" ON "TenantLegalHoldEvent"("tenantId", "occurredAt");
CREATE INDEX "TenantLegalHoldEvent_actorCredentialId_occurredAt_idx" ON "TenantLegalHoldEvent"("actorCredentialId", "occurredAt");

ALTER TABLE "TenantLegalHoldEvent"
ADD CONSTRAINT "TenantLegalHoldEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLegalHoldEvent"
ADD CONSTRAINT "TenantLegalHoldEvent_legalHoldId_fkey"
FOREIGN KEY ("legalHoldId") REFERENCES "TenantLegalHold"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantLegalHoldEvent"
ADD CONSTRAINT "TenantLegalHoldEvent_actorCredentialId_fkey"
FOREIGN KEY ("actorCredentialId") REFERENCES "SuperAdminCredential"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
