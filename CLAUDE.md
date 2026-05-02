# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # ng serve — dev server on http://localhost:4200, host 0.0.0.0
npm run build      # ng build — production build → dist/
npm run watch      # ng build --watch --configuration development
npm test           # ng test — Vitest under @angular/build:unit-test
```

Run a single test file: `npx vitest run src/app/path/to/file.spec.ts`. Vitest globals are enabled via `tsconfig.spec.json` (`types: ["vitest/globals"]`), so `describe`/`it`/`expect` are available without imports.

The dev server proxies `/api` to `http://localhost:8081` via `proxy.conf.json`. The backend is a separate repo (`../profitx-backend`) — start it before exercising any auth or business flow. `.trycloudflare.com` hosts are pre-allowed for tunneling.

## Architecture

**ProfitX** is an Angular 21 standalone-components SPA for managing multiple small businesses. A user can own/admin/work in several businesses; each business has products, sales, expenses, members, metrics, and an audit log.

### Three-layout routing

`src/app/app.routes.ts` mounts three distinct layouts, and the layout you're under tells you what role context applies:

| Route prefix | Layout | Purpose |
|---|---|---|
| `/` | `AuthLayout` | Landing / login / register / forgot-password |
| `/app/bussines/...` | `MainLayout` | Cross-business admin: list, create, edit businesses |
| `/dashboard/...` | `Business` | **Operational** dashboard for the currently-selected business: products, sale, sales, members, expenses, metrics, audit |

`/dashboard/...` routes do **not** carry the business ID in the URL. Instead, the active business ID lives in `localStorage` under `currentBusinessId`, and the role lives in a signal in `BusinessContextService`. Operational pages read `localStorage.getItem('currentBusinessId')` in `ngOnInit` and pass it to feature services. When adding a new dashboard page, follow the same pattern (see `features/business/pages/products/products.ts` for the canonical example) — don't add a route param.

All components are standalone (no NgModules). Lazy loading uses `loadComponent: () => import(...)` — keep that pattern when adding routes.

### Auth: cookie session + refresh + countdown

Auth is **cookie-based, not bearer-token-based**. `src/app/interceptors/auth-interceptor.ts`:

- Adds `withCredentials: true` and `X-Requested-With: XMLHttpRequest` (anti-CSRF) to every request hitting the backend.
- Skips refresh logic for `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`.
- On `401`, calls `AuthService.refreshToken()` once (guarded by a module-level `isRefreshing` flag), restarts `TokenTimerService` with the new `expiresIn`, and retries the original request. On refresh failure, it logs out and redirects to `/?reason=expired`.

`TokenTimerService` (signal-based) drives the visible countdown rendered by the root component (`<app-token-countdown>`), and persists the absolute expiry timestamp in `localStorage.tokenExpiry` so the timer survives a page reload. When it hits zero it emits on `expired$`, which `App` subscribes to and triggers logout.

`BusinessContextService` exposes a `role` signal (`OWNER | ADMIN | EMPLOYEE | null`) used by templates to gate UI (e.g. `context.role() === 'OWNER'`). It also owns the `currentBusinessId` localStorage key — clear it via `context.clear()`, which `AuthService.logout()` already does.

When implementing a feature that touches role-gated actions, prefer reading `BusinessContextService.role()` in the component over re-fetching membership.

### API base URL is resolved at runtime

`src/environments/environment.ts` reads `apiUrl` from `(window as any).__env?.['API_URL']`, falling back to `http://localhost:8081`. The `__env` object is populated by `assets/env.js`, which is generated at container start by `docker-entrypoint.sh`:

```sh
API_URL=${API_URL:-http://localhost:8081}
# writes window.__env.API_URL into /usr/share/nginx/html/assets/env.js
```

