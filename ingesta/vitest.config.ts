import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `@vuelto/motor` apunta al código fuente del motor: los tests no dependen de
// que `dist/` esté compilado (igual que `supabase/vitest.config.ts`).
export default defineConfig({
  resolve: {
    alias: {
      "@vuelto/motor": fileURLToPath(new URL("../packages/motor/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Mismo piso de cobertura que el motor (issue #37). El bloque de entrada de
    // cada script (argumentos, entorno y red real) se marca con
    // `/* v8 ignore start */`; la lógica vive en funciones que sí se prueban.
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/corpus/test/**"],
      thresholds: { lines: 90 },
    },
  },
});
