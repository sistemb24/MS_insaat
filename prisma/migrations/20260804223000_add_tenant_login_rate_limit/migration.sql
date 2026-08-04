-- CreateTable
CREATE TABLE "TenantLoginRateLimitBucket" (
    "id" TEXT NOT NULL,
    "scopeKind" TEXT NOT NULL,
    "scopeHash" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLoginRateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantLoginRateLimitBucket_scopeKind_scopeHash_windowStartedAt_key"
ON "TenantLoginRateLimitBucket"("scopeKind", "scopeHash", "windowStartedAt");

-- CreateIndex
CREATE INDEX "TenantLoginRateLimitBucket_windowEndsAt_idx"
ON "TenantLoginRateLimitBucket"("windowEndsAt");
