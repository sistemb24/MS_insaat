-- Add atomic rate-limit window tracking for API keys
ALTER TABLE "ApiKey"
ADD COLUMN "rateLimitWindowStartedAt" TIMESTAMP(3),
ADD COLUMN "rateLimitWindowCount" INTEGER NOT NULL DEFAULT 0;
