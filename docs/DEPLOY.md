# Deploy guide — Updraft

Single-account personal app. Steps go top-down; nothing is automated by the
codebase except the cron schedules in `vercel.json`. You do every other step
manually with the credentials only you hold.

## Prerequisites

- GitHub account with a fresh empty repo named `updraft` (or any such name).
- Vercel account (Pro recommended — cron needs sub-day cadence).
- Supabase project (any region; the free tier is fine for this scale).
- Redis Cloud / Upstash / self-hosted Redis with a TCP `REDIS_URL`.
- Finnhub API key (free tier: 60 req/min).
- Optional: Twelve Data API key (free 800 req/day) for daily candles. Falls
  back to Yahoo Finance with no key.
- VAPID key pair for Web Push: `npx web-push generate-vapid-keys`.

## 1 · Push to GitHub

```sh
git remote add origin git@github.com:<you>/updraft.git
git push -u origin main
```

Run from this working tree; the repo already has a clean `main`.

## 2 · Provision Supabase

1. Create a new project at https://supabase.com/dashboard.
2. Project Settings → Database → copy the **Direct connection** URL (port 5432,
   not the pooler) — that's `POSTGRES_URL_NON_POOLING`.
3. Project Settings → API → copy the project URL → `SUPABASE_URL`, and the
   `service_role` key → `SUPABASE_SERVICE_KEY`.
4. Locally, copy `.env.example` to `.env.local` and fill in the Supabase vars.
5. Run migrations:

   ```sh
   npm run db:migrate
   ```

   This applies `supabase/migrations/0001_init.sql` (idempotent — safe to
   re-run). All tables are prefixed `updraft_` so they coexist with other
   apps if you reuse the project.

6. Seed the universe and presets:

   ```sh
   npm run db:seed          # populates updraft_universe with US $2B+ stocks
   npm run db:seed-presets  # inserts the 10 preset scans
   ```

7. Backfill 2y of daily bars (slow — uses Twelve Data or Yahoo with rate
   limits). Run once locally, or trigger via cron after deploy:

   ```sh
   npm run bars:refresh
   ```

## 3 · Provision Redis

Pick one:

- **Redis Cloud** (free 30MB tier) — https://redis.com/try-free/
- **Upstash** with the TCP connection string (not the REST one)
- **Self-hosted** anywhere reachable from Vercel's network

Copy the `redis://…` URL → `REDIS_URL`.

## 4 · Generate VAPID keys

```sh
npx web-push generate-vapid-keys
```

Save both keys. The public key goes into two env vars (server + client-side
exposure). `VAPID_SUBJECT` must be a `mailto:` URL (e.g. `mailto:you@you.com`).

## 5 · Configure Vercel

1. **Import the repo** at https://vercel.com/new. Framework auto-detects as
   Next.js.
2. **Environment variables** — copy every key from `.env.example` and paste
   real values:

   | Var | Source |
   |---|---|
   | `APP_PASSWORD` | strong random string (the gate password) |
   | `AUTH_TOKEN` | different strong random string (session-cookie value) |
   | `FINNHUB_API_KEY` | Finnhub dashboard |
   | `TWELVE_DATA_API_KEY` | Twelve Data dashboard (optional) |
   | `SUPABASE_URL` | step 2 |
   | `SUPABASE_SERVICE_KEY` | step 2 |
   | `POSTGRES_URL_NON_POOLING` | step 2 (only used by CLI scripts, harmless on Vercel) |
   | `REDIS_URL` | step 3 |
   | `VAPID_PUBLIC_KEY` | step 4 |
   | `VAPID_PRIVATE_KEY` | step 4 |
   | `VAPID_SUBJECT` | `mailto:you@you.com` |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same as `VAPID_PUBLIC_KEY` |
   | `CRON_SECRET` | strong random string |
   | `NEXT_PUBLIC_APP_URL` | your production URL, e.g. `https://updraft.vercel.app` |

3. **Deploy.** First build should pass; the build log will list every static
   and dynamic route.

## 6 · Verify cron registration

After the first deploy, Vercel reads `vercel.json` and registers crons:

