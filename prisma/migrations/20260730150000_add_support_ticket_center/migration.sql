CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "ticketKey" VARCHAR(1000) NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "priority" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "messageKey" VARCHAR(1000) NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportTicket_scope_ticket_key"
  ON "SupportTicket"("tenantId", "companyId", "periodId", "ticketKey");
CREATE UNIQUE INDEX "SupportTicket_id_scope_key"
  ON "SupportTicket"("id", "tenantId", "companyId", "periodId");
CREATE INDEX "SupportTicket_scope_requester_status_updated_idx"
  ON "SupportTicket"("tenantId", "companyId", "periodId", "requesterUserId", "status", "updatedAt");
CREATE INDEX "SupportTicket_scope_status_priority_updated_idx"
  ON "SupportTicket"("tenantId", "companyId", "periodId", "status", "priority", "updatedAt");
CREATE UNIQUE INDEX "SupportTicketMessage_scope_message_key"
  ON "SupportTicketMessage"("tenantId", "companyId", "periodId", "messageKey");
CREATE INDEX "SupportTicketMessage_scope_ticket_created_idx"
  ON "SupportTicketMessage"("tenantId", "companyId", "periodId", "ticketId", "createdAt");
CREATE INDEX "SupportTicketMessage_scope_author_created_idx"
  ON "SupportTicketMessage"("tenantId", "companyId", "periodId", "authorUserId", "createdAt");

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_company_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_period_fkey"
  FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_tenant_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_company_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_period_fkey"
  FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage"
  ADD CONSTRAINT "SupportTicketMessage_ticket_scope_fkey"
  FOREIGN KEY ("ticketId", "tenantId", "companyId", "periodId")
  REFERENCES "SupportTicket"("id", "tenantId", "companyId", "periodId")
  ON DELETE CASCADE ON UPDATE CASCADE;