This means the **same production bundle works against any backend URL** — set the `API_URL` env var when running the container, no rebuild needed. The same `environment.ts` file is used in both dev and prod builds (the `fileReplacements` entry in `angular.json` swaps to `environment.prod.ts`, which today is identical). When a service builds an endpoint URL, do `${environment.apiUrl}/api/...` — never hardcode `http://localhost:8081`.

In dev, `environment.apiUrl` resolves to `http://localhost:8081` directly, so the proxy's `/api` rewrite is mostly relevant when serving the built artifact. In the interceptor specifically, an empty `apiUrl` falls back to `window.location.origin` so a same-origin proxy works seamlessly.

### API conventions

All endpoints are under `${apiUrl}/api`. Business-scoped resources nest under `/api/businesses/{businessId}/{products|sales|expenses|members|metrics|audit-logs}`. Image uploads use multipart `FormData` against `POST .../products` and a separate `PUT .../products/{id}/image` for replacement (same pattern for businesses). Member role updates use `PATCH /businesses/{id}/members/{membershipId}/role`.

Services live in two places by intent:
- `features/business/services/` — per-business resources (`ProductService`, `SaleService`, `MembershipService`, `ExpenseService`, `MetricsService`, `AuditLogService`).
- `shared/services/` — cross-cutting (`BusinessService`, `UserService`, `BusinessContextService`, `TokenTimerService`, `ExportService`, `ImportService`, `ConfirmDialogService`).

### Import / Export pipeline

`shared/services/export.service.ts` and `shared/services/import.service.ts` provide CSV / XLSX / PDF export and CSV / XLSX import for products, sales, and expenses, plus pre-formatted Spanish-language template downloads. Column header constants (`PRODUCT_COLS`, `SALE_COLS`, `EXPENSE_COLS`) are the contract — if you change a header here, update the matching template and the validator in lockstep. Import previews go through `shared/components/import-preview-dialog`.

Sales import groups rows by a `Venta #` column so a single import can create multiple multi-line sales; rows with no group key become individual sales (`__auto_N`).

### UI stack

- **Angular Material 21** is the component library (Mat dialogs, snack bars, form fields, etc. are used throughout). Angular CDK is also a direct dependency.
- **Chart.js 4** powers the metrics screen.
- **jsPDF + jspdf-autotable** for PDF export, **xlsx** for spreadsheets, **papaparse** for CSV (note: `papaparse` is whitelisted in `allowedCommonJsDependencies`).
- Theming via `mat.theme()` in `src/styles.scss` with palettes from `_theme-colors.scss`. The body uses `color-scheme: light dark` (auto), and several global `.text-field` overrides exist for the rounded/neumorphic input look.

### TypeScript / Angular strict settings

`tsconfig.json` enables `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, plus Angular's `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`. Bracket-access (`row['Nombre']`) is required for index-signature reads — the import service uses this pattern intentionally.

### Build & deployment

- Production budget: 800 kB warning / 2 MB error initial bundle; 4 kB / 8 kB per component style.
- `vercel.json` rewrites all paths to `/index.html` for SPA fallback (Vercel deployment).
- For containerized deployment, `docker-entrypoint.sh` is the nginx entrypoint and must run before nginx so `assets/env.js` exists at request time.
- SSR/hydration: `provideClientHydration(withEventReplay())` is wired in `app.config.ts`, and `@angular/platform-server` + `express` are installed — but there is currently no SSR build target in `angular.json`. Treat the app as a CSR SPA with hydration enabled for now.

### Code style

Prettier config lives in `package.json`: 100-char width, single quotes, Angular HTML parser. Component selectors use the `app-` prefix (`angular.json` → `prefix: "app"`). Component styles are SCSS by schematic default.

## Notes for future edits

- A stale local copy of this file exists at `.md/CLAUDE.md` (gitignored). It documents an earlier Bearer-token auth model that no longer matches the code — ignore it. If you update guidance, update **this** file at the repo root.
- There are no Cursor rules or Copilot instructions in this repo.
