-- Updraft initial schema. All tables prefixed `updraft_` so this database can
-- be shared with other apps without namespace collisions.
--
-- Run via: npm run db:migrate
-- (Reads POSTGRES_URL_NON_POOLING from .env.local.)

-- pgcrypto for gen_random_uuid(); enabled by default on Supabase but harmless to ensure.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updraft_users
-- ---------------------------------------------------------------------------
create table if not exists updraft_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updraft_settings
-- ---------------------------------------------------------------------------
create table if not exists updraft_settings (
  user_id uuid primary key references updraft_users(id) on delete cascade,
  slack_webhook_url text,
  push_enabled boolean not null default false,
  slack_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  theme text not null default 'light' check (theme in ('light','dark')),
  dashboard_layout text not null default 'terminal' check (dashboard_layout in ('terminal','editorial')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updraft_watchlists
-- ---------------------------------------------------------------------------
create table if not exists updraft_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references updraft_users(id) on delete cascade,
  name text not null,
  sort_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists updraft_watchlists_user_idx
  on updraft_watchlists(user_id, sort_index);

-- ---------------------------------------------------------------------------
-- updraft_watchlist_items
-- ---------------------------------------------------------------------------
create table if not exists updraft_watchlist_items (
  watchlist_id uuid not null references updraft_watchlists(id) on delete cascade,
  symbol text not null,
  added_at timestamptz not null default now(),
  primary key (watchlist_id, symbol)
);
create index if not exists updraft_watchlist_items_symbol_idx
  on updraft_watchlist_items(symbol);

-- ---------------------------------------------------------------------------
-- updraft_scans
-- preset_key is non-null for the 10 built-in scans; null for custom builds.
-- definition is a JSON document conforming to lib/scans/types.ts > ScanDefinition.
-- ---------------------------------------------------------------------------
create table if not exists updraft_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references updraft_users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('preset','custom')),
  preset_key text,
  definition jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists updraft_scans_user_enabled_idx
  on updraft_scans(user_id) where enabled = true;
create unique index if not exists updraft_scans_preset_unique
  on updraft_scans(user_id, preset_key) where preset_key is not null;

-- ---------------------------------------------------------------------------
-- updraft_scan_results
-- snapshot stores the indicator values that triggered the scan (price, %1d,
-- relVol, RS, MA flags, conviction score, etc.) so we can render results
-- without re-fetching when the underlying data drifts.
-- ---------------------------------------------------------------------------
create table if not exists updraft_scan_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references updraft_scans(id) on delete cascade,
  symbol text not null,
  triggered_at timestamptz not null default now(),
  snapshot jsonb not null,
  seen_at timestamptz
);
create index if not exists updraft_scan_results_scan_triggered_idx
  on updraft_scan_results(scan_id, triggered_at desc);
create index if not exists updraft_scan_results_symbol_idx
  on updraft_scan_results(symbol, triggered_at desc);
create index if not exists updraft_scan_results_unseen_idx
  on updraft_scan_results(scan_id, triggered_at desc) where seen_at is null;

-- ---------------------------------------------------------------------------
-- updraft_alerts
-- channels is e.g. ARRAY['push','slack'] so a failed channel doesn't block others.
-- ---------------------------------------------------------------------------
create table if not exists updraft_alerts (
  id uuid primary key default gen_random_uuid(),
  scan_result_id uuid not null references updraft_scan_results(id) on delete cascade,
  channels text[] not null,
  fired_at timestamptz not null default now(),
  delivered_at timestamptz,
  error text
);
create index if not exists updraft_alerts_fired_idx on updraft_alerts(fired_at desc);
create index if not exists updraft_alerts_undelivered_idx
  on updraft_alerts(fired_at desc) where delivered_at is null;

-- ---------------------------------------------------------------------------
-- updraft_journal_notes
-- ---------------------------------------------------------------------------
create table if not exists updraft_journal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references updraft_users(id) on delete cascade,
  symbol text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists updraft_journal_notes_symbol_idx
  on updraft_journal_notes(user_id, symbol, created_at desc);

-- ---------------------------------------------------------------------------
-- updraft_universe
-- The set of symbols we scan. Filtered to US $2B+ by the seeder/refresher.
-- enabled lets us soft-disable a ticker (e.g. delisted) without losing history.
-- ---------------------------------------------------------------------------
create table if not exists updraft_universe (
  symbol text primary key,
  name text not null,
  sector text,
  industry text,
  market_cap numeric,                -- USD millions, mirrors Finnhub units
  enabled boolean not null default true,
  last_refreshed timestamptz not null default now()
);
create index if not exists updraft_universe_sector_idx
  on updraft_universe(sector) where enabled = true;
create index if not exists updraft_universe_marketcap_idx
  on updraft_universe(market_cap desc nulls last) where enabled = true;

-- ---------------------------------------------------------------------------
-- updraft_quote_cache
-- Postgres fallback when Redis is cold. Updated by the same writer as Redis.
-- ---------------------------------------------------------------------------
create table if not exists updraft_quote_cache (
  symbol text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
create index if not exists updraft_quote_cache_fetched_idx
  on updraft_quote_cache(fetched_at desc);

-- ---------------------------------------------------------------------------
-- updraft_daily_bars
-- OHLCV history used for signal computation. Filled by candle refresh job.
-- ---------------------------------------------------------------------------
create table if not exists updraft_daily_bars (
  symbol text not null,
  date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null,
  primary key (symbol, date)
);
create index if not exists updraft_daily_bars_date_idx on updraft_daily_bars(date desc);

-- ---------------------------------------------------------------------------
-- updraft_push_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists updraft_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references updraft_users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists updraft_push_subscriptions_user_idx
  on updraft_push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- Bootstrap: single-user MVP. Insert the user + default settings.
-- ---------------------------------------------------------------------------
insert into updraft_users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'tylershill@gmail.com')
on conflict (id) do nothing;

insert into updraft_settings (user_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (user_id) do nothing;
