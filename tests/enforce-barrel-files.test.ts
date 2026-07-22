/**
 * @fileoverview Tests for the enforce-barrel-files rule.
 * @description Ensures that modules with a barrel file (index.ts/js) are imported via the barrel,
 *              while allowing internal imports and public asset access.
 * @author EyKettle
 */

import { RuleTester } from "eslint";
import path from "path";
import ts from "typescript";
import rule from "../src/rules/enforce-barrel-files";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

const fixturesRoot = path.resolve(__dirname, "fixtures");
/**
 * Helper to generate absolute paths to fixture files.
 * Necessary for the rule to correctly resolve file system checks.
 */
const fixture = (filePath: string) => path.join(fixturesRoot, filePath);

ruleTester.run("enforce-barrel-files", rule, {
  valid: [
    // 1. Normal directory import:
    // Direct import is allowed because 'utils' does not contain an index file.
    {
      code: `import { state } from './state';`,
      filename: fixture("src/utils/consumer.ts"),
    },
    // 2. Barrel import (Implicit):
    // Correctly importing the barrel directory.
    {
      code: `import { item } from './module'`,
      filename: fixture("src/entry.ts"),
    },
    // 3. Barrel import (Explicit):
    // Correctly importing the index file explicitly.
    {
      code: `import { item } from './module/index'`,
      filename: fixture("src/entry.ts"),
    },
    // 4. Barrel internal export:
    // The index file itself is allowed to import/export its children.
    {
      code: `export * from './item'`,
      filename: fixture("src/module/index.ts"),
    },
    // 5. Internal Sibling Import:
    // Files within the same barrel module can import each other directly.
    {
      code: `import { sibling } from './sibling'`,
      filename: fixture("src/module/item.ts"),
    },
    // 6. Alias import (Default behavior):
    // Without 'detectAliases: true', alias paths are ignored by the rule.
    {
      code: `import { item } from '@/module/item'`,
      filename: fixture("src/entry.ts"),
    },
    // 7. Public Assets:
    // Importing assets from a directory without a barrel file is allowed.
    {
      code: `import './assets/public.css';`,
      filename: fixture("src/entry.ts"),
    },
    // 8. Internal Asset Import:
    // The barrel file importing its own private assets.
    {
      code: `import './style.css';`,
      filename: fixture("src/module/index.ts"),
    },
    // 9. Nested Internal Asset Import:
    // A nested component importing its own private asset.
    {
      code: `import './comp.css';`,
      filename: fixture("src/module/subModule/subItem.ts"),
    },

    // 10. Internal sub-barrel import from sibling:
    // Sibling file inside the same module importing the sub-barrel directory is valid.
    {
      code: `import { sub } from './subModule'`,
      filename: fixture("src/module/item.ts"),
    },
    // 11. Internal sub-barrel file import from sibling (explicit barrel):
    // Importing the sub-barrel's index file from a sibling inside the same module.
    {
      code: `import { sub } from './subModule/index'`,
      filename: fixture("src/module/item.ts"),
    },
    // 12. Non-nested module barrel import from outside:
    // Barreled module that is NOT nested inside another barrel.
    {
      code: `import { item } from './notModule/module'`,
      filename: fixture("src/entry.ts"),
    },
    // 13. Internal file accessing immediate sub-barrel directory:
    {
      code: `import { sub } from './subModule'`,
      filename: fixture("src/module/entry.ts"),
    },
    // 14. Internal file accessing immediate sub-barrel explicitly:
    {
      code: `import { sub } from './subModule/index'`,
      filename: fixture("src/module/entry.ts"),
    },
    // 15. Internal file accessing sibling:
    // Normal intra-module reference that doesn't cross any barrel boundary.
    {
      code: `import { sibling } from './sibling'`,
      filename: fixture("src/module/entry.ts"),
    },
  ],

  invalid: [
    // 1. Basic Deep Import Violation:
    // Importing 'item' directly when 'module' has an index file.
    {
      code: `import { something } from './module/item'`,
      filename: fixture("src/entry.ts"),
      output: `import { something } from './module'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: { directory: "./module", importPath: "./module/item" },
        },
      ],
    },
    // 2. Quote Style Preservation:
    // Ensures the fixer respects the original double quotes.
    {
      code: `import { something } from "./module/item"`,
      filename: fixture("src/entry.ts"),
      output: `import { something } from "./module"`,
      errors: [{ messageId: "noDeepImport" }],
    },
    // 3. Nested Barrel Violation:
    // Should suggest importing the outermost barrel (module) instead of the nested barrel (subModule).
    {
      code: `import { sub } from './module/subModule/subItem'`,
      filename: fixture("src/entry.ts"),
      output: `import { sub } from './module'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module",
            importPath: "./module/subModule/subItem",
          },
        },
      ],
    },
    // 4. Parent Directory Navigation:
    // Deep importing via relative parent paths should be corrected.
    {
      code: `import { item } from '../module/item'`,
      filename: fixture("src/utils/state.ts"),
      output: `import { item } from '../module'`,
      errors: [{ messageId: "noDeepImport" }],
    },

    // 5. Protected Asset Violation:
    // Trying to bypass the module boundary to access a private CSS file.
    {
      code: `import './module/style.css';`,
      filename: fixture("src/entry.ts"),
      output: `import './module';`, // Suggests importing through the module entry point
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module",
            importPath: "./module/style.css",
          },
        },
      ],
    },
    // 6. Nested Protected Asset Violation:
    // Trying to access a private asset inside a nested submodule should use outermost barrel.
    {
      code: `import './module/subModule/comp.css';`,
      filename: fixture("src/entry.ts"),
      output: `import './module';`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module",
            importPath: "./module/subModule/comp.css",
          },
        },
      ],
    },

    // 7. Nested Barrel Directory Import from Outside:
    // External file importing a nested barrel directory should use outermost.
    {
      code: `import { sub } from './module/subModule'`,
      filename: fixture("src/entry.ts"),
      output: `import { sub } from './module'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module",
            importPath: "./module/subModule",
          },
        },
      ],
    },
    // 8. Nested Barrel Explicit File Import from Outside:
    // External file importing a nested barrel's index file directly.
    {
      code: `import { sub } from './module/subModule/index'`,
      filename: fixture("src/entry.ts"),
      output: `import { sub } from './module'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module",
            importPath: "./module/subModule/index",
          },
        },
      ],
    },
    // 9. Standalone Module Import (not nested) is Still Correct:
    // External file importing a non-nested module's deep file.
    {
      code: `import { item } from './module/item'`,
      filename: fixture("src/entry.ts"),
      output: `import { item } from './module'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: { directory: "./module", importPath: "./module/item" },
        },
      ],
    },
    // 10. Internal deep file import from sub-barrel:
    // File inside module importing a deep file from the sub-barrel should suggest the sub-barrel.
    {
      code: `import { sub } from './subModule/subItem'`,
      filename: fixture("src/module/item.ts"),
      output: `import { sub } from './subModule'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./subModule",
            importPath: "./subModule/subItem",
          },
        },
      ],
    },
  ],
});

