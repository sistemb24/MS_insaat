CREATE TABLE "SafetyWorkAccident" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT,
  "personnelId" TEXT,
  "occurredOn" TIMESTAMP(3) NOT NULL,
  "classification" VARCHAR(500) NOT NULL,
  "summary" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "recordedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyWorkAccident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyTraining" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "name" VARCHAR(500) NOT NULL,
  "type" VARCHAR(500) NOT NULL,
  "trainerName" VARCHAR(500) NOT NULL,
  "trainingOn" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "nextTrainingOn" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyTraining_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyTrainingAttendance" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "trainingId" TEXT NOT NULL,
  "personnelId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ATTENDED',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafetyTrainingAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyInspection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "inspectedOn" TIMESTAMP(3) NOT NULL,
  "inspectorName" VARCHAR(500) NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyInspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyFinding" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "ownerPersonnelId" TEXT,
  "category" VARCHAR(500) NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "dueOn" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SafetyPpeIssuance" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "personnelId" TEXT NOT NULL,
  "issuanceKey" VARCHAR(1000) NOT NULL,
  "ppeCode" VARCHAR(500) NOT NULL,
  "ppeType" VARCHAR(500) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "issuedOn" TIMESTAMP(3) NOT NULL,
  "returnedOn" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SafetyPpeIssuance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SafetyWorkAccident_scope_status_occurredOn_idx" ON "SafetyWorkAccident"("tenantId", "companyId", "periodId", "status", "occurredOn");
CREATE INDEX "SafetyWorkAccident_scope_project_idx" ON "SafetyWorkAccident"("tenantId", "companyId", "periodId", "projectId");
CREATE INDEX "SafetyWorkAccident_scope_personnel_idx" ON "SafetyWorkAccident"("tenantId", "companyId", "periodId", "personnelId");
CREATE INDEX "SafetyTraining_scope_status_trainingOn_idx" ON "SafetyTraining"("tenantId", "companyId", "periodId", "status", "trainingOn");
CREATE INDEX "SafetyTraining_scope_nextTrainingOn_idx" ON "SafetyTraining"("tenantId", "companyId", "periodId", "nextTrainingOn");
CREATE UNIQUE INDEX "SafetyTrainingAttendance_training_personnel_key" ON "SafetyTrainingAttendance"("trainingId", "personnelId");
CREATE INDEX "SafetyTrainingAttendance_scope_personnel_idx" ON "SafetyTrainingAttendance"("tenantId", "companyId", "periodId", "personnelId");
CREATE INDEX "SafetyTrainingAttendance_scope_training_idx" ON "SafetyTrainingAttendance"("tenantId", "companyId", "periodId", "trainingId");
CREATE INDEX "SafetyInspection_scope_status_inspectedOn_idx" ON "SafetyInspection"("tenantId", "companyId", "periodId", "status", "inspectedOn");
CREATE INDEX "SafetyInspection_scope_project_idx" ON "SafetyInspection"("tenantId", "companyId", "periodId", "projectId");
CREATE INDEX "SafetyFinding_scope_status_dueOn_idx" ON "SafetyFinding"("tenantId", "companyId", "periodId", "status", "dueOn");
CREATE INDEX "SafetyFinding_scope_inspection_idx" ON "SafetyFinding"("tenantId", "companyId", "periodId", "inspectionId");
CREATE INDEX "SafetyFinding_scope_owner_idx" ON "SafetyFinding"("tenantId", "companyId", "periodId", "ownerPersonnelId");
CREATE UNIQUE INDEX "SafetyPpeIssuance_scope_issuance_key" ON "SafetyPpeIssuance"("tenantId", "companyId", "periodId", "issuanceKey");
CREATE INDEX "SafetyPpeIssuance_scope_status_issuedOn_idx" ON "SafetyPpeIssuance"("tenantId", "companyId", "periodId", "status", "issuedOn");
CREATE INDEX "SafetyPpeIssuance_scope_personnel_idx" ON "SafetyPpeIssuance"("tenantId", "companyId", "periodId", "personnelId");

ALTER TABLE "SafetyWorkAccident" ADD CONSTRAINT "SafetyWorkAccident_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyWorkAccident" ADD CONSTRAINT "SafetyWorkAccident_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyWorkAccident" ADD CONSTRAINT "SafetyWorkAccident_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTraining" ADD CONSTRAINT "SafetyTraining_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTraining" ADD CONSTRAINT "SafetyTraining_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTraining" ADD CONSTRAINT "SafetyTraining_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTrainingAttendance" ADD CONSTRAINT "SafetyTrainingAttendance_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTrainingAttendance" ADD CONSTRAINT "SafetyTrainingAttendance_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTrainingAttendance" ADD CONSTRAINT "SafetyTrainingAttendance_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyTrainingAttendance" ADD CONSTRAINT "SafetyTrainingAttendance_training_fkey" FOREIGN KEY ("trainingId") REFERENCES "SafetyTraining"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyInspection" ADD CONSTRAINT "SafetyInspection_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyInspection" ADD CONSTRAINT "SafetyInspection_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyInspection" ADD CONSTRAINT "SafetyInspection_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyFinding" ADD CONSTRAINT "SafetyFinding_inspection_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SafetyInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyPpeIssuance" ADD CONSTRAINT "SafetyPpeIssuance_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyPpeIssuance" ADD CONSTRAINT "SafetyPpeIssuance_company_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SafetyPpeIssuance" ADD CONSTRAINT "SafetyPpeIssuance_period_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
