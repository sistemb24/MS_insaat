CREATE TABLE "SafetyChecklistTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "description" VARCHAR(300),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyChecklistTemplateItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "category" VARCHAR(300),
  "title" VARCHAR(300) NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetyChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyChecklistRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "inspectionId" TEXT,
  "runKey" VARCHAR(1000) NOT NULL,
  "projectId" TEXT NOT NULL,
  "inspectedOn" TIMESTAMP(3) NOT NULL,
  "inspectorName" VARCHAR(300) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyChecklistRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyChecklistResponse" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "templateItemId" TEXT NOT NULL,
  "findingId" TEXT,
  "responseKey" VARCHAR(1000) NOT NULL,
  "response" VARCHAR(32) NOT NULL,
  "note" VARCHAR(500),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyChecklistResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SafetyChecklistTemplate_scope_status_title_idx" ON "SafetyChecklistTemplate"("tenantId", "companyId", "periodId", "status", "title");
CREATE UNIQUE INDEX "SafetyChecklistTemplateItem_template_sortOrder_key" ON "SafetyChecklistTemplateItem"("templateId", "sortOrder");
CREATE INDEX "SafetyChecklistTemplateItem_scope_template_idx" ON "SafetyChecklistTemplateItem"("tenantId", "companyId", "periodId", "templateId");
CREATE UNIQUE INDEX "SafetyChecklistRun_scope_run_key" ON "SafetyChecklistRun"("tenantId", "companyId", "periodId", "runKey");
CREATE UNIQUE INDEX "SafetyChecklistRun_inspectionId_key" ON "SafetyChecklistRun"("inspectionId");
CREATE INDEX "SafetyChecklistRun_scope_status_inspectedOn_idx" ON "SafetyChecklistRun"("tenantId", "companyId", "periodId", "status", "inspectedOn");
CREATE INDEX "SafetyChecklistRun_scope_project_idx" ON "SafetyChecklistRun"("tenantId", "companyId", "periodId", "projectId");
CREATE INDEX "SafetyChecklistRun_scope_template_idx" ON "SafetyChecklistRun"("tenantId", "companyId", "periodId", "templateId");
CREATE UNIQUE INDEX "SafetyChecklistResponse_findingId_key" ON "SafetyChecklistResponse"("findingId");
CREATE UNIQUE INDEX "SafetyChecklistResponse_scope_response_key" ON "SafetyChecklistResponse"("tenantId", "companyId", "periodId", "responseKey");
CREATE UNIQUE INDEX "SafetyChecklistResponse_run_item_key" ON "SafetyChecklistResponse"("runId", "templateItemId");
CREATE INDEX "SafetyChecklistResponse_scope_run_idx" ON "SafetyChecklistResponse"("tenantId", "companyId", "periodId", "runId");
CREATE INDEX "SafetyChecklistResponse_scope_response_idx" ON "SafetyChecklistResponse"("tenantId", "companyId", "periodId", "response");

ALTER TABLE "SafetyChecklistTemplate" ADD CONSTRAINT "SafetyChecklistTemplate_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplate" ADD CONSTRAINT "SafetyChecklistTemplate_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplate" ADD CONSTRAINT "SafetyChecklistTemplate_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplateItem" ADD CONSTRAINT "SafetyChecklistTemplateItem_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplateItem" ADD CONSTRAINT "SafetyChecklistTemplateItem_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplateItem" ADD CONSTRAINT "SafetyChecklistTemplateItem_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistTemplateItem" ADD CONSTRAINT "SafetyChecklistTemplateItem_template_fkey" FOREIGN KEY ("templateId") REFERENCES "SafetyChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistRun" ADD CONSTRAINT "SafetyChecklistRun_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistRun" ADD CONSTRAINT "SafetyChecklistRun_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistRun" ADD CONSTRAINT "SafetyChecklistRun_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistRun" ADD CONSTRAINT "SafetyChecklistRun_template_fkey" FOREIGN KEY ("templateId") REFERENCES "SafetyChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistRun" ADD CONSTRAINT "SafetyChecklistRun_inspection_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SafetyInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_run_fkey" FOREIGN KEY ("runId") REFERENCES "SafetyChecklistRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_item_fkey" FOREIGN KEY ("templateItemId") REFERENCES "SafetyChecklistTemplateItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SafetyChecklistResponse" ADD CONSTRAINT "SafetyChecklistResponse_finding_fkey" FOREIGN KEY ("findingId") REFERENCES "SafetyFinding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
