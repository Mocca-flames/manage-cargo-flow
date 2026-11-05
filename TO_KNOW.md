# TO_KNOW.md — facts for future development

Everything here was **verified live** on 2026-11-06 (commands actually run, queries actually returned data). Prefer this file over guesswork. Related docs: `PLAN.md` (full build guide), `FACTS.md` (backend facts).

---

## 1. Deployment (read this first — branch gotcha)

- **Hosting:** Cloudflare Pages, direct upload (no git integration, no auto-deploy on push).
- **Project name:** `cargo-flow-admin` → https://cargo-flow-admin.pages.dev
- **Local git branch is `master`, but the Pages production branch is `main`.**
  Deploying without `--branch=main` silently creates a *preview* deployment that nobody sees.
  ```bash
  npm run build && npm run lint
  npx wrangler pages deploy dist --project-name cargo-flow-admin --branch=main
  ```
- The repo has **no git remote** — commits are local only. Nothing pushes anywhere.
- Production previously served an old vanilla-JS prototype (deployed from commits not in this repo). Replaced by this React app on 2026-11-06.
  Rollback if ever needed: Dashboard → Pages → `cargo-flow-admin` → Deployments → roll back to `dd9b28a2`.
- Commit convention: one commit per phase/feature (`feat: …`, `phase N: …`).

## 2. Cloudflare account

- Account ID: `c6db75b31928013cc078904ec745e788`
- Wrangler auth: OAuth via `npx wrangler whoami` (credentials at `%APPDATA%\xdg.config\.wrangler\config\default.toml`).
  Wrangler is **not** a project dependency — `npx wrangler` downloads it on demand (v4.158 verified).
- Other Pages projects in this account (do not touch by accident): `cargo-flow-africa`, `cargo-flow-africa-bw` (the two public marketing sites), plus `maredi`, `kasigsm`, etc.
- OAuth token works for **local read-only GraphQL queries** but expires — never use it in deployed code.

## 3. Website analytics feature (built 2026-11-06)

### Architecture
```
Home screen (SiteStats.tsx)
   │  GET /api/analytics?site=all|za|bw
   ▼
functions/api/analytics.ts          ← Pages Function (compiled by wrangler automatically)
   │  reads env.CF_API_TOKEN        ← secret, server-side only, never reaches the browser
   ▼
POST https://api.cloudflare.com/client/v4/graphql   (Web Analytics / RUM datasets)
```
- Same-origin → no CORS. The token never ships to the client.
- `_redirects` (`/* /index.html 200`) does **not** shadow the function — Pages Functions run before redirects (verified in CF docs).
- The PWA service worker already excludes `/api/` (`navigateFallbackDenylist` in `vite.config.ts`).

### Files
| File | Purpose |
|---|---|
| `functions/api/analytics.ts` | Pages Function; builds the GraphQL query, zero-fills the 14-day series, maps the response |
| `src/features/home/SiteStats.tsx` | React UI: cards, device split, top countries/pages, sparkline, ZA/BW toggle |
| `src/features/home/home.css` | Styles, `@layer features`, classes prefixed `home-stats__` |
| `tsconfig.app.json` | `include` covers `["src", "functions"]` so `tsc -b` typechecks the function |

### Endpoint contract
- `GET /api/analytics?site=all|za|bw` (default `all`; anything else → 400)
- Response: `{ site, totals: {visits, pageViews}, devices[], countries[], pages[], daily[14] }`
- Counts: `visits` = sessions (`sum.visits`), `pageViews` = `count`. 7-day window for cards, 14 days for the sparkline.
- Caching: function sends `Cache-Control: public, max-age=60`; UI uses react-query `staleTime` 5 min.
- `transport.cargoflowafrica.co.za` is **intentionally excluded** from all host filters (different property).
- apex + `www` of both domains are both included (apex still serves 200 — see HANDOFF.md redirect TODO).

### Secrets
- `CF_API_TOKEN` — read-only API token (Account Analytics: Read), stored as a **Pages secret**:
  ```bash
  npx wrangler pages secret put CF_API_TOKEN --project-name cargo-flow-admin
  ```
- Secrets are **per environment**: production and preview have separate sets. We set production only. A `--branch=master` preview deploy will return `{"error":"CF_API_TOKEN is not configured"}` until you set the secret for preview too.
- Local function testing: put `CF_API_TOKEN=...` in `.dev.vars` (gitignored) and run `npx wrangler pages dev dist`.
- In plain `npm run dev` the stats card shows an error state by design (the Vite `/api` proxy points at the FastAPI backend, which has no such route).
- The token was pasted into a chat session during setup — it is read-only (analytics only). Rotate it in Dashboard → My Profile → API Tokens if you want; update the Pages secret after rotating.

## 4. Cloudflare GraphQL API (verified field reference)

Endpoint: `POST https://api.cloudflare.com/client/v4/graphql` with `Authorization: Bearer <token>`.

Datasets used (all under `viewer { accounts(filter:{accountTag}) { … } }`):

