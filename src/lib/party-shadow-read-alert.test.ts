import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createPartyShadowReadSafetyAlertWriter,
  writePartyShadowReadSafetyAlert,
} from "./party-shadow-read-alert";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(() => "event-id"),
}));

const productionEnv = {
  NOA_RUNTIME_ENV: "production",
  SENTRY_DSN: "https://public@example.ingest.sentry.io/4511859248791632",
  SENTRY_EXPECTED_PROJECT_ID: "4511859248791632",
};

describe("Party shadow-read safety alert", () => {
  beforeEach(() => vi.clearAllMocks());

  test("emits only fixed redacted fields in production", () => {
    const result = writePartyShadowReadSafetyAlert({
      releaseId: "e82fcb4ce19e287867ed54337a326e81531676c7",
      revisionNo: 1,
      scopeFingerprint: "c2df556c5505",
      slug: "musteriler",
      status: "SHADOW_DRIFT",
    }, productionEnv, 1_000_000);

    expect(result).toBe("event-id");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: "PartyShadowReadSafetySignal" }),
      {
        tags: {
          "noa.party.release": "e82fcb4ce19e287867ed54337a326e81531676c7",
          "noa.party.revision": "1",
          "noa.party.scope": "c2df556c5505",
          "noa.party.slug": "musteriler",
          "noa.party.status": "SHADOW_DRIFT",
        },
      },
    );
  });

  test("throttles the same safety signal without hiding other statuses", () => {
    const alert = {
      releaseId: "b".repeat(40),
      scopeFingerprint: "d2df556c5505",
      slug: "tedarikciler" as const,
      status: "SHADOW_DRIFT" as const,
    };
    expect(writePartyShadowReadSafetyAlert(alert, productionEnv, 2_000_000))
      .toBe("event-id");
    expect(writePartyShadowReadSafetyAlert(alert, productionEnv, 2_000_001))
      .toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  test("supports an isolated capture adapter and controlled clock", () => {
    let now = 3_000_000;
    const capture = vi.fn(() => "isolated-event");
    const write = createPartyShadowReadSafetyAlertWriter({
      capture,
      env: productionEnv,
      now: () => now,
    });
    const alert = {
      releaseId: "c".repeat(40),
      scopeFingerprint: "e2df556c5505",
      slug: "taseronlar" as const,
      status: "RELEASE_MISMATCH" as const,
    };

    expect(write(alert)).toBe("isolated-event");
    expect(write(alert)).toBeNull();
    now += 5 * 60_000;
    expect(write(alert)).toBe("isolated-event");
    expect(capture).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("does not emit outside an enabled production Sentry boundary", () => {
    expect(writePartyShadowReadSafetyAlert({
      scopeFingerprint: "c2df556c5505",
      slug: "musteriler",
      status: "SHADOW_READ_ERROR",
    }, { ...productionEnv, NOA_RUNTIME_ENV: "staging" })).toBeNull();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
