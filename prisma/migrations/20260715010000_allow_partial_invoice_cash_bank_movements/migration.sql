DROP INDEX IF EXISTS "CashBankMovement_tenantId_companyId_periodId_sourceType_sourceId_movementType_key";

CREATE UNIQUE INDEX "CashBankMovement_tenantId_companyId_periodId_sourceType_sourceId_movementType_documentNo_key"
ON "CashBankMovement"("tenantId", "companyId", "periodId", "sourceType", "sourceId", "movementType", "documentNo");
