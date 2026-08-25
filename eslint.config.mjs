import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    "out/**",
    "build/**",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["script.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        equipmentData: "readonly",
      },
    },
  },
  {
    files: ["equipment-data.js"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["worker/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ["google-apps-script-*.js"],
    languageOptions: {
      globals: {
        ContentService: "readonly",
        DriveApp: "readonly",
        MimeType: "readonly",
        Session: "readonly",
        SpreadsheetApp: "readonly",
        Utilities: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
