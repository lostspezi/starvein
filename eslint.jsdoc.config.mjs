import { defineConfig, globalIgnores } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

/**
 * Separate JSDoc-Analyse (CI-Job "jsdoc", lokal via `pnpm lint:jsdoc`).
 * Prüft die Korrektheit vorhandener JSDoc-Kommentare (Param-Namen passen
 * zur Signatur, keine kaputten oder unbekannten Tags, valide Typ-Syntax) —
 * erzwingt aber KEIN JSDoc auf jeder Funktion: die Codebasis kommentiert
 * bewusst sparsam und nur, wo Code allein den Kontext nicht trägt.
 */
const jsdocConfig = defineConfig([
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "e2e/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    linterOptions: {
      // Inline-Disables gehören zur Haupt-Config (z. B. @next/next-Regeln),
      // die diese Doku-Analyse nicht kennt — hier komplett ignorieren.
      noInlineConfig: true,
      reportUnusedDisableDirectives: "off",
    },
    extends: [jsdoc.configs["flat/recommended-typescript-error"]],
    rules: {
      // Kein Dokumentationszwang — nur vorhandene JSDoc wird geprüft:
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
      "jsdoc/require-yields": "off",
      // Prosa-Stil (Punkt am Satzende etc.) nicht erzwingen:
      "jsdoc/require-description-complete-sentence": "off",
      "jsdoc/tag-lines": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    ".claude/**",
  ]),
]);

export default jsdocConfig;
