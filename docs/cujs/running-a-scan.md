# CUJ 2: Running a Scan

## Goal
Pick a preset scan, review the hits as a sortable table, and take action (open detail, save to watchlist, mark seen) on what looks promising.

## Primary user flow

1. From dashboard or sidebar, user navigates to `/scans`.
2. Page lists all scans grouped by stage: Preset (10) and Custom (n). Each card shows scan name, last-run timestamp, and current hit count.
3. User clicks a scan card → routed to `/scans/[id]`.
4. Results table loads from `updraft_scan_results` (most recent run), sortable by every column: Symbol, Last, %1D, %1W, %1M, %3M, RVol, RS, MA Status, Sector, Triggered At.
5. User can filter by sector, stage tag, or "unseen only".
6. User clicks a row → routed to `/stock/[symbol]` with scan context preserved (back button returns to results).
7. From results, user can: add ticker to a watchlist (inline action), mark result as seen, or hide ticker for this session.
8. "Run now" button triggers `/api/scans/run/[id]` immediately (rate-limit aware).

## Test scenarios

| # | Scenario | Type | Expected behavior |
|---|---|---|---|
| 2.1 | Click preset → results table loads | E2E | < 2s on warm cache; rows match latest `updraft_scan_results` |
| 2.2 | Sort by RS desc | E2E | Rows reorder; sort indicator updates; URL query reflects sort |
| 2.3 | Filter by sector "Semiconductors" | E2E | Only semis remain visible; count updates |
| 2.4 | Filter by "unseen only" | E2E | Hides results with `seen_at` set; persists across reload via query param |
| 2.5 | Mark result as seen | E2E | `updraft_scan_results.seen_at` updated; row dims; counter decreases |
| 2.6 | Add ticker to watchlist inline | E2E | Watchlist picker dropdown; adding inserts row into `updraft_watchlist_items`; toast confirmation |
| 2.7 | Empty results | E2E | "No hits in this scan yet" empty state with "Run now" CTA |
| 2.8 | "Run now" with rate limit headroom | Integration | Triggers fresh scan; results update within 30s; toast "Scan complete · X hits" |

## Related source files

- `app/scans/page.tsx`
- `app/scans/[id]/page.tsx`
- `components/scans/{ScanResultsTable,PresetCards}.tsx`
- `app/api/scans/route.ts`
- `app/api/scans/[id]/route.ts`
- `app/api/scans/run/[id]/route.ts`
- `app/api/scans/results/[id]/route.ts`
- `lib/scans/engine.ts`
- `lib/scans/presets.ts`
