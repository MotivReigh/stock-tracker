# Updraft — Trend Spotter & Stock Tracker · MVP Plan

## 1. Goal

Build a personal web app that scans the US $2B+ stock universe in real time, surfaces emerging momentum at three distinct trend stages (pre-breakout, just-broke-out, established trend), and lets me monitor and journal trades while the trend runs — so I can catch the next NVIDIA/Micron move early and ride it confidently.

## 2. Context

Greenfield project at `/Users/reighlan/projects/stock-tracker` (`main` branch, clean).

### External references
- Finnhub API docs (free tier: 60 calls/min, US stocks, some delayed endpoints)
- Lightweight Charts (TradingView's free chart library)
- Supabase Postgres docs
- shadcn/ui component library
- Web Push API + VAPID keys
- Slack incoming webhooks + Block Kit
- Vercel Cron + middleware-based password gate

### Decisions captured
- Holding: mix of swing (2–10d) + position (weeks–months)
- Universe: US stocks only, $2B+ market cap
- Top signals: breakouts, volume surge, relative strength, MA alignment, % change 1d/1w/1m/3m
- Stages: separate scans for pre-breakout, just-broke-out, established trend
- Charts: Lightweight Charts in-app + "Open in TradingView" deep link
- Watchlists: unlimited named lists
- **Alerts: Web Push + Slack incoming webhook + dashboard badges. SMS adapter stubbed for post-MVP. (Email/Resend dropped.)**
- Journal: simple notes per ticker (no P&L math)
- Scans: 10 presets + form-based custom builder
- News: per-stock + global watchlist feed
- Hosting: Vercel with password gate
- DB: Supabase Postgres; **all tables prefixed `updraft_` so this project can share a database with other apps without collision**
- Mobile: equal-priority, must work great on phone
- Aesthetic: light-mode primary with dark toggle, hybrid dense + clean
- Win: replaces my daily screening routine AND catches at least one big move I'd have missed

### CUJ documents (read first when planning UI work)
- [docs/cujs/dashboard-trend-spotting.md](cujs/dashboard-trend-spotting.md)
- [docs/cujs/running-a-scan.md](cujs/running-a-scan.md)
- [docs/cujs/custom-scan-builder.md](cujs/custom-scan-builder.md)
- [docs/cujs/setting-up-alerts.md](cujs/setting-up-alerts.md)
- [docs/cujs/journal-entry-flow.md](cujs/journal-entry-flow.md)

## 3. Architectural Impact

### DB changes (Supabase Postgres) — all tables prefixed `updraft_`

| Table | Columns (key fields) |
|---|---|
| `updraft_users` | id, email, created_at — single account, auth-ready |
| `updraft_settings` | user_id, slack_webhook_url, push_enabled, slack_enabled, sms_enabled, theme |
| `updraft_watchlists` | id, user_id, name, sort_index, created_at |
| `updraft_watchlist_items` | watchlist_id, symbol, added_at |
| `updraft_scans` | id, user_id, name, type ('preset' \| 'custom'), definition jsonb, enabled |
| `updraft_scan_results` | id, scan_id, symbol, triggered_at, snapshot jsonb, seen_at |
| `updraft_alerts` | id, scan_result_id, channels text[], fired_at, delivered_at, error |
| `updraft_journal_notes` | id, user_id, symbol, body, created_at, updated_at |
| `updraft_universe` | symbol PK, name, sector, industry, market_cap, last_refreshed |
| `updraft_quote_cache` | symbol PK, payload jsonb, fetched_at — Postgres fallback when Redis cold |
| `updraft_daily_bars` | symbol, date, open, high, low, close, volume — composite PK |
| `updraft_push_subscriptions` | id, user_id, endpoint, keys jsonb, created_at |

### Infrastructure
- Vercel deployment with password gate (basic-auth in `middleware.ts`)
- Vercel Cron jobs:
  - **Universe refresh** — weekly (Sun 00:00 UTC)
  - **Watchlist + scan-result quote refresh** — every 1 min during market hours
  - **Full universe quote refresh** — every 10 min during market hours
  - **Scan runner** — every 10 min during market hours
  - **Alerts dispatcher** — every 1 min
- Upstash Redis (free tier) — hot cache, protects Finnhub 60 req/min limit
- **Slack: incoming webhook URL stored per-user in `updraft_settings.slack_webhook_url`. Block Kit message format. Test button on settings page. Upgrade path: full Slack app for richer interactions (post-MVP).**
- Web Push (VAPID keys in env, subscriptions in `updraft_push_subscriptions`)
- SMS adapter: Twilio-shaped interface, no-op implementation for MVP

### Backend (Next.js Route Handlers)
- `/api/quote/[symbol]`, `/api/candles/[symbol]`, `/api/profile/[symbol]`
- `/api/news/[symbol]`, `/api/news/watchlist`
- `/api/sectors` (sector strength via sector ETFs)
- `/api/scans` (CRUD), `/api/scans/[id]`, `/api/scans/run/[id]`, `/api/scans/results/[id]`
- `/api/watchlists` (CRUD), `/api/watchlists/[id]`
- `/api/journal` (CRUD), `/api/journal/[symbol]`
- `/api/alerts/subscribe-push`, `/api/alerts/test-slack`, `/api/alerts/test-push`
- `/api/settings`
- `/api/cron/seed-universe`, `/api/cron/refresh-quotes`, `/api/cron/run-scans`, `/api/cron/dispatch-alerts` (all guarded by `Authorization: Bearer $CRON_SECRET`)

### Frontend (Next.js 15 App Router)
- Routes: `/` (dashboard), `/scans`, `/scans/[id]`, `/scans/builder`, `/stock/[symbol]`, `/watchlists`, `/journal`, `/sectors`, `/settings`, `/login`
- Layout: top nav + collapsible sidebar (mobile drawer), light/dark toggle, ⌘K command palette
- Components: MoverList, SectorHeatmap, ScanResultsTable, StockCard, ChartPanel (Lightweight Charts), NewsFeed, AlertsBell, ScanBuilder, JournalEditor

## 4. Affected Files (initial scaffold)

```
package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.mjs
middleware.ts                                # password gate
app/
  layout.tsx, globals.css, page.tsx
  login/page.tsx
  scans/page.tsx, scans/[id]/page.tsx, scans/builder/page.tsx
  stock/[symbol]/page.tsx
  watchlists/page.tsx
  journal/page.tsx
  sectors/page.tsx
  settings/page.tsx
  api/
    quote/[symbol]/route.ts
    candles/[symbol]/route.ts
    profile/[symbol]/route.ts
    news/[symbol]/route.ts, news/watchlist/route.ts
    sectors/route.ts
    scans/route.ts, scans/[id]/route.ts, scans/run/[id]/route.ts, scans/results/[id]/route.ts
    watchlists/route.ts, watchlists/[id]/route.ts
    journal/route.ts, journal/[symbol]/route.ts
    alerts/subscribe-push/route.ts, alerts/test-slack/route.ts, alerts/test-push/route.ts
    settings/route.ts
    cron/seed-universe/route.ts, cron/refresh-quotes/route.ts, cron/run-scans/route.ts, cron/dispatch-alerts/route.ts
components/
  ui/*                                       # shadcn primitives
  layout/{TopNav,SideNav,MobileDrawer,ThemeToggle,SearchPalette}.tsx
  dashboard/{TopStrip,MoverList,SectorHeatmap,WatchlistPanel,AlertsPanel,NewsFeed,TrendStageCards}.tsx
  charts/PriceChart.tsx
  scans/{ScanBuilder,ScanResultsTable,PresetCards}.tsx
  stock/{StockHeader,KeyStats,JournalNotes}.tsx
  settings/{SlackSetup,PushSetup,SmsSetup}.tsx
lib/
  finnhub/{client,quote,candles,profile,news,sectors}.ts
  cache/{redis,quoteCache}.ts
  scans/{engine,signals,presets}.ts
  db/{client,schema,tables}.ts               # tables.ts exports prefixed names
  alerts/{push,slack,sms,dispatcher}.ts
  market/{session,universe,calendar}.ts
supabase/migrations/0001_init.sql            # creates all updraft_* tables
docs/cujs/{dashboard-trend-spotting,running-a-scan,custom-scan-builder,setting-up-alerts,journal-entry-flow}.md
tests/
  unit/lib/scans/signals/*.test.ts
  unit/lib/cache/*.test.ts
  unit/lib/finnhub/*.test.ts
  unit/lib/alerts/*.test.ts
  integration/scan-engine.test.ts
  integration/api/*.test.ts
  e2e/cuj-1-dashboard.spec.ts
  e2e/cuj-2-running-a-scan.spec.ts
  e2e/cuj-3-custom-scan-builder.spec.ts
  e2e/cuj-4-alerts.spec.ts
  e2e/cuj-5-journal.spec.ts
  fixtures/bars/*.json
```

## 5. Approach (sequential phases)

### Phase 1 — Foundation
1. Initialize Next.js 15 + TypeScript + Tailwind + shadcn/ui
2. Install deps: `@supabase/supabase-js`, `@upstash/redis`, `lightweight-charts`, `zod`, `date-fns`, `lucide-react`, `next-themes`, `web-push`, `vitest`, `@playwright/test`
3. Build app shell: top nav + responsive sidebar + mobile drawer + theme toggle (light default)
4. Password gate middleware
5. Settings page skeleton

### Phase 2 — Data layer
6. Finnhub client with rate-limit-aware fetcher (token bucket, 60 req/min cap)
7. Redis cache wrapper with TTL by data type (quotes 30s, profiles 24h, news 15m, sectors 30m)
8. Supabase schema + migration `0001_init.sql` (all `updraft_*` tables)
9. `lib/db/tables.ts` exports table-name constants
10. Universe seeder → fills `updraft_universe` with US $2B+ stocks

### Phase 3 — Dashboard
11. Quote / candles / profile / news / sectors API routes
12. Dashboard page with: top strip, top movers, sector heat, watchlist preview, alerts panel, trend-stage cards, news feed

### Phase 4 — Stock detail
13. `/stock/[symbol]`: header, Lightweight Chart with timeframe + MA toggles, key stats, news, "Open in TradingView" link, journal notes editor

### Phase 5 — Watchlists
14. CRUD UI for unlimited named watchlists; "Add to watchlist" affordance from any stock card

### Phase 6 — Scans
15. Signal computation library: pctChange, relativeVolume, maAligned, breakoutNDayHigh, breakout52WeekHigh, relativeStrength, rsi, macd, tightConsolidation, volumeDryUp, pullbackToMA
16. Ten preset scans implemented in `lib/scans/presets.ts`:
    - Pre-Breakout: Tight Consolidation
    - Pre-Breakout: Volume Drying Up
    - Pre-Breakout: MA Compression
    - Just Broke Out: 52-Week High + Volume
    - Just Broke Out: 50-Day High + Volume
    - Just Broke Out: Gap & Hold
    - Established Trend: Pullback to 20-MA
    - Established Trend: RS Leaders
    - Established Trend: Strong Sector + MA Alignment
    - Momentum Movers: Multi-Timeframe % Gain
17. Cron-driven scan runner; results persisted to `updraft_scan_results` with snapshot
18. Scan results page (sortable table, save-to-watchlist, mark-as-seen)
19. Scan builder form (indicator + operator + value + AND/OR), saved as JSON definition

### Phase 7 — Alerts
20. Web Push subscription flow + VAPID setup
21. Slack webhook send (Block Kit format) + test button on settings
22. Alerts dispatcher: when new `updraft_scan_results` row inserted, fan out to enabled channels (push + slack); failure of one channel does not block others
23. SMS adapter interface (no-op stub)
24. Alerts inbox UI

### Phase 8 — Journal
25. Per-stock notes editor (markdown), pinned on stock detail page; global journal page lists all notes

### Phase 9 — Polish
26. Mobile responsive pass on every screen
27. Empty states, loading skeletons, error boundaries
28. "Personal use only — not financial advice" disclaimer banner + footer (every page)
29. Settings page complete: notification prefs, slack webhook, theme, password change

### Phase 10 — Deploy
30. Push to GitHub
31. Connect Vercel; set env vars
32. Provision Supabase project + run migrations
33. Provision Upstash Redis
34. Configure cron jobs + verify universe seed + first scan run

## 6. Risks and Assumptions

- **Finnhub free tier rate limit**: 60 calls/min cannot quote ~2,500 $2B+ tickers every minute. Mitigation: tiered refresh — universe every 10 min in batched calls, watchlist + recent scan results every 1 min, on-demand fetch when user opens a stock detail page.
- **Free tier endpoint coverage**: some Finnhub endpoints (real-time streaming, options data) are paid-only. We use REST polling + caching for MVP.
- **Vercel Cron concurrency**: free plan limits cron count. If we need more, batch into a single dispatcher route that fans out internally.
- **Slack webhook**: requires user to create one in their workspace. Onboarding step on settings page with a "Send test" button. If user hasn't set one up, alerts silently skip Slack channel without failing.
- **Web Push**: requires HTTPS (Vercel ✓) and explicit user grant; Slack is the fallback channel.
- **Pre-breakout signal noise**: detecting consolidations is inherently noisier than confirmed breakouts. Mitigated by a conviction score (0–100) per result and tunable thresholds.
- **Single-user assumption**: schema is auth-ready (`user_id` columns) so multi-user is non-breaking later.
- **Sector heat aggregation**: no single Finnhub "sector strength" endpoint. We compute it from sector ETFs (XLK, SOXX, XLE, XLF, XLV, XLI, XLY, XLP, XLB, XLRE, XLU, XLC) — 12 cheap calls every 30 min.
- **Shared Supabase project**: prefix `updraft_` keeps tables namespaced so multiple apps can coexist in one paid Postgres without collision or extra cost.

## 7. Concrete Test Plan

This is the contract. Tests in this section MUST exist (and pass) before a phase is considered complete.

### 7.1 Unit tests — Signal library (`tests/unit/lib/scans/signals/`)

Each takes fixture daily bars from `tests/fixtures/bars/*.json`.

| Test file | Asserts |
|---|---|
| `pctChange.test.ts` | 1d/5d/21d/63d % return matches hand-computed value within 0.01% on AAPL fixture |
| `relativeVolume.test.ts` | Today's volume / 20-day avg matches expected; handles missing data |
| `maAligned.test.ts` | True when SMA20 > SMA50 > SMA200 on NVDA fixture; false on AAPL pullback fixture |
| `breakoutNDayHigh.test.ts` | True when close > prior N-day high on MU 2026-04-15 fixture; false day before |
| `breakout52WeekHigh.test.ts` | True on NVDA 2024-02-22 fixture; false day before |
| `relativeStrength.test.ts` | RS percentile (0–100) vs SPY benchmark; NVDA > 90 on trend fixture |
| `rsi.test.ts` | Wilder RSI(14) matches reference values to 0.01 |
| `macd.test.ts` | 12/26/9 line/signal/histogram match reference |
| `tightConsolidation.test.ts` | True on ANET 5-week range fixture (ATR / price < 1.5%) |
| `volumeDryUp.test.ts` | True when last 5d avg vol < 0.7 × 20d avg |
| `pullbackToMA.test.ts` | True when price touches SMA20 from above without closing below |

### 7.2 Unit tests — Cache & client (`tests/unit/lib/`)

| Test file | Asserts |
|---|---|
| `cache/redis.test.ts` | TTL applied per key prefix; expired keys return null |
| `cache/quoteCache.test.ts` | Redis miss → Postgres fallback → Finnhub fetch chain works; populates both layers on success |
| `finnhub/client.test.ts` | Token bucket caps at 60 calls/60s window; queues overflow; retries on 429 with exponential backoff (max 3) |
| `finnhub/client.test.ts` | Surfaces non-429 errors immediately without retry |
| `alerts/slack.test.ts` | Block Kit payload shape correct; webhook 200 → success; webhook 4xx → recorded error, no throw |
| `alerts/push.test.ts` | Subscription expired (410) → marked invalid in DB |
| `alerts/dispatcher.test.ts` | All enabled channels invoked; one channel failure does not block others |

### 7.3 Integration tests — Scan engine (`tests/integration/scan-engine.test.ts`)

| Scenario | Asserts |
|---|---|
| Run "Just Broke Out: 52W High + Volume" against `fixture-2024-02-22.json` containing NVDA | NVDA appears in results with snapshot containing %1d, vol, MA flags |
| Run "Pre-Breakout: Tight Consolidation" against `fixture-2026-04-10.json` | At least 3 known consolidation tickers (ANET, CRWD, VRT) trigger |
| Run "Established Trend: Pullback to 20-MA" against fixture | NVDA on known pullback day triggers |
| Custom scan AND combinator: `pctChange1d > 2 AND relVol > 1.5` | Only rows satisfying both fire |
| Custom scan OR combinator: `pctChange1w > 10 OR pctChange1m > 25` | Rows satisfying either fire, no duplicates |
| Empty universe input | Returns `[]` without throwing |
| Malformed bar (missing close) | Row skipped with warning log; other rows unaffected |
| Result snapshot persisted | `updraft_scan_results.snapshot` JSON contains required keys: price, %1d, relVol, RS, MA flags |

### 7.4 Integration tests — API routes (`tests/integration/api/`)

| Route | Asserts |
|---|---|
| `GET /api/quote/AAPL` | Cache hit returns cached payload; cache miss fetches Finnhub then caches |
| `GET /api/sectors` | Returns 12 sector entries with %1D values |
| `POST /api/scans` (custom) | Validates definition shape with Zod; rejects malformed |
| `POST /api/cron/run-scans` without `Authorization` | 401 |
| `POST /api/cron/run-scans` with `Authorization: Bearer $CRON_SECRET` | 200; runs all enabled scans; inserts results |
| `POST /api/alerts/test-slack` with valid webhook | 200; Slack receives test message |
| `POST /api/alerts/test-slack` with empty webhook | 400 with "no webhook configured" |
| `GET /api/news/watchlist` | Filters to symbols in user's watchlists; returns last 60 minutes |

### 7.5 E2E tests — CUJ scenarios (`tests/e2e/`)

Driven by Playwright. Each spec covers all scenarios from its CUJ doc.

| Spec | CUJ |
|---|---|
| `cuj-1-dashboard.spec.ts` | [docs/cujs/dashboard-trend-spotting.md](cujs/dashboard-trend-spotting.md) — 10 scenarios |
| `cuj-2-running-a-scan.spec.ts` | [docs/cujs/running-a-scan.md](cujs/running-a-scan.md) — 8 scenarios |
| `cuj-3-custom-scan-builder.spec.ts` | [docs/cujs/custom-scan-builder.md](cujs/custom-scan-builder.md) — 7 scenarios |
| `cuj-4-alerts.spec.ts` | [docs/cujs/setting-up-alerts.md](cujs/setting-up-alerts.md) — 8 scenarios |
| `cuj-5-journal.spec.ts` | [docs/cujs/journal-entry-flow.md](cujs/journal-entry-flow.md) — 6 scenarios |

E2E runs against a Vercel preview deployment with seeded fixtures and a mock Finnhub upstream.

### 7.6 Smoke checks (manual, every deploy)

- [ ] Login with password gate
- [ ] Dashboard renders all 7 panels on desktop + iPhone width
- [ ] Open NVDA → chart + news + journal
- [ ] Run a preset scan → results table populated
- [ ] Build a 2-condition custom scan → save → run → results
- [ ] Subscribe push + send test → notification received
- [ ] Paste Slack webhook + send test → message received
- [ ] Add journal note → reload → persists
- [ ] Disclaimer present on every page
- [ ] Theme toggle (light ↔ dark) persists

## 8. Deployment Guide

1. Create Supabase project; run `supabase/migrations/0001_init.sql` (creates `updraft_*` tables)
2. Create Upstash Redis instance; copy REST URL + token
3. Generate VAPID keys: `npx web-push generate-vapid-keys`
4. Set Vercel env vars:
   - `FINNHUB_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `APP_PASSWORD`
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:)
   - `CRON_SECRET`
5. Deploy
6. One-time: `POST /api/cron/seed-universe` (with `Authorization: Bearer $CRON_SECRET`)
7. Visit `/`, sign in with `APP_PASSWORD`
8. On `/settings`: grant push permission, paste Slack incoming-webhook URL, click "Send test" for both
9. Verify cron schedules registered: refresh-quotes-watchlist (1m), refresh-quotes-universe (10m), run-scans (10m), dispatch-alerts (1m), seed-universe (weekly)

## 9. CUJ Index

- **CUJ 1: Dashboard Trend Spotting** — opening Updraft and knowing within 30s what's worth a look today
- **CUJ 2: Running a Scan** — picking a preset, reviewing hits, taking action
- **CUJ 3: Custom Scan Builder** — composing a scan from indicator + operator + value with AND/OR logic
- **CUJ 4: Setting Up Alerts** — subscribing push, connecting Slack webhook, sending test, receiving live alerts
- **CUJ 5: Journal Entry Flow** — adding/editing/deleting notes per ticker
