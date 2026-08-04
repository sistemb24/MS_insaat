-- Faz 34: Super Admin extended-auth security primitives.
-- Additive only; tenant authentication and the Phase 33 tables remain intact.

ALTER TABLE "SuperAdminTotpSecret"
  ALTER COLUMN "secretBase32" DROP NOT NULL,
  ADD COLUMN "secretCiphertext" TEXT,
  ADD COLUMN "secretKeyVersion" TEXT,
  ADD COLUMN "enrollmentExpiresAt" TIMESTAMP(3);

CREATE TABLE "SuperAdminAuthChallenge" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "returnTo" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuperAdminAuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuperAdminRateLimitBucket" (
  "id" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "scopeHash" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "windowEndsAt" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuperAdminRateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdminAuthChallenge_tokenHash_key"
  ON "SuperAdminAuthChallenge"("tokenHash");
CREATE INDEX "SuperAdminAuthChallenge_credentialId_purpose_expiresAt_idx"
  ON "SuperAdminAuthChallenge"("credentialId", "purpose", "expiresAt");
CREATE INDEX "SuperAdminAuthChallenge_expiresAt_idx"
  ON "SuperAdminAuthChallenge"("expiresAt");

CREATE UNIQUE INDEX "SuperAdminRateLimitBucket_purpose_scopeHash_windowStartedAt_key"
  ON "SuperAdminRateLimitBucket"("purpose", "scopeHash", "windowStartedAt");
CREATE INDEX "SuperAdminRateLimitBucket_windowEndsAt_idx"
  ON "SuperAdminRateLimitBucket"("windowEndsAt");

ALTER TABLE "SuperAdminAuthChallenge"
  ADD CONSTRAINT "SuperAdminAuthChallenge_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "SuperAdminCredential"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
