import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateStagingPlatformConfig } from "../src/lib/staging-platform-config";

async function main() {
  const configPath = resolve(process.cwd(), "vercel.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as unknown;

  if (!isRecord(config)) {
    throw new Error("vercel.json nesne olmalıdır.");
  }

  const result = validateStagingPlatformConfig(config);

  console.log(
    JSON.stringify({
      environmentValuesCommitted: result.environmentValuesCommitted,
      region: result.region,
      status: "ready-for-external-staging-inputs",
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

void main();
