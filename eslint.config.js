import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Colores escritos a mano: solo se permiten en el archivo de tema de la app
// (auditoría v5 P1 #5, spec 002 SC-003).
const colorLiteral = "/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\\(/";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      "apps/mobile/ios/**",
      "apps/mobile/android/**",
      "apps/mobile/expo-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Los assets de React Native se cargan con require() para que Metro los empaquete.
      "@typescript-eslint/no-require-imports": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${colorLiteral}]`,
          message: "Usá un token de src/theme.ts en lugar de un color escrito a mano.",
        },
      ],
    },
  },
  {
    files: ["apps/mobile/src/theme.ts", "apps/mobile/**/*.test.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
);
