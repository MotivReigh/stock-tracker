# CUJ 1: Dashboard Trend Spotting

## Goal
Open Updraft and within 30 seconds know what's worth looking at today across the $2B+ US universe.

## Primary user flow

1. User visits `/`. Password gate accepts saved cookie or prompts.
2. Dashboard renders the **top strip** (market context — see chosen variant in mock).
3. **Three trend-stage cards** (Pre-Breakout, Just Broke Out, Established Trend) display top hits per stage.
4. **Top movers** table loads from `updraft_universe` filtered to $2B+, sorted by %1D, with timeframe toggle (1D/1W/1M/3M).
5. **Sector strength** panel shows the 12 sector ETFs (XLK, SOXX, XLE, XLF, XLV, XLI, XLY, XLP, XLB, XLRE, XLU, XLC) ranked by %1D.
6. **Watchlist preview** shows the user's first watchlist's top tickers with quote + %1D + relVol.
7. **Live alerts** panel shows the latest fired alerts (unread highlighted).
8. **News feed** shows watchlist-filtered headlines from the last 60 minutes.
9. User clicks a ticker anywhere → routed to `/stock/[symbol]`.
10. Auto-refresh during market hours: quotes update every 60s without full page reload.

## Test scenarios

| # | Scenario | Type | Expected behavior |
|---|---|---|---|
| 1.1 | Happy path, warm cache | E2E | All seven panels render in < 3s; no console errors; no 4xx/5xx |
| 1.2 | Cold cache (first request after deploy) | E2E | Loading skeletons appear immediately; full render < 6s |
| 1.3 | No scan triggers today | E2E | Each stage card shows "No setups today" placeholder; no error |
| 1.4 | Finnhub rate limit hit during refresh | Integration | Last-cached data shown; "Updated 2m ago" stale badge visible |
| 1.5 | Mobile viewport 375px | E2E | Single-column stack; sidebar collapses to drawer; all panels reachable; no horizontal scroll |
| 1.6 | Click ticker → stock page | E2E | Routes to `/stock/MU`; chart renders within 2s |
| 1.7 | Add ticker to watchlist from dashboard | E2E | Persists to `updraft_watchlist_items`; dashboard reload shows new entry |
| 1.8 | Auto-refresh during market hours | E2E | Quotes update every 60s without full page reload; no flicker |
| 1.9 | Disclaimer banner | E2E | "Personal use · Not financial advice" present at top + footer |
| 1.10 | Theme toggle (light ↔ dark) | E2E | Theme persists across reload via `next-themes` |

## Related source files

- `app/page.tsx`
- `components/dashboard/{TopStrip,TrendStageCards,MoverList,SectorHeatmap,WatchlistPanel,AlertsPanel,NewsFeed}.tsx`
- `app/api/sectors/route.ts`
- `app/api/quote/[symbol]/route.ts`
- `app/api/news/watchlist/route.ts`
- `app/api/scans/results/[id]/route.ts`
- `lib/scans/engine.ts`
- `lib/cache/quoteCache.ts`
