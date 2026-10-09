import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/",
      "docs/try/engine/",
      "docs/downloads/",
      "extension/*.zip",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      eqeqeq: ["error", "always"],
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
  },
  {
    files: ["extension/background/**/*.js"],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.webextensions },
    },
  },
  {
    files: ["docs/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["proxy/worker.js"],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  prettier,
];
