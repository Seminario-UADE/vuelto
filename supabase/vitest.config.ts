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
    include: ["functions/**/*.test.ts", "scripts/**/*.test.ts"],
    // Mismo piso de cobertura que el motor (issue #37). `index.ts` y los repositorios reales de
    // `_shared/supabase/` (spec 016) solo conectan Deno y Supabase: no corren en Node, los chequea
    // `deno check` y se prueban desplegados. `prueba-manual.ts` (spec 013) usa Deno y la corre el
    // usuario con fotos reales.
    coverage: {
      provider: "v8",
      include: ["functions/**/*.ts", "scripts/**/*.ts"],
      // `verificar-migraciones.ts` solo lee un archivo y fija el código de salida (como `index.ts`).
      exclude: [
        "functions/**/*.test.ts",
        "scripts/**/*.test.ts",
        "functions/_shared/test/**",
        "functions/*/test/**",
        "functions/*/index.ts",
        "functions/*/prueba-manual.ts",
        "functions/_shared/supabase/**",
        "scripts/verificar-migraciones.ts",
      ],
      thresholds: { lines: 90 },
    },
  },
});
