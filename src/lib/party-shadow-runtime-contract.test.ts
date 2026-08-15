import { describe, expect, test } from "vitest";

import {
  buildPartyShadowRuntimeAttestation,
  isPartyShadowRuntimeReadinessAuthorized,
  partyShadowRuntimeContractChecksum,
  partyShadowRuntimeOriginFingerprint,
} from "./party-shadow-runtime-contract";

const releaseId = "e82fcb4ce19e287867ed54337a326e81531676c7";

describe("Party shadow runtime contract", () => {
  test("builds a deterministic redacted contract proof", () => {
    const env = productionEnv();
    const first = buildPartyShadowRuntimeAttestation({
      env,
      sentry: {
        enabled: true,
        initialized: true,
        projectId: "4511859248791632",
      },
    });

    expect(first).toEqual(buildPartyShadowRuntimeAttestation({
      env,
      sentry: {
        enabled: true,
        initialized: true,
        projectId: "4511859248791632",
      },
    }));
    expect(first).toMatchObject({
      contractChecksum: partyShadowRuntimeContractChecksum(),
      negativeAlertingReady: true,
      originFingerprint: partyShadowRuntimeOriginFingerprint(
        "https://app.noa.example",
      ),
      ready: true,
      releaseId,
    });
    expect(JSON.stringify(first)).not.toContain("app.noa.example");
  });

  test("rejects non-production, malformed release and unsafe origin", () => {
    expect(isPartyShadowRuntimeReadinessAuthorized(
      productionEnv(),
      "production-party-shadow-runtime-readiness",
    )).toBe(true);
    expect(isPartyShadowRuntimeReadinessAuthorized(
      { ...productionEnv(), APP_BASE_URL: "https://user:pass@app.noa.example" },
      "production-party-shadow-runtime-readiness",
    )).toBe(false);
    expect(isPartyShadowRuntimeReadinessAuthorized(
      { ...productionEnv(), VERCEL_GIT_COMMIT_SHA: "latest" },
      "production-party-shadow-runtime-readiness",
    )).toBe(false);
  });
});

function productionEnv() {
  return {
    APP_BASE_URL: "https://app.noa.example",
    NOA_RUNTIME_ENV: "production",
    SENTRY_DSN: "https://public@example.ingest.sentry.io/4511859248791632",
    SENTRY_EXPECTED_PROJECT_ID: "4511859248791632",
    VERCEL_GIT_COMMIT_SHA: releaseId,
  };
}
