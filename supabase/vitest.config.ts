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
    // Mismo piso de cobertura que el motor (issue #37). `index.ts` y los
    // repositorios reales de `_shared/supabase/` solo conectan Deno y Supabase:
    // no corren en Node, los chequea `deno check` y se prueban desplegados.
    coverage: {
      provider: "v8",
      include: ["functions/**/*.ts"],
      exclude: ["functions/**/*.test.ts", "functions/_shared/test/**", "functions/*/index.ts", "functions/_shared/supabase/**"],
      thresholds: { lines: 90 },
    },
  },
});
