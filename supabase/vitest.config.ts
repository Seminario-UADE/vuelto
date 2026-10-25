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
  },
});
