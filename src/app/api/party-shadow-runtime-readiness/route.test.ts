import { beforeEach, describe, expect, test, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  enabled: { value: true },
  initialized: { value: true },
  projectId: { value: "4511859248791632" },
  getClient: vi.fn(() => ({
    getDsn: () => ({ projectId: sentryMock.projectId.value }),
  })),
  isEnabled: vi.fn(() => sentryMock.enabled.value),
  isInitialized: vi.fn(() => sentryMock.initialized.value),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

import { GET } from "./route";

const releaseId = "e82fcb4ce19e287867ed54337a326e81531676c7";
const confirmation = "production-party-shadow-runtime-readiness";

describe("GET /api/party-shadow-runtime-readiness", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("APP_BASE_URL", "https://app.noa.example");
    vi.stubEnv("NOA_RUNTIME_ENV", "production");
    vi.stubEnv("SENTRY_DSN", "https://public@example.ingest.sentry.io/4511859248791632");
    vi.stubEnv("SENTRY_EXPECTED_PROJECT_ID", "4511859248791632");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", releaseId);
    sentryMock.enabled.value = true;
    sentryMock.initialized.value = true;
    sentryMock.projectId.value = "4511859248791632";
  });

  test("returns a redacted exact-release runtime attestation", async () => {
    const response = await GET(request(confirmation));

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      legacyAuthoritative: true,
      negativeAlertingReady: true,
      ready: true,
      redactedStructuredLogs: true,
      releaseId,
      version: "party-shadow-runtime-v1",
    });
    expect(result.contractChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.originFingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(JSON.stringify(result)).not.toContain("app.noa.example");
  });

  test("fails closed without exact confirmation or production runtime", async () => {
    expect((await GET(request(null))).status).toBe(404);
    vi.stubEnv("NOA_RUNTIME_ENV", "staging");
    expect((await GET(request(confirmation))).status).toBe(404);
  });

  test("returns unavailable when the redacted alert channel is not ready", async () => {
    sentryMock.enabled.value = false;

    const response = await GET(request(confirmation));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      negativeAlertingReady: false,
      ready: false,
    });
  });
});

function request(value: string | null) {
  return new Request("https://app.noa.example/api/party-shadow-runtime-readiness", {
    headers: value ? { "x-noa-party-shadow-runtime-readiness": value } : {},
  });
}
