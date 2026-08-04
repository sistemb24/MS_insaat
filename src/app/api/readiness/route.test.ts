import { beforeEach, describe, expect, test, vi } from "vitest";

const databaseProbeMock = vi.hoisted(() => vi.fn());
const writeStructuredLogMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRawUnsafe: databaseProbeMock },
}));
vi.mock("@/lib/structured-logger", () => ({
  writeStructuredLog: writeStructuredLogMock,
}));

import { GET } from "./route";

describe("readiness route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 200 only when the database is reachable", async () => {
    databaseProbeMock.mockResolvedValue([{ ready: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checks: { database: "ready" },
      status: "ready",
    });
    expect(writeStructuredLogMock).not.toHaveBeenCalled();
  });

  test("returns a redacted 503 state and emits an operational event", async () => {
    databaseProbeMock.mockRejectedValue(new Error("secret database detail"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      checks: { database: "unavailable" },
      status: "unavailable",
    });
    expect(writeStructuredLogMock).toHaveBeenCalledWith(
      "warn",
      "readiness.unavailable",
      { database: "unavailable" },
    );
  });
});
