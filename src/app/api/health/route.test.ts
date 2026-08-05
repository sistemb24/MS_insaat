import { describe, expect, test } from "vitest";

import { GET } from "./route";

describe("health route", () => {
  test("is a dependency-free liveness signal", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
