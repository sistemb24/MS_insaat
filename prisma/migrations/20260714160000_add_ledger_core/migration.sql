CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "entryDate" DATE NOT NULL,
  "documentNo" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "debitTotal" DECIMAL(18,2) NOT NULL,
  "creditTotal" DECIMAL(18,2) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LedgerLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "accountCode" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "debit" DECIMAL(18,2) NOT NULL,
  "credit" DECIMAL(18,2) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LedgerLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LedgerEntry_tenantId_companyId_periodId_documentNo_key" ON "LedgerEntry"("tenantId", "companyId", "periodId", "documentNo");
CREATE INDEX "LedgerEntry_tenantId_companyId_periodId_entryDate_idx" ON "LedgerEntry"("tenantId", "companyId", "periodId", "entryDate");
CREATE INDEX "LedgerEntry_tenantId_companyId_periodId_status_idx" ON "LedgerEntry"("tenantId", "companyId", "periodId", "status");
CREATE UNIQUE INDEX "LedgerLine_entryId_lineNo_key" ON "LedgerLine"("entryId", "lineNo");
CREATE INDEX "LedgerLine_tenantId_companyId_periodId_accountCode_idx" ON "LedgerLine"("tenantId", "companyId", "periodId", "accountCode");
CREATE INDEX "LedgerLine_entryId_idx" ON "LedgerLine"("entryId");

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LedgerEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