| Path | Schedule (UTC) | Effect |
|---|---|---|
| `/api/cron/run-scans` | `*/10 13-21 * * 1-5` | Every 10 min, weekday market hours, runs every enabled scan + fans alerts to channels |
| `/api/cron/dispatch-alerts` | `*/2 13-21 * * 1-5` | Every 2 min, sweeps any `updraft_alerts` rows that didn't deliver inline |
| `/api/cron/refresh-bars` | `0 22 * * 1-5` | Once daily after market close, refreshes ~2y daily bars for the universe |

Check **Project → Settings → Cron Jobs** in Vercel — all three should appear
as "Active". Vercel sends the `Authorization: Bearer $CRON_SECRET` header
automatically.

Quote refresh has no cron — it's handled in-app via the cache chain (Redis 30s
TTL → Postgres fallback → Finnhub fetch on miss). Watchlist and stock-detail
pages drive on-demand refresh.

> **Hobby plan note**: Vercel Hobby caps crons at once-per-day cadence. The
> schedules above require **Pro**. On Hobby, change all schedules to a single
> `0 * * * *` (hourly) entry and accept the latency.

## 7 · First-run sanity check

1. Visit `/login`, sign in with `APP_PASSWORD`.
2. Dashboard renders all panels (top movers, sector heat, watchlist, alerts,
   news).
3. Open `/stock/NVDA` — chart loads, news + journal section visible.
4. Open `/scans` — the 10 presets are listed; click one and "Run now" to
   verify the scan runner works against your bars data.
5. Go to `/settings`:
   - Grant browser push, then click "Send test push" → notification arrives.
   - Paste your Slack incoming-webhook URL, click "Send test message" →
     Slack receives a Block Kit payload. See "Slack app" below for the
     one-shot manifest that pre-fills the app config.
   - Confirm Appearance + Account sections render.

## Slack app (incoming webhook)

The Slack webhook URL is stored per-user in `updraft_settings.slack_webhook_url`
(set via the Settings page UI), not in env vars — keeps it out of git and
rotatable without redeploying.

To create the app:

1. Go to https://api.slack.com/apps → **Create New App** → **From an app
   manifest** → pick your workspace.
2. Paste the contents of [docs/slack-app-manifest.yml](slack-app-manifest.yml)
   into the manifest editor (YAML tab) → **Next** → **Create**.
3. In the new app, **Install to Workspace** → pick the channel or DM that
   should receive alerts → **Allow**.
4. **Features → Incoming Webhooks** → copy the **Webhook URL** that Slack
   generated for the chosen channel.
5. In Updraft, go to `/settings` → **Notifications** → **Slack** → paste the
   URL → **Save** → **Send test message**.

To rotate the webhook later, repeat step 3 to install to a different channel,
or delete the existing webhook in the Slack app config and add a new one. Then
paste the new URL into `/settings`.

## 8 · Manual cron trigger (debugging)

Each cron route is also reachable via `POST` for ad-hoc runs:

```sh
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-app>.vercel.app/api/cron/run-scans
```

Same shape for `/api/cron/dispatch-alerts` and `/api/cron/refresh-bars`.
Useful when re-seeding bars or kicking a scan outside the schedule.

## 9 · Rotating `APP_PASSWORD`

The gate password is just an env var. To rotate:

1. Update `APP_PASSWORD` in Vercel project settings.
2. Redeploy (env-var change triggers automatically).
3. Existing sessions stay valid until you sign out — the cookie holds
   `AUTH_TOKEN`, not the password. Rotating `AUTH_TOKEN` too invalidates every
   live session.

## 10 · Smoke checks before declaring it done

- [ ] Login with password gate
- [ ] Dashboard renders on desktop + iPhone width (393×852)
- [ ] Open NVDA → chart + news + journal section
- [ ] Run a preset scan → results table populated
- [ ] Build a 2-condition custom scan → save → run → results
- [ ] Subscribe push + send test → notification received
- [ ] Paste Slack webhook + send test → message received
- [ ] Add journal note → reload → persists
- [ ] Disclaimer banner present on every page
- [ ] Theme + layout toggles persist across reload
