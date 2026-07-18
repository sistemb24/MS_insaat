-- CreateTable
CREATE TABLE "AppCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "defaultSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppCredential_userId_key" ON "AppCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppCredential_email_key" ON "AppCredential"("email");

-- CreateIndex
CREATE INDEX "AppCredential_tenantId_idx" ON "AppCredential"("tenantId");

-- AddForeignKey
ALTER TABLE "AppCredential" ADD CONSTRAINT "AppCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppCredential" ADD CONSTRAINT "AppCredential_defaultSessionId_fkey" FOREIGN KEY ("defaultSessionId") REFERENCES "AppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
