# CargoFlow Africa Manage

## Project facts

- Production API: `https://api.cargoflowafrica.co.za`
- Hosting target: Cloudflare Pages via Wrangler, using a `.pages.dev` domain or equivalent Cloudflare project domain
- Brand palette tokens:
  - `--color-canvas: #f8f4eb`
  - `--color-canvas-alt: #e8d8b9`
  - `--color-ink: #12382f`
  - `--color-ink-muted: #3d5449`
  - `--color-accent-gold: #d4a44c`
  - `--color-accent-terracotta: #b9623e`
  - `--color-surface: #ffffff`
  - `--color-border: #dccba9`

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