// Test suite for 'detectAliases' option
ruleTester.run("enforce-barrel-files (with aliases)", rule, {
  valid: [
    // Valid usage of alias pointing to the barrel
    {
      code: `import { item } from '@/module'`,
      filename: fixture("src/entry.ts"),
      options: [{ detectAliases: true }],
    },
  ],
  invalid: [
    // Deep import using alias should be caught when option is enabled
    {
      code: `import { item } from '@/module/item'`,
      filename: fixture("src/entry.ts"),
      options: [{ detectAliases: true }],
      output: `import { item } from '@/module'`,
      errors: [{ messageId: "noDeepImport" }],
    },
  ],
});

// ============================================================
// Nodenext / Node16 moduleResolution tests
// Auto-fix produces extensioned paths (`./module/index.js`) when
// the nearest tsconfig.json declares moduleResolution:
//   "nodenext" or "node16".
// ============================================================

ruleTester.run("enforce-barrel-files (nodenext moduleResolution)", rule, {
  valid: [
    // Barrel directory import: allowed because the target is a barrel
    {
      code: `import { item } from './module'`,
      filename: fixture("nodenext/src/entry.ts"),
    },
    // Explicit index import: allowed because it directly specifies the barrel file
    {
      code: `import { item } from './module/index'`,
      filename: fixture("nodenext/src/entry.ts"),
    },
    // Internal sibling import: allowed because the importing file is inside the module
    {
      code: `import { item } from './item'`,
      filename: fixture("nodenext/src/module/index.ts"),
    },
  ],
  invalid: [
    // Deep import: auto-fix appends /index.js for nodenext resolution
    {
      code: `import { something } from './module/item'`,
      filename: fixture("nodenext/src/entry.ts"),
      output: `import { something } from './module/index.js'`,
      errors: [{
        messageId: "noDeepImport",
        data: { directory: "./module/index.js", importPath: "./module/item" },
      }],
    },
    // Double-quote import: auto-fix preserves the original quote style
    {
      code: `import { something } from "./module/item"`,
      filename: fixture("nodenext/src/entry.ts"),
      output: `import { something } from "./module/index.js"`,
      errors: [{ messageId: "noDeepImport" }],
    },
    // .js-suffixed deep import: nodenext projects import .ts sources via .js specifiers
    {
      code: `import { something } from './module/item.js'`,
      filename: fixture("nodenext/src/entry.ts"),
      output: `import { something } from './module/index.js'`,
      errors: [{
        messageId: "noDeepImport",
        data: { directory: "./module/index.js", importPath: "./module/item.js" },
      }],
    },
    // nodenext auto-detection takes priority over user-set barrelPattern
    {
      code: `import { something } from './module/item'`,
      filename: fixture("nodenext/src/entry.ts"),
      options: [{ barrelPattern: "/index" }],
      output: `import { something } from './module/index.js'`,
      errors: [{
        messageId: "noDeepImport",
        data: { directory: "./module/index.js", importPath: "./module/item" },
      }],
    },
  ],
});

