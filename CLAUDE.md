# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

This repo is a single frontend app at the repo root.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then production-build with Vite (output in `dist/`)
- `npm run preview` — preview the production build locally
- `npm run lint` — run Oxlint

There is no test runner configured yet.

## Architecture

- **Stack**: React 19 + TypeScript, built with Vite 8, using `@vitejs/plugin-react` (Oxc-based Fast Refresh).
- **Linting**: Oxlint (not ESLint) configured via `.oxlintrc.json`, currently with plugins `react`, `typescript`, `oxc` and rules for `react/rules-of-hooks` and `react/only-export-components`. Type-aware linting is not yet enabled (would require `oxlint-tsgolint` and `"options": { "typeAware": true }` in that config).
- **TypeScript project structure**: split config via `tsconfig.json` (solution file) referencing `tsconfig.app.json` (app source) and `tsconfig.node.json` (Vite config/tooling) — standard Vite `react-ts` template layout.
- **Entry point**: `src/main.tsx` mounts `App` into `index.html`'s `#root`.
- **UI**: shadcn/ui (`base-nova` style) on top of `@base-ui/react` primitives (not Radix), Tailwind v4, `react-router-dom` for routing.
- **Auth/theme/product state**: lightweight React context providers in `src/lib/` (`auth.tsx`, `theme.tsx`, `products.tsx`), each backed by `localStorage` — no backend yet.
