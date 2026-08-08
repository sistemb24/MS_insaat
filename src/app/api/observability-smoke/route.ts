import * as Sentry from "@sentry/nextjs";

import { operationalResponseHeaders } from "@/lib/operational-health";
import {
  isProductionObservabilitySmokeAuthorized,
  isStagingObservabilitySmokeAuthorized,
  STAGING_SENTRY_PROJECT_ID,
} from "@/lib/staging-observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const confirmation = request.headers.get(
    "x-noa-observability-confirmation",
  );
  const isProduction = process.env.NOA_RUNTIME_ENV === "production";
  const authorized = isProduction
    ? isProductionObservabilitySmokeAuthorized(process.env, confirmation)
    : isStagingObservabilitySmokeAuthorized(process.env, confirmation);

  if (!authorized) {
    return Response.json(
      { status: "not_found" },
      { headers: operationalResponseHeaders(), status: 404 },
    );
  }

  const eventId = Sentry.captureException(
    new Error(
      isProduction
        ? "NoaProductionObservabilitySmoke"
        : "NoaStagingObservabilitySmoke",
    ),
    {
      tags: {
        "noa.smoke": isProduction
          ? "phase36-production-acceptance"
          : "phase36-dilim4",
      },
    },
  );
  const flushed = await Sentry.flush(2_000);
  const sdkConfigured = Sentry.isInitialized() && Sentry.isEnabled();
  const expectedProjectId = isProduction
    ? process.env.SENTRY_EXPECTED_PROJECT_ID?.trim()
    : STAGING_SENTRY_PROJECT_ID;
  const expectedProjectConfigured =
    Sentry.getClient()?.getDsn()?.projectId === expectedProjectId;

  return Response.json(
    {
      eventId,
      expectedProjectConfigured,
      flushed,
      sdkConfigured,
      status: "captured",
    },
    { headers: operationalResponseHeaders(), status: flushed ? 202 : 503 },
  );
}
