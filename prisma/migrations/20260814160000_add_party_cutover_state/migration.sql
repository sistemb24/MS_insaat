CREATE TABLE "PartyCutoverState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "mode" VARCHAR(32) NOT NULL DEFAULT 'LEGACY_ONLY',
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "legacyChecksum" VARCHAR(64) NOT NULL,
    "partyChecksum" VARCHAR(64) NOT NULL,
    "issueChecksum" VARCHAR(64) NOT NULL,
    "parityChecksum" VARCHAR(64) NOT NULL,
    "legacyCount" INTEGER NOT NULL,
    "partyCount" INTEGER NOT NULL,
    "roleCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "releaseId" VARCHAR(64) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyCutoverState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartyCutoverState_mode_check"
      CHECK ("mode" IN ('LEGACY_ONLY', 'SHADOW_READ')),
    CONSTRAINT "PartyCutoverState_revision_check" CHECK ("revisionNo" >= 1),
    CONSTRAINT "PartyCutoverState_counts_check"
      CHECK (
        "legacyCount" >= 0 AND "partyCount" >= 0 AND "roleCount" >= 0
        AND "matchedCount" >= 0
        AND "matchedCount" <= "legacyCount"
        AND "matchedCount" <= "roleCount"
      ),
    CONSTRAINT "PartyCutoverState_checksums_check"
      CHECK (
        "legacyChecksum" ~ '^[a-f0-9]{64}$'
        AND "partyChecksum" ~ '^[a-f0-9]{64}$'
        AND "issueChecksum" ~ '^[a-f0-9]{64}$'
        AND "parityChecksum" ~ '^[a-f0-9]{64}$'
      )
);

CREATE TABLE "PartyCutoverEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "operationId" VARCHAR(120) NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "fromMode" VARCHAR(32) NOT NULL,
    "toMode" VARCHAR(32) NOT NULL,
    "stateRevisionNo" INTEGER NOT NULL,
    "reasonCode" VARCHAR(64) NOT NULL,
    "legacyChecksum" VARCHAR(64) NOT NULL,
    "partyChecksum" VARCHAR(64) NOT NULL,
    "issueChecksum" VARCHAR(64) NOT NULL,
    "parityChecksum" VARCHAR(64) NOT NULL,
    "legacyCount" INTEGER NOT NULL,
    "partyCount" INTEGER NOT NULL,
    "roleCount" INTEGER NOT NULL,
    "matchedCount" INTEGER NOT NULL,
    "releaseId" VARCHAR(64) NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyCutoverEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartyCutoverEvent_action_check"
      CHECK ("action" IN ('ACTIVATE_SHADOW', 'ROLLBACK_LEGACY')),
    CONSTRAINT "PartyCutoverEvent_modes_check"
      CHECK (
        "fromMode" IN ('LEGACY_ONLY', 'SHADOW_READ')
        AND "toMode" IN ('LEGACY_ONLY', 'SHADOW_READ')
        AND "fromMode" <> "toMode"
      ),
    CONSTRAINT "PartyCutoverEvent_revision_check" CHECK ("stateRevisionNo" >= 1),
    CONSTRAINT "PartyCutoverEvent_counts_check"
      CHECK (
        "legacyCount" >= 0 AND "partyCount" >= 0 AND "roleCount" >= 0
        AND "matchedCount" >= 0
        AND "matchedCount" <= "legacyCount"
        AND "matchedCount" <= "roleCount"
      ),
    CONSTRAINT "PartyCutoverEvent_checksums_check"
      CHECK (
        "legacyChecksum" ~ '^[a-f0-9]{64}$'
        AND "partyChecksum" ~ '^[a-f0-9]{64}$'
        AND "issueChecksum" ~ '^[a-f0-9]{64}$'
        AND "parityChecksum" ~ '^[a-f0-9]{64}$'
      )
);

CREATE UNIQUE INDEX "PartyCutoverState_id_tenantId_companyId_periodId_key"
ON "PartyCutoverState"("id", "tenantId", "companyId", "periodId");

CREATE UNIQUE INDEX "Company_id_tenantId_key"
ON "Company"("id", "tenantId");

CREATE UNIQUE INDEX "Period_id_tenantId_companyId_key"
ON "Period"("id", "tenantId", "companyId");

CREATE UNIQUE INDEX "PartyCutoverState_tenantId_companyId_periodId_key"
ON "PartyCutoverState"("tenantId", "companyId", "periodId");

CREATE INDEX "PartyCutoverState_tenantId_companyId_periodId_mode_updatedAt_idx"
ON "PartyCutoverState"("tenantId", "companyId", "periodId", "mode", "updatedAt");

CREATE UNIQUE INDEX "PartyCutoverEvent_operationId_key"
ON "PartyCutoverEvent"("operationId");

CREATE UNIQUE INDEX "PartyCutoverEvent_stateId_stateRevisionNo_key"
ON "PartyCutoverEvent"("stateId", "stateRevisionNo");

CREATE INDEX "PartyCutoverEvent_tenantId_companyId_periodId_occurredAt_idx"
ON "PartyCutoverEvent"("tenantId", "companyId", "periodId", "occurredAt");

CREATE INDEX "PartyCutoverEvent_actorUserId_occurredAt_idx"
ON "PartyCutoverEvent"("actorUserId", "occurredAt");

ALTER TABLE "PartyCutoverState" ADD CONSTRAINT "PartyCutoverState_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverState" ADD CONSTRAINT "PartyCutoverState_companyId_fkey"
FOREIGN KEY ("companyId", "tenantId") REFERENCES "Company"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverState" ADD CONSTRAINT "PartyCutoverState_periodId_fkey"
FOREIGN KEY ("periodId", "tenantId", "companyId") REFERENCES "Period"("id", "tenantId", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverEvent" ADD CONSTRAINT "PartyCutoverEvent_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverEvent" ADD CONSTRAINT "PartyCutoverEvent_companyId_fkey"
FOREIGN KEY ("companyId", "tenantId") REFERENCES "Company"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverEvent" ADD CONSTRAINT "PartyCutoverEvent_periodId_fkey"
FOREIGN KEY ("periodId", "tenantId", "companyId") REFERENCES "Period"("id", "tenantId", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyCutoverEvent" ADD CONSTRAINT "PartyCutoverEvent_stateId_tenantId_companyId_periodId_fkey"
FOREIGN KEY ("stateId", "tenantId", "companyId", "periodId")
REFERENCES "PartyCutoverState"("id", "tenantId", "companyId", "periodId") ON DELETE CASCADE ON UPDATE CASCADE;
