import { describe, expect, it } from "vitest";

import {
  isStagingObservabilitySmokeAuthorized,
  readStagingObservabilityConfig,
  sanitizeStagingSentryEvent,
} from "./staging-observability";

describe("staging observability boundary", () => {
  it("enables only a valid HTTPS Sentry DSN in staging", () => {
    expect(
      readStagingObservabilityConfig({
        NOA_RUNTIME_ENV: "staging",
        SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
        VERCEL_GIT_COMMIT_SHA: "ABCDEF123",
      }),
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/123",
      enabled: true,
      environment: "staging",
      reason: "enabled",
      release: "abcdef123",
    });

    expect(
      readStagingObservabilityConfig({
        NOA_RUNTIME_ENV: "production",
        SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
      }).reason,
    ).toBe("not-staging");
    expect(
      readStagingObservabilityConfig({ NOA_RUNTIME_ENV: "staging" }).reason,
    ).toBe("missing-dsn");
    expect(
      readStagingObservabilityConfig({
        NOA_RUNTIME_ENV: "staging",
        SENTRY_DSN: "http://public@example.ingest.sentry.io/123",
      }).reason,
    ).toBe("invalid-dsn");
  });

  it("removes request, identity, local variables and free-form event data", () => {
    const sanitized = sanitizeStagingSentryEvent({
      breadcrumbs: [{ message: "visited /private" }],
      contexts: { tenant: { name: "private tenant" } },
      exception: {
        values: [
          {
            type: "DatabaseError",
            value: "password leaked in raw message",
            stacktrace: {
              frames: [
                {
                  context_line: "const password = 'secret'",
                  filename: "src/example.ts",
                  post_context: ["secret"],
                  pre_context: ["secret"],
                  vars: { password: "secret" },
                },
              ],
            },
          },
        ],
      },
      extra: { databaseUrl: "postgres://secret" },
      message: "raw private message",
      request: { cookies: { session: "secret" }, url: "/private?token=secret" },
      tags: { "noa.runtime": "staging", tenant: "tenant-secret" },
      transaction: "/private/123",
      type: undefined,
      user: { email: "private@example.com", ip_address: "127.0.0.1" },
    });

    expect(sanitized).toMatchObject({
      exception: {
        values: [
          {
            type: "DatabaseError",
            value: "DatabaseError",
            stacktrace: {
              frames: [{ filename: "src/example.ts" }],
            },
          },
        ],
      },
      tags: { "noa.runtime": "staging" },
    });
    expect(sanitized).not.toHaveProperty("request");
    expect(sanitized).not.toHaveProperty("user");
    expect(sanitized).not.toHaveProperty("extra");
    expect(JSON.stringify(sanitized)).not.toContain("secret");
  });

  it("requires staging, a temporary switch and an exact smoke confirmation", () => {
    const enabled = {
      NOA_OBSERVABILITY_SMOKE_ENABLED: "true",
      NOA_RUNTIME_ENV: "staging",
    };
    expect(
      isStagingObservabilitySmokeAuthorized(enabled, "staging-observability"),
    ).toBe(true);
    expect(isStagingObservabilitySmokeAuthorized(enabled, "wrong")).toBe(false);
    expect(
      isStagingObservabilitySmokeAuthorized(
        { ...enabled, NOA_RUNTIME_ENV: "production" },
        "staging-observability",
      ),
    ).toBe(false);
  });
});
