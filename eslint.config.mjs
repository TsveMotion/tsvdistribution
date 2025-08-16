import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow using 'any' where expedient in app code
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars become warnings; allow prefix '_' to intentionally ignore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ],
      // Hooks deps warnings only
      "react-hooks/exhaustive-deps": "warn",
      // Allow apostrophes/quotes in JSX text
      "react/no-unescaped-entities": "off",
      // Prefer-const can be noisy during rapid iteration
      "prefer-const": "off",
    },
  },
];

export default eslintConfig;
