import { defineConfig } from "vitest/config";

// Cobertura del motor medida en cada corrida de tests, también en el CI (issue #37).
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/test/**"],
      thresholds: { lines: 90 },
    },
  },
});
