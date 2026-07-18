ALTER TABLE "LedgerEntry"
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceId" TEXT,
ADD CONSTRAINT "LedgerEntry_source_pair_check"
CHECK (
  ("sourceType" IS NULL AND "sourceId" IS NULL)
  OR ("sourceType" IS NOT NULL AND "sourceId" IS NOT NULL)
);

CREATE UNIQUE INDEX "LedgerEntry_tenantId_companyId_periodId_sourceType_sourceId_key"
ON "LedgerEntry"("tenantId", "companyId", "periodId", "sourceType", "sourceId");
