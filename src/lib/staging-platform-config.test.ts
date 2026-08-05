import { describe, expect, it } from "vitest";

import vercelConfig from "../../vercel.json";

import {
  NOA_STAGING_VERCEL_REGION,
  validateStagingPlatformConfig,
} from "./staging-platform-config";

describe("staging platform config", () => {
  it("pins the repository Vercel config to the approved Frankfurt region", () => {
    expect(validateStagingPlatformConfig(vercelConfig)).toEqual({
      environmentValuesCommitted: false,
      region: NOA_STAGING_VERCEL_REGION,
    });
  });

  it("rejects another or multiple regions", () => {
    expect(() =>
      validateStagingPlatformConfig({ regions: ["iad1"] }),
    ).toThrow(/fra1/);
    expect(() =>
      validateStagingPlatformConfig({ regions: ["fra1", "cdg1"] }),
    ).toThrow(/fra1/);
  });

  it("rejects overrides, failover and committed environment values", () => {
    expect(() =>
      validateStagingPlatformConfig({
        functions: { "api/**": { regions: ["iad1"] } },
        regions: ["fra1"],
      }),
    ).toThrow(/ezemez/);
    expect(() =>
      validateStagingPlatformConfig({
        functionFailoverRegions: ["cdg1"],
        regions: ["fra1"],
      }),
    ).toThrow(/failover/);
    expect(() =>
      validateStagingPlatformConfig({
        env: { DATABASE_URL: "committed-value" },
        regions: ["fra1"],
      }),
    ).toThrow(/vercel\.json/);
  });
});