| Dataset | Gives you | Key fields |
|---|---|---|
| `rumPageloadEventsAdaptiveGroups` | visits, page views, breakdowns | `count` (views), `sum { visits }`, dimensions: `date`, `deviceType`, `countryName`, `requestPath`, `requestHost`, `userAgentBrowser`, `userAgentOS`, `refererHost`, `bot` |
| `rumWebVitalsEventsAdaptiveGroups` | Core Web Vitals | quantiles e.g. `largestContentfulPaintP75`, `timeToFirstByteP75`, `interactionToNextPaintP75`, `cumulativeLayoutShiftP75` |
| `rumPerformanceEventsAdaptiveGroups` | load timings | quantiles e.g. `pageLoadTimeP75`, `firstContentfulPaintP75`, `dnsTimeP50`, `tlsTimeP50` |

Rules learned the hard way:
- **Time units for quantiles: microseconds** (e.g. `1912000` = 1.912 s). Negative = no data.
- `orderBy` values: `[sum_visits_DESC]`, `[count_DESC]` (verified).
- Filter bots with `bot: 0` (verified).
- Filter hosts with `requestHost_in: ["www.…", "…"]` (verified) — you do **not** need the `siteTag`.
- One query can return several **aliased** sub-queries (e.g. `totals:`, `devices:`) — each alias groups independently.
- Daily rows come back unordered and skip empty days — sort/zero-fill client-side (the function does this).
- RUM data is **sampled/approximate**; small sites show small numbers. Raw detail ≈ 7 days, history ≈ 6 months.
- Rate limit seen documented: 300 queries / 5 min — irrelevant at this scale.
- Type names for introspection are prefixed `Account…` (e.g. `AccountRumPageloadEventsAdaptiveGroupsQuantiles`). Introspect before adding new metrics instead of guessing field names.
- Data only exists on accounts with the US metadata boundary (default).

## 5. Web Analytics on the public sites

- **Already collecting** for `www` + apex of `.co.za` and `.co.bw` (zone-level injection) — no beacon script exists in `cargoflow-nextjs` and none is needed.
- Earlier plan to add a Cloudflare beacon to the Next.js site is **obsolete**.
- If you ever need site metadata (site_tag etc.): `GET /accounts/{account_id}/rum/site_info/list` — requires an API token (the wrangler OAuth token gets `Authentication error`).

## 6. Verified command cheat-sheet

```bash
# auth / discovery
npx wrangler whoami
npx wrangler pages project list
npx wrangler pages deployment list --project-name cargo-flow-admin

# build & check (must both pass before deploying)
npm run build && npm run lint

# deploy TO PRODUCTION (note --branch=main, see §1)
npx wrangler pages deploy dist --project-name cargo-flow-admin --branch=main

# secrets
npx wrangler pages secret put CF_API_TOKEN --project-name cargo-flow-admin   # prompts / accepts piped stdin

# smoke-test after deploy
curl -s "https://cargo-flow-admin.pages.dev/api/analytics?site=all"
curl -s "https://cargo-flow-admin.pages.dev/api/analytics?site=za"
curl -s -o /dev/null -w "%{http_code}" "https://cargo-flow-admin.pages.dev/companies"   # SPA deep link = 200
```

PowerShell note: when curling the GraphQL API, build the JSON body with `ConvertTo-Json` or a temp file — quoting inline mangles it.

## 7. Auto-refresh & update mechanisms (added 2026-11-06)

Admins must never be stuck on stale data or an old build. Four layers exist — do not remove them:

| Layer | Where | What it does |
|---|---|---|
| Data refetch on focus | `src/lib/queryClient.ts` | `refetchOnWindowFocus: true` — every open screen refetches when the tab regains focus |
| Periodic data refetch | `src/lib/queryClient.ts` | `refetchInterval: 60_000` — all react-query screens refresh every 60 s while visible (`refetchIntervalInBackground: false` pauses when hidden) |
| New-build detection | `src/components/UpdateToast.tsx` | Checks for a new service-worker build every **15 min** and **on tab focus**; shows the "New version ready — reload?" banner |
| Manual refresh | `src/components/AppShell.tsx` topbar **Refresh** button | `queryClient.invalidateQueries()` (all screens) + `registration.update()` (new build check) + toast; shows an error toast when offline |

- Home stats additionally use `staleTime: 30_000` + 60 s interval (`SiteStats.tsx`).
- New deploys are **not** applied silently: `registerType: "prompt"` (vite.config.ts) means the admin must tap **Reload** on the banner — deliberate, so unsaved form edits aren't wiped.
- Deploy → visible to open apps within ≤15 min (or immediately on tab focus) via the update banner.

## 8. Project conventions (from PLAN.md, still binding)

- Plain CSS in `@layer` only; feature CSS prefixed with the feature name; no Tailwind/UI kits.
- No new runtime dependencies without asking. No `any`. No hand-edits to `schema.d.ts` (analytics endpoint is deliberately **outside** the OpenAPI schema — plain `fetch` + react-query).
- All `src/` files must be UTF-8 (PowerShell `Out-File` writes UTF-16 and breaks vite/oxlint).
- Only the auth token may live in `localStorage`.
- Mobile-first: usable at 360 px, touch targets ≥ 44 px (`.tap` token).
- `npm run build` and `npm run lint` must pass with zero errors after every change (pre-existing warnings in `AuthContext.tsx` are known and OK).
