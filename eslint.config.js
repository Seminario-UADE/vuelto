import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      // Entradas de las Edge Functions: usan el global `Deno` y no corren en Node.
      "supabase/functions/*/index.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
