CREATE TABLE IF NOT EXISTS "SuperAdminCredential" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'platform',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SuperAdminCredential_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SuperAdminCredential"
    ADD COLUMN IF NOT EXISTS "singletonKey" TEXT NOT NULL DEFAULT 'platform';

CREATE TABLE IF NOT EXISTS "SuperAdminSession" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "SuperAdminSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SuperAdminSession_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SuperAdminPasswordResetToken" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuperAdminPasswordResetToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SuperAdminPasswordResetToken_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SuperAdminOtpCode" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuperAdminOtpCode_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SuperAdminOtpCode_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SuperAdminTotpSecret" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "secretBase32" TEXT NOT NULL,
    "backupCodes" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    CONSTRAINT "SuperAdminTotpSecret_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SuperAdminTotpSecret_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SuperAdminAccountLock" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastFailedIp" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SuperAdminAccountLock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SuperAdminAccountLock_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MaintenanceConfig" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "endsAt" TIMESTAMP(3),
    "statusUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminCredential_singletonKey_key" ON "SuperAdminCredential"("singletonKey");
CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminCredential_email_key" ON "SuperAdminCredential"("email");
CREATE INDEX IF NOT EXISTS "SuperAdminSession_credentialId_idx" ON "SuperAdminSession"("credentialId");
CREATE INDEX IF NOT EXISTS "SuperAdminSession_expiresAt_idx" ON "SuperAdminSession"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminPasswordResetToken_tokenHash_key" ON "SuperAdminPasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "SuperAdminPasswordResetToken_credentialId_idx" ON "SuperAdminPasswordResetToken"("credentialId");
CREATE INDEX IF NOT EXISTS "SuperAdminPasswordResetToken_expiresAt_idx" ON "SuperAdminPasswordResetToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "SuperAdminOtpCode_credentialId_idx" ON "SuperAdminOtpCode"("credentialId");
CREATE INDEX IF NOT EXISTS "SuperAdminOtpCode_expiresAt_idx" ON "SuperAdminOtpCode"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminTotpSecret_credentialId_key" ON "SuperAdminTotpSecret"("credentialId");
CREATE UNIQUE INDEX IF NOT EXISTS "SuperAdminAccountLock_credentialId_key" ON "SuperAdminAccountLock"("credentialId");
