/**
 * Centralized table-name constants. All Updraft tables are prefixed
 * `updraft_` so this database can be shared with other apps without collision.
 *
 * Importing from here (instead of hardcoding "updraft_watchlists") makes
 * a future rename a single-file change.
 */
export const TABLES = {
  users: "updraft_users",
  settings: "updraft_settings",
  watchlists: "updraft_watchlists",
  watchlistItems: "updraft_watchlist_items",
  scans: "updraft_scans",
  scanResults: "updraft_scan_results",
  alerts: "updraft_alerts",
  journalNotes: "updraft_journal_notes",
  universe: "updraft_universe",
  quoteCache: "updraft_quote_cache",
  dailyBars: "updraft_daily_bars",
  pushSubscriptions: "updraft_push_subscriptions",
} as const;

/** Single-user MVP: hardcoded user id. */
export const SINGLE_USER_ID = "00000000-0000-0000-0000-000000000001";
