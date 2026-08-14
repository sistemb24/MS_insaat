CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "taxNumber" TEXT,
    "normalizedTaxNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "backfillRunId" TEXT,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "normalizedCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "legacySlug" TEXT NOT NULL,
    "legacyCode" TEXT NOT NULL,
    "revisionNo" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyBackfillRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "sourceChecksum" TEXT NOT NULL,
    "sourceCount" INTEGER NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "issueCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyBackfillRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyBackfillIssue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "issueKey" TEXT NOT NULL,
    "issueCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sourceRefs" JSONB NOT NULL,
    "details" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyBackfillIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Party_id_tenantId_companyId_periodId_key"
ON "Party"("id", "tenantId", "companyId", "periodId");

CREATE INDEX "Party_tenantId_companyId_periodId_normalizedName_idx"
ON "Party"("tenantId", "companyId", "periodId", "normalizedName");

CREATE INDEX "Party_tenantId_companyId_periodId_normalizedTaxNumber_idx"
ON "Party"("tenantId", "companyId", "periodId", "normalizedTaxNumber");

CREATE INDEX "Party_tenantId_companyId_periodId_status_idx"
ON "Party"("tenantId", "companyId", "periodId", "status");

CREATE INDEX "Party_backfillRunId_idx" ON "Party"("backfillRunId");

CREATE UNIQUE INDEX "PartyRole_tenantId_companyId_periodId_kind_normalizedCode_key"
ON "PartyRole"("tenantId", "companyId", "periodId", "kind", "normalizedCode");

CREATE UNIQUE INDEX "PartyRole_tenantId_companyId_periodId_legacySlug_legacyCode_key"
ON "PartyRole"("tenantId", "companyId", "periodId", "legacySlug", "legacyCode");

CREATE INDEX "PartyRole_partyId_tenantId_companyId_periodId_idx"
ON "PartyRole"("partyId", "tenantId", "companyId", "periodId");

CREATE INDEX "PartyRole_tenantId_companyId_periodId_status_kind_idx"
ON "PartyRole"("tenantId", "companyId", "periodId", "status", "kind");

CREATE UNIQUE INDEX "PartyBackfillRun_id_tenantId_companyId_periodId_key"
ON "PartyBackfillRun"("id", "tenantId", "companyId", "periodId");

CREATE UNIQUE INDEX "PartyBackfillRun_tenantId_companyId_periodId_version_sourceChecksum_key"
ON "PartyBackfillRun"("tenantId", "companyId", "periodId", "version", "sourceChecksum");

CREATE INDEX "PartyBackfillRun_tenantId_companyId_periodId_status_startedAt_idx"
ON "PartyBackfillRun"("tenantId", "companyId", "periodId", "status", "startedAt");

CREATE UNIQUE INDEX "PartyBackfillIssue_runId_issueKey_key"
ON "PartyBackfillIssue"("runId", "issueKey");

CREATE INDEX "PartyBackfillIssue_tenantId_companyId_periodId_status_severity_idx"
ON "PartyBackfillIssue"("tenantId", "companyId", "periodId", "status", "severity");

CREATE INDEX "PartyBackfillIssue_runId_issueCode_idx"
ON "PartyBackfillIssue"("runId", "issueCode");

ALTER TABLE "Party" ADD CONSTRAINT "Party_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Party" ADD CONSTRAINT "Party_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Party" ADD CONSTRAINT "Party_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Party" ADD CONSTRAINT "Party_backfillRunId_fkey"
FOREIGN KEY ("backfillRunId", "tenantId", "companyId", "periodId")
REFERENCES "PartyBackfillRun"("id", "tenantId", "companyId", "periodId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_partyId_tenantId_companyId_periodId_fkey"
FOREIGN KEY ("partyId", "tenantId", "companyId", "periodId")
REFERENCES "Party"("id", "tenantId", "companyId", "periodId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillRun" ADD CONSTRAINT "PartyBackfillRun_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillRun" ADD CONSTRAINT "PartyBackfillRun_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillRun" ADD CONSTRAINT "PartyBackfillRun_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillIssue" ADD CONSTRAINT "PartyBackfillIssue_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillIssue" ADD CONSTRAINT "PartyBackfillIssue_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillIssue" ADD CONSTRAINT "PartyBackfillIssue_periodId_fkey"
FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyBackfillIssue" ADD CONSTRAINT "PartyBackfillIssue_runId_tenantId_companyId_periodId_fkey"
FOREIGN KEY ("runId", "tenantId", "companyId", "periodId")
REFERENCES "PartyBackfillRun"("id", "tenantId", "companyId", "periodId") ON DELETE RESTRICT ON UPDATE CASCADE;
