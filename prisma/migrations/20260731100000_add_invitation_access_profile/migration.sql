ALTER TABLE "UserInvitation"
ADD COLUMN "accessProfileId" TEXT;

CREATE INDEX "UserInvitation_tenantId_companyId_accessProfileId_idx"
ON "UserInvitation"("tenantId", "companyId", "accessProfileId");

ALTER TABLE "UserInvitation"
ADD CONSTRAINT "UserInvitation_accessProfileId_fkey"
FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
