import * as Sentry from "@sentry/nextjs";

import { operationalResponseHeaders } from "@/lib/operational-health";
import {
  buildPartyShadowRuntimeAttestation,
  isPartyShadowRuntimeReadinessAuthorized,
  PARTY_SHADOW_RUNTIME_READINESS_HEADER,
} from "@/lib/party-shadow-runtime-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const confirmation = request.headers.get(
    PARTY_SHADOW_RUNTIME_READINESS_HEADER,
  );
  if (!isPartyShadowRuntimeReadinessAuthorized(process.env, confirmation)) {
    return Response.json(
      { status: "not_found" },
      { headers: operationalResponseHeaders(), status: 404 },
    );
  }

  const attestation = buildPartyShadowRuntimeAttestation({
    env: process.env,
    sentry: {
      enabled: Sentry.isEnabled(),
      initialized: Sentry.isInitialized(),
      projectId: Sentry.getClient()?.getDsn()?.projectId,
    },
  });

  return Response.json(attestation, {
    headers: operationalResponseHeaders(),
    status: attestation.ready ? 200 : 503,
  });
}
