import { describe, expect, test, vi } from "vitest";

import { redactStructuredLogFields, writeStructuredLog } from "./structured-logger";

describe("structured logger boundary", () => {
  test("redacts nested credentials and serializes errors safely", () => {
    expect(
      redactStructuredLogFields({
        authorization: "Bearer live-secret",
        context: {
          databaseUrl: "postgres://secret@db/noa",
          error: new Error("raw connection failure"),
          tenantId: "tenant-1",
        },
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      context: {
        databaseUrl: "[REDACTED]",
        error: { name: "Error" },
        tenantId: "tenant-1",
      },
    });
  });

  test("emits one JSON line through the selected level", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    writeStructuredLog("warn", "readiness.unavailable", { token: "hidden" });

    expect(warn).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      event: "readiness.unavailable",
      level: "warn",
      token: "[REDACTED]",
    });
    expect(entry.timestamp).toEqual(expect.any(String));
    warn.mockRestore();
  });
});
