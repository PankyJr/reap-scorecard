import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reap from "./eslint-rules/no-raw-colours.mjs";
import { LEGACY_COLOUR_FILES } from "./eslint-rules/legacy-colour-files.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Design tokens only (docs/design-rules.md, rule c). New code may not use raw
  // colours or Tailwind palette classes. Tests are exempt: they assert on them.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.{ts,tsx}"],
    plugins: { reap },
    rules: { "reap/no-raw-colours": "error" },
  },
  // Files written before the rule. This list may only get shorter.
  {
    // Route folders like (dashboard) and [id] are glob syntax: escape them.
    files: LEGACY_COLOUR_FILES.map((file) => file.replace(/[()[\]{}!*?+@]/g, "\\$&")),
    rules: { "reap/no-raw-colours": "off" },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Netlify build artefacts (not application source)
    ".netlify/**",
    // Local staging secrets / scratch (never application source)
    "tmp/**",
    // Generated Vitest coverage report (HTML + JS emitted by the reporter)
    "coverage/**",
  ]),
]);

export default eslintConfig;
