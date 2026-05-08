# CUJ 3: Custom Scan Builder

## Goal
Compose a custom scan from indicator + operator + value conditions joined by AND/OR, save it, run it, see hits — without writing code.

## Primary user flow

1. User navigates to `/scans/builder`.
2. Builder shows: scan name input, optional description, **conditions list** (start with one empty row), **AND/OR toggle**, **Preview hits** button, **Save** button.
3. Each condition row has three dropdowns:
   - **Indicator**: Price, % Change (1D/1W/1M/3M), Relative Volume, RS Score, MA Alignment, RSI(14), MACD Histogram, 52-Week High Distance, Sector, Market Cap, Avg Volume
   - **Operator**: `>`, `>=`, `<`, `<=`, `=`, `between`, `is`, `is not`
   - **Value**: number input, range input, dropdown (for sector/MA-status/etc.), or boolean
4. User clicks **+ Add condition** to add more rows.
5. AND/OR toggle controls how rows combine. Nested groups not supported in MVP.
6. **Preview hits** button calls `/api/scans/run/preview` with the unsaved definition; shows top 25 results inline without saving.
7. **Save** button validates + persists to `updraft_scans` with type='custom' and `definition` as JSON.
8. After save, user lands on `/scans/[id]` showing the new scan's results.
9. User can edit (back to builder pre-filled) or delete the scan from the scan card.

## Test scenarios

| # | Scenario | Type | Expected behavior |
|---|---|---|---|
| 3.1 | Build single-condition scan: %1D > 5 | E2E | Save succeeds; results page shows only stocks meeting that condition |
| 3.2 | Build two-condition AND: %1W > 10 AND relVol > 1.5 | E2E | Both conditions enforced; result count matches engine integration test |
| 3.3 | Build two-condition OR: %1M > 25 OR newHigh52w | E2E | Either condition triggers inclusion; no duplicates |
| 3.4 | Preview before save | E2E | Top 25 hits show inline within 5s; nothing persisted to DB |
| 3.5 | Validation: empty name | E2E | Save disabled; inline error "Name required" |
| 3.6 | Validation: malformed condition (e.g. value missing) | E2E | Save disabled; row highlighted red |
| 3.7 | Edit existing scan | E2E | Builder pre-fills with saved definition; saving updates row in `updraft_scans` |

## Related source files

- `app/scans/builder/page.tsx`
- `components/scans/ScanBuilder.tsx`
- `app/api/scans/route.ts`
- `app/api/scans/[id]/route.ts`
- `app/api/scans/run/[id]/route.ts` (also serves preview when `id=preview`)
- `lib/scans/engine.ts`
- `lib/scans/signals.ts`

## Definition JSON shape (stored in `updraft_scans.definition`)

```jsonc
{
  "version": 1,
  "combinator": "and",          // "and" | "or"
  "conditions": [
    { "indicator": "pctChange1d", "operator": ">", "value": 5 },
    { "indicator": "relVol", "operator": ">=", "value": 1.5 },
    { "indicator": "maAligned", "operator": "is", "value": true }
  ],
  "universe": { "minMarketCap": 2_000_000_000, "country": "US" }
}
```
