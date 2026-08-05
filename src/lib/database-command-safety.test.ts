import { describe, expect, it } from "vitest";

import { assertNonProductionDatabaseCommand } from "./database-command-safety";

describe("database command safety", () => {
  it.each(["production", "prod", "PRODUCTION"])(
    "blocks destructive/demo commands in %s",
    (environment) => {
      expect(() =>
        assertNonProductionDatabaseCommand("db:seed", {
          NOA_RUNTIME_ENV: environment,
        }),
      ).toThrow(/production ortamında kapalıdır/);
    },
  );

  it("allows the documented development command path", () => {
    expect(() =>
      assertNonProductionDatabaseCommand("db:seed", {
        NODE_ENV: "development",
      }),
    ).not.toThrow();
  });
});
