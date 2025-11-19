# Disallow deep imports from directories that have an index file (`barrel-boundary/enforce-barrel-files`)

💼 This rule is enabled in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Ensures that modules with a barrel file (e.g., `index.ts`) are imported via the barrel file, enforcing strict module boundaries. This prevents "deep imports" which can lead to tight coupling and leaking of internal implementation details.

## Rule Details

This rule looks for imports that bypass a directory's `index` file.

### ❌ Incorrect

Given a directory structure:
```text
src/
  module/
    index.ts
    item.ts
```

```ts
import { item } from './module/item'; // Error: Deep import detected
import './module/item';               // Error: Deep side-effect import
```

### ✅ Correct

```ts
import { item } from './module';       // Correct: Imported via barrel
import { item } from './module/index'; // Correct: Explicit index import
```

## Options

This rule has an object option:

*   `detectAliases`: `boolean` (default: `false`) - If `true`, the rule will attempt to resolve paths defined in `tsconfig.json` `compilerOptions.paths`.

### detectAliases

If you use path aliases (e.g., `@/components/...`), enable this option.

```json
{
  "rules": {
    "barrel-boundary/enforce-barrel-files": ["error", { "detectAliases": true }]
  }
}
```

## When Not To Use It

If your project does not use the "barrel file" pattern (exporting modules via `index.ts`), or if you intentionally allow deep linking into modules everywhere, you can disable this rule.
