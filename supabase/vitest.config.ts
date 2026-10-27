import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// En Deno, `@vuelto/motor` lo resuelve el `deno.json` de cada función; acá
// apunta al mismo código fuente, así los tests no dependen del build del motor.
export default defineConfig({
  resolve: {
    alias: {
      "@vuelto/motor": fileURLToPath(new URL("../packages/motor/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["functions/**/*.test.ts"],
    // Mismo piso de cobertura que el motor (issue #37). `index.ts` solo
    // conecta Deno y Supabase: no corre en Node y se prueba desplegado.
    coverage: {
      provider: "v8",
      include: ["functions/**/*.ts"],
      exclude: ["functions/**/*.test.ts", "functions/_shared/test/**", "functions/*/index.ts"],
      thresholds: { lines: 90 },
    },
  },
});
