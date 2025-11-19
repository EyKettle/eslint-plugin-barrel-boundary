# eslint-plugin-barrel-boundary

Enforce module boundaries via barrel files.

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

|    | Name          |
| :- | :------------ |
| ✅  | `recommended` |

<!-- end auto-generated configs list -->

## Rules

<!-- begin auto-generated rules list -->

💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                       | Description                                                     | 💼 | 🔧 |
| :--------------------------------------------------------- | :-------------------------------------------------------------- | :- | :- |
| [enforce-barrel-files](docs/rules/enforce-barrel-files.md) | Disallow deep imports from directories that have an index file. | ✅  | 🔧 |

<!-- end auto-generated rules list -->
