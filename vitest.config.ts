import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    testTimeout: 15000,
    sequence: {
      concurrent: false,
    },
    server: {
      deps: {
        inline: ["fast-check"],
      },
    },
  },
});
