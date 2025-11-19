import { defineConfig } from "eslint/config";
import pluginJs from "@eslint/js";
import pluginNode from "eslint-plugin-n";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    name: "eslint/js",
    files: ["**/*.js"],
    plugins: {
      js: pluginJs,
    },
    extends: ["js/recommended"],
  },
  {
    name: "eslint/node",
    files: ["**/*.js"],
    plugins: {
      n: pluginNode,
    },
    extends: ["n/flat/mixed-esm-and-cjs"],
  },
  {
    name: "eslint/eslint-plugin",
    files: ["**/*.js"],
    plugins: {
      "eslint-plugin": eslintPlugin,
    },
    extends: ["eslint-plugin/flat/recommended"],
  },

  {
    name: "eslint/typescript",
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
    },
  },
]);
