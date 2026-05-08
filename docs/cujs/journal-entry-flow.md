# CUJ 5: Journal Entry Flow

## Goal
Capture quick markdown notes per ticker (entry rationale, exit thoughts, observations) and find them later when re-evaluating that stock.

## Primary user flow

1. From any stock detail page (`/stock/[symbol]`), user scrolls to the **Journal** panel.
2. Panel shows existing notes for that symbol, newest first, each with timestamp and edit/delete affordances.
3. User clicks **Add note** → markdown textarea expands.
4. User types markdown content → clicks **Save**.
5. Note persists to `updraft_journal_notes` and renders in the list.
6. User can edit a note (toggles textarea pre-filled), or delete it (confirm modal).
7. Global `/journal` page lists all notes across all tickers, with filter-by-symbol and full-text search.

## Test scenarios

| # | Scenario | Type | Expected behavior |
|---|---|---|---|
| 5.1 | Add note to MU | E2E | Saved row in `updraft_journal_notes`; renders with rendered markdown (bold, lists, code) |
| 5.2 | Edit existing note | E2E | Textarea pre-fills; save updates `updated_at`; rendered output matches |
| 5.3 | Delete note | E2E | Confirm modal; on confirm, row removed from DB and list |
| 5.4 | Reload persists | E2E | After full page reload, notes still present |
| 5.5 | Global journal page filters by symbol | E2E | `/journal?symbol=MU` shows only MU notes |
| 5.6 | Full-text search across notes | E2E | `/journal?q=earnings` returns notes whose body matches; highlights hit |

## Related source files

- `app/stock/[symbol]/page.tsx` (embeds `<JournalNotes />`)
- `app/journal/page.tsx`
- `components/stock/JournalNotes.tsx`
- `app/api/journal/route.ts`
- `app/api/journal/[symbol]/route.ts`
