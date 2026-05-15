-- 0002_scan_results_dedupe.sql
-- One row per (scan, symbol). Re-running a scan refreshes the existing row's
-- snapshot + triggered_at instead of inserting a duplicate.
--
-- Run via: npm run db:migrate (idempotent — safe to re-run).

-- 1. Collapse existing duplicates: keep the most-recent row per (scan, symbol).
--    The on-delete-cascade on updraft_alerts.scan_result_id sweeps stale
--    alerts attached to the dropped rows in the same statement.
delete from updraft_scan_results a
using updraft_scan_results b
where a.scan_id = b.scan_id
  and a.symbol = b.symbol
  and a.triggered_at < b.triggered_at;

-- 2. Enforce uniqueness so future inserts must use ON CONFLICT (upsert).
create unique index if not exists updraft_scan_results_scan_symbol_uniq
  on updraft_scan_results(scan_id, symbol);
