# eslint-plugin-barrel-boundary

[![npm version](https://img.shields.io/npm/v/eslint-plugin-barrel-boundary.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-barrel-boundary)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-barrel-boundary.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-barrel-boundary)
[![License](https://img.shields.io/npm/l/eslint-plugin-barrel-boundary.svg?style=flat-square)](./LICENSE)

Enforce module boundaries via barrel files.

## Why use this?

Stop "spaghetti imports" and enforce clean module boundaries!

Instead of reaching deep into the internal structure of a directory:

```typescript
// ❌ Bad: Leaking internal implementation details
import { SmallConfirm } from "../popup/types/smallConfirm";
import { usePopup } from "../popup/context";
```

Enforce importing from the barrel file (`index.ts`) acting as the public API:

```typescript
// ✅ Good: Clean module boundary
import { SmallConfirm, usePopup } from "../popup";
```

This plugin automatically detects if a directory has an `index` file and enforces usage of it, keeping your project structure clean and refactor-friendly.

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-barrel-boundary`:

```sh
npm install eslint-plugin-barrel-boundary --save-dev
```

## Usage

### Flat Config (ESLint v9.x)

In your `eslint.config.js` (or `.mjs`), import the plugin and use the recommended configuration.

```javascript
import barrelBoundary from "eslint-plugin-barrel-boundary";

export default [
  // 1. Use the recommended configuration (Recommended)
  barrelBoundary.configs.recommended,

  // 2. Custom Configuration (Optional)
  // If you need to customize options (e.g., support path aliases like "@/components")
  // `detectAliases` defaults to `false`.
  {
    rules: {
      "barrel-boundary/enforce-barrel-files": [
        "error",
        {
          detectAliases: true,
        },
      ],
    },
  },
];
```

### Legacy Config (.eslintrc)

If you are still using the legacy configuration format:

```json
{
  "plugins": ["barrel-boundary"],
  "extends": ["plugin:barrel-boundary/recommended"],
  "rules": {
    // Optional: Override defaults
    "barrel-boundary/enforce-barrel-files": ["error", { "detectAliases": true }]
  }
}
```

## Configurations

<!-- begin auto-generated configs list -->

|     | Name          |
| :-- | :------------ |
| ✅  | `recommended` |

<!-- end auto-generated configs list -->

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                       | Description                                                     | 💼  | 🔧  |
| :--------------------------------------------------------- | :-------------------------------------------------------------- | :-- | :-- |
| [enforce-barrel-files](docs/rules/enforce-barrel-files.md) | Disallow deep imports from directories that have an index file. | ✅  | 🔧  |

<!-- end auto-generated rules list -->
