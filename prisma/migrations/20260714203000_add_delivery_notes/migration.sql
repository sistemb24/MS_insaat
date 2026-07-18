CREATE TABLE "DeliveryNote" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "documentNo" TEXT NOT NULL,
  "deliveryDate" TIMESTAMP(3) NOT NULL,
  "supplierCode" TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  "siteCode" TEXT NOT NULL,
  "siteName" TEXT NOT NULL,
  "linkedPurchaseInvoiceId" TEXT,
  "linkedPurchaseInvoiceDocumentNo" TEXT,
  "description" TEXT,
  "status" TEXT NOT NULL,
  "lineCount" INTEGER NOT NULL,
  "totalQuantity" DECIMAL(18,4) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryNoteLine" (
  "id" TEXT NOT NULL,
  "deliveryNoteId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "stockCode" TEXT,
  "stockName" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "warehouse" TEXT NOT NULL,
  "quantity" DECIMAL(18,4) NOT NULL,
  CONSTRAINT "DeliveryNoteLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryNote_tenantId_companyId_periodId_documentNo_key" ON "DeliveryNote"("tenantId", "companyId", "periodId", "documentNo");
CREATE INDEX "DeliveryNote_tenantId_companyId_periodId_deliveryDate_idx" ON "DeliveryNote"("tenantId", "companyId", "periodId", "deliveryDate");
CREATE INDEX "DeliveryNote_tenantId_companyId_periodId_linkedPurchaseInvoiceId_idx" ON "DeliveryNote"("tenantId", "companyId", "periodId", "linkedPurchaseInvoiceId");
CREATE UNIQUE INDEX "DeliveryNoteLine_deliveryNoteId_lineNo_key" ON "DeliveryNoteLine"("deliveryNoteId", "lineNo");
CREATE INDEX "DeliveryNoteLine_deliveryNoteId_idx" ON "DeliveryNoteLine"("deliveryNoteId");

ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryNoteLine" ADD CONSTRAINT "DeliveryNoteLine_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
