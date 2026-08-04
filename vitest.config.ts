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
