import * as Sentry from "@sentry/nextjs";

import { operationalResponseHeaders } from "@/lib/operational-health";
import { isStagingObservabilitySmokeAuthorized } from "@/lib/staging-observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (
    !isStagingObservabilitySmokeAuthorized(
      process.env,
      request.headers.get("x-noa-observability-confirmation"),
    )
  ) {
    return Response.json(
      { status: "not_found" },
      { headers: operationalResponseHeaders(), status: 404 },
    );
  }

  const eventId = Sentry.captureException(
    new Error("NoaStagingObservabilitySmoke"),
    { tags: { "noa.smoke": "phase36-dilim4" } },
  );
  const flushed = await Sentry.flush(2_000);

  return Response.json(
    { eventId, flushed, status: "captured" },
    { headers: operationalResponseHeaders(), status: flushed ? 202 : 503 },
  );
}
