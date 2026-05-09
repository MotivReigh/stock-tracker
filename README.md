# Updraft

Personal trend spotter and stock tracker. Scans the US $2B+ universe, surfaces emerging momentum at three trend stages (pre-breakout, just-broke-out, established trend), and helps me ride trends while they run.

**Personal use only. Not financial advice.**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase Postgres (all tables prefixed `updraft_`)
- Upstash Redis (cache layer protecting Finnhub rate limit)
- Finnhub (market data)
- Lightweight Charts (in-app charts) + "Open in TradingView" deep link
- Web Push + Slack incoming webhook (alerts)
- Vercel Cron (scan runner, quote refresh)

## Local development

```sh
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

Visit http://localhost:3000. Sign in with `APP_PASSWORD`.

## Project structure

- `app/` — Next.js routes
- `components/` — React components (UI primitives, layout, dashboard, scans, charts)
- `lib/` — data clients, scan engine, alerts, cache
- `supabase/migrations/` — DB schema
- `tests/` — unit (vitest), integration, e2e (playwright)
- `docs/` — plan and CUJ docs
- `mocks/` — early visual mocks (kept for reference)

## Docs

- [docs/PLAN.md](docs/PLAN.md) — full MVP plan and test contract
- [docs/cujs/](docs/cujs/) — critical user journey definitions
