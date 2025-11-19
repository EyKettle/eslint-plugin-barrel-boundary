/**
 * @fileoverview Tests for the enforce-barrel-files rule.
 * @description Ensures that modules with a barrel file (index.ts/js) are imported via the barrel,
 *              while allowing internal imports and public asset access.
 * @author EyKettle
 */

import { RuleTester } from "eslint";
import path from "path";
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
    // Should suggest importing the nearest barrel (subModule) instead of the file (subItem).
    {
      code: `import { sub } from './module/subModule/subItem'`,
      filename: fixture("src/entry.ts"),
      output: `import { sub } from './module/subModule'`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module/subModule",
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
    // Trying to access a private asset inside a nested submodule.
    {
      code: `import './module/subModule/comp.css';`,
      filename: fixture("src/entry.ts"),
      output: `import './module/subModule';`,
      errors: [
        {
          messageId: "noDeepImport",
          data: {
            directory: "./module/subModule",
            importPath: "./module/subModule/comp.css",
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
