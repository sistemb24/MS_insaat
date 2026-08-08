import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  captureException: vi.fn(() => "event-id"),
  flush: vi.fn(async () => true),
  projectId: { value: "4511854028456016" },
  getClient: vi.fn(() => ({
    getDsn: () => ({ projectId: sentryMock.projectId.value }),
  })),
  isEnabled: vi.fn(() => true),
  isInitialized: vi.fn(() => true),
}));

vi.mock("@sentry/nextjs", () => sentryMock);

import { POST } from "./route";

describe("POST /api/observability-smoke", () => {
  beforeEach(() => {
    vi.stubEnv("NOA_RUNTIME_ENV", "staging");
    vi.stubEnv("NOA_OBSERVABILITY_SMOKE_ENABLED", "true");
    sentryMock.projectId.value = "4511854028456016";
    sentryMock.captureException.mockClear();
    sentryMock.flush.mockClear();
  });

  it("fails closed without the exact confirmation header", async () => {
    const response = await POST(
      new Request("http://localhost/api/observability-smoke", { method: "POST" }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ status: "not_found" });
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  it("captures one fixed synthetic event when the temporary switch is enabled", async () => {
    const response = await POST(
      new Request("http://localhost/api/observability-smoke", {
        headers: { "x-noa-observability-confirmation": "staging-observability" },
        method: "POST",
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      eventId: "event-id",
      expectedProjectConfigured: true,
      flushed: true,
      sdkConfigured: true,
      status: "captured",
    });
    expect(sentryMock.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "NoaStagingObservabilitySmoke" }),
      { tags: { "noa.smoke": "phase36-dilim4" } },
    );
    expect(sentryMock.flush).toHaveBeenCalledWith(2_000);
  });

  it("returns unavailable when the event cannot be flushed", async () => {
    sentryMock.flush.mockResolvedValueOnce(false);
    const response = await POST(
      new Request("http://localhost/api/observability-smoke", {
        headers: { "x-noa-observability-confirmation": "staging-observability" },
        method: "POST",
      }),
    );
    expect(response.status).toBe(503);
  });

  it("captures one fixed production event only with the full production gate", async () => {
    vi.stubEnv("NOA_RUNTIME_ENV", "production");
    vi.stubEnv(
      "SENTRY_DSN",
      "https://public@example.ingest.sentry.io/4511859248791632",
    );
    vi.stubEnv("SENTRY_EXPECTED_PROJECT_ID", "4511859248791632");
    sentryMock.projectId.value = "4511859248791632";

    const response = await POST(
      new Request("http://localhost/api/observability-smoke", {
        headers: {
          "x-noa-observability-confirmation": "production-observability",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      expectedProjectConfigured: true,
      status: "captured",
    });
    expect(sentryMock.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "NoaProductionObservabilitySmoke" }),
      { tags: { "noa.smoke": "phase36-production-acceptance" } },
    );
  });

  it("keeps production closed for a staging DSN even with the temporary switch", async () => {
    vi.stubEnv("NOA_RUNTIME_ENV", "production");
    vi.stubEnv(
      "SENTRY_DSN",
      "https://public@example.ingest.sentry.io/4511854028456016",
    );
    vi.stubEnv("SENTRY_EXPECTED_PROJECT_ID", "4511854028456016");

    const response = await POST(
      new Request("http://localhost/api/observability-smoke", {
        headers: {
          "x-noa-observability-confirmation": "production-observability",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(404);
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });
});
