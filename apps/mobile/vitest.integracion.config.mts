import { defineConfig } from "vitest/config";

/**
 * Pruebas contra un Supabase local (Docker). No corren en `npm run test` ni en el CI sin Docker:
 * se saltan solas si faltan las variables (ver `specs/009-sincronizar-corpus/quickstart.md`).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integracion.test.ts"],
    testTimeout: 30_000,
  },
});