ruleTester.run("enforce-barrel-files (node16 moduleResolution)", rule, {
  valid: [
    // Barrel directory import: allowed in node16 resolution
    {
      code: `import { item } from './module'`,
      filename: fixture("node16/src/entry.ts"),
    },
  ],
  invalid: [
    // Deep import: auto-fix appends /index.js for node16 resolution
    {
      code: `import { something } from './module/item'`,
      filename: fixture("node16/src/entry.ts"),
      output: `import { something } from './module/index.js'`,
      errors: [{
        messageId: "noDeepImport",
        data: { directory: "./module/index.js", importPath: "./module/item" },
      }],
    },
  ],
});

// ============================================================
// Fixture tsconfig validity verification
// Ensures each fixture's tsconfig.json is a valid configuration.
// ============================================================

describe("Fixture tsconfig validity", () => {
  const fixturesRoot = path.resolve(__dirname, "fixtures");

  for (const name of ["nodenext", "node16"]) {
    it(`${name} tsconfig.json is valid`, () => {
      const tsconfigPath = path.join(fixturesRoot, name, "tsconfig.json");

      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      if (configFile.error) {
        throw new Error(
          ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"),
        );
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(tsconfigPath),
        {},
        tsconfigPath,
      );
      if (parsedConfig.errors && parsedConfig.errors.length > 0) {
        const messages = parsedConfig.errors
          .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
          .join("\n\n");
        throw new Error(`tsconfig.json validation failed:\n${messages}`);
      }
    });
  }
});
