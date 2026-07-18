CREATE TABLE "SalesInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "documentNo" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "counterpartyCode" TEXT NOT NULL,
  "counterpartyName" TEXT NOT NULL,
  "siteCode" TEXT NOT NULL,
  "siteName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "exchangeRate" DECIMAL(18,4) NOT NULL,
  "movementGroup" TEXT,
  "isOfficial" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT,
  "status" TEXT NOT NULL,
  "subtotal" DECIMAL(18,2) NOT NULL,
  "discountTotal" DECIMAL(18,2) NOT NULL,
  "netTotal" DECIMAL(18,2) NOT NULL,
  "vatTotal" DECIMAL(18,2) NOT NULL,
  "withholdingTotal" DECIMAL(18,2) NOT NULL,
  "grandTotal" DECIMAL(18,2) NOT NULL,
  "lineCount" INTEGER NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesInvoiceLine" (
  "id" TEXT NOT NULL,
  "salesInvoiceId" TEXT NOT NULL,
  "lineNo" INTEGER NOT NULL,
  "stockCode" TEXT,
  "stockName" TEXT NOT NULL,
  "siteName" TEXT,
  "unit" TEXT NOT NULL,
  "description" TEXT,
  "warehouse" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4) NOT NULL,
  "discountRate1" DECIMAL(5,2) NOT NULL,
  "discountRate2" DECIMAL(5,2) NOT NULL,
  "vatRate" DECIMAL(5,2) NOT NULL,
  "grossTotal" DECIMAL(18,2) NOT NULL,
  "discountTotal" DECIMAL(18,2) NOT NULL,
  "netTotal" DECIMAL(18,2) NOT NULL,
  "vatTotal" DECIMAL(18,2) NOT NULL,
  "grandTotal" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesInvoice_tenantId_companyId_periodId_documentNo_key" ON "SalesInvoice"("tenantId", "companyId", "periodId", "documentNo");
CREATE INDEX "SalesInvoice_tenantId_companyId_periodId_invoiceDate_idx" ON "SalesInvoice"("tenantId", "companyId", "periodId", "invoiceDate");
CREATE UNIQUE INDEX "SalesInvoiceLine_salesInvoiceId_lineNo_key" ON "SalesInvoiceLine"("salesInvoiceId", "lineNo");
CREATE INDEX "SalesInvoiceLine_salesInvoiceId_idx" ON "SalesInvoiceLine"("salesInvoiceId");

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
