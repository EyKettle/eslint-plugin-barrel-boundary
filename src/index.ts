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
  configs: {
    recommended: {
      plugins: ["barrel-boundary"],
      rules: {
        "barrel-boundary/enforce-barrel-files": "error",
      },
    },
  },
};

export = plugin;
