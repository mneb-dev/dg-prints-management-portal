# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

This repo is a single frontend app at the repo root (`dg-prints-management-portal`). It talks to the sibling
`dg-prints-management-server` repo (Express + Supabase) over HTTP — see that repo's own CLAUDE.md for the API side.

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
- **Entry point**: `src/main.tsx` mounts `App` into `index.html`'s `#root`. `App.tsx` defines all routes with `react-router-dom`; authenticated pages render inside `AppLayout` behind `ProtectedRoute`, `/login` is wrapped in `PublicOnlyRoute` (see `src/lib/route-guards.tsx`).
- **UI**: shadcn/ui (`base-nova` style) on top of `@base-ui/react` primitives (**not** Radix — see `.agents/skills/shadcn/rules/base-vs-radix.md` and the `migrate-radix-to-base` skill before using Radix-style APIs), Tailwind v4.

### State management: Redux Toolkit behind hook facades

Global state lives in a Redux Toolkit store (`src/lib/store.ts`) with one slice per domain: `auth-slice.ts`,
`theme-slice.ts`, `products-slice.ts`, `orders-slice.ts`. Components never import the slices or `useAppSelector`/
`useAppDispatch` (`src/lib/hooks.ts`) directly — each domain has a same-named `.tsx` facade file
(`auth.tsx`, `theme.tsx`, `products.tsx`, `orders.tsx`) that re-exports the slice's types/constants and exposes a
single hook (`useAuth`, `useTheme`, `useProducts`, `useOrders`). Always go through the facade, and add new
domain types/constants to the slice, re-exporting them from the facade rather than duplicating them.

- **Persistence**: `src/lib/persist-subscribe.ts` subscribes to the store and mirrors `auth`, `theme`, and
  `orders` state to `localStorage` on every change (there is no `redux-persist`; it's a hand-rolled subscriber).
  `products` is deliberately excluded — it's server-backed, not persisted locally.
- **Products are wired to the real backend**: `useProducts` dispatches async thunks (`fetchProductsThunk`,
  `createProductThunk`, etc.) in `products-slice.ts` that call `apiClient` (`src/lib/api-client.ts`, an axios
  instance pointed at `VITE_API_BASE_URL`, default `http://localhost:3000/api`) against the Express server.
- **Auth is still mocked**: `useAuth().login` in `auth.tsx` accepts any non-empty username/password and just
  flips `isAuthenticated` — there is no real credential check or backend auth call yet.
- **Orders are still local-only**: `orders-slice.ts` holds full CRUD in Redux with no backend calls; order IDs
  and order numbers are generated client-side (`nextOrderNumber` in `orders.tsx`).

### Pricing and order domain logic

- `src/lib/pricing-resolver.ts` decides, given a product and the option values a user picked, whether pricing is
  a manual package choice (`kind: "package"`, multiple same-type candidates), an automatically resolved single
  entry (`kind: "auto"`), or unresolvable (`kind: "none"`), and computes line totals per `pricingType`
  (`Package` / `Per Unit` / `Fixed` / `Manual`). `Per Unit` multiplies by `width * height` when both are set
  (see `showsDimensionInputs`, which drives whether dimension inputs show for `sq.ft.`-unit pricing).
- `src/lib/order-status.ts` defines the status flow per `ProductCategory` and which statuses are terminal/refundable.
- `src/lib/sticker-quotation.ts` and `src/lib/length-units.ts` support sticker-specific quoting math in the order form.
