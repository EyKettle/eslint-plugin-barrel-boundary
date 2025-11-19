import enforceBarrelFiles from "./rules/enforce-barrel-files";
import pkg from "../package.json";

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
  },
  rules: {
    "enforce-barrel-files": enforceBarrelFiles,
  },
  configs: {} as Record<string, unknown>,
};

plugin.configs.recommended = {
  plugins: ["barrel-boundary"],
  rules: {
    "barrel-boundary/enforce-barrel-files": "error",
  },
};

plugin.configs["flat/recommended"] = {
  plugins: {
    "barrel-boundary": plugin,
  },
  rules: {
    "barrel-boundary/enforce-barrel-files": "error",
  },
};

export = plugin;
