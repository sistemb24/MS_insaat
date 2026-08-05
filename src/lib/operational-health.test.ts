import { describe, expect, test, vi } from "vitest";

import {
  createOperationalReadinessProbe,
  operationalResponseHeaders,
} from "./operational-health";

describe("operational health contract", () => {
  test("reports ready only after the database probe succeeds", async () => {
    const checkDatabase = vi.fn().mockResolvedValue([{ ready: 1 }]);

    await expect(
      createOperationalReadinessProbe({ checkDatabase })(),
    ).resolves.toEqual({
      checks: { database: "ready" },
      status: "ready",
    });
  });

  test("fails closed without exposing database errors", async () => {
    const checkDatabase = vi
      .fn()
      .mockRejectedValue(new Error("postgres://secret@db/internal"));

    const result = await createOperationalReadinessProbe({ checkDatabase })();

    expect(result).toEqual({
      checks: { database: "unavailable" },
      status: "unavailable",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  test("disables caching and MIME sniffing", () => {
    expect(operationalResponseHeaders()).toEqual({
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
  });
});
