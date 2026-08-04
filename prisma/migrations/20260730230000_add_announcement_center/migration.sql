CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "announcementKey" VARCHAR(1000) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "content" TEXT NOT NULL,
  "category" VARCHAR(32) NOT NULL,
  "priority" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  "revisionNo" INTEGER NOT NULL DEFAULT 1,
  "lastUpdateKey" VARCHAR(1000),
  "publishRequestKey" VARCHAR(1000),
  "archiveRequestKey" VARCHAR(1000),
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Announcement_scope_announcement_key"
  ON "Announcement"("tenantId", "companyId", "periodId", "announcementKey");
CREATE INDEX "Announcement_scope_status_published_idx"
  ON "Announcement"("tenantId", "companyId", "periodId", "status", "publishedAt");
CREATE INDEX "Announcement_scope_category_priority_published_idx"
  ON "Announcement"("tenantId", "companyId", "periodId", "category", "priority", "publishedAt");

ALTER TABLE "Announcement"
  ADD CONSTRAINT "Announcement_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement"
  ADD CONSTRAINT "Announcement_company_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement"
  ADD CONSTRAINT "Announcement_period_fkey"
  FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
