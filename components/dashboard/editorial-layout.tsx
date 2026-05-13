import Link from "next/link";
import { TickerTape } from "./ticker-tape";
import { cn } from "@/lib/utils";
import type { DashboardData, Mover } from "@/lib/dashboard/data";

export function EditorialLayout({ data }: { data: DashboardData }) {
  const lead = data.movers[0];
  const lookers = data.movers.slice(1, 4);

  return (
    <div className="bg-cream dark:bg-slate-950 min-h-full">
      <TickerTape rows={data.indices} variant="editorial" marketOpen={data.marketOpen} />

      <main className="px-4 sm:px-8 py-6 space-y-8 max-w-[1400px] mx-auto">
        {/* Lead section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              The Trend Spotter
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted">
              {data.movers.length} watchlist · {data.marketOpen ? "Markets Open" : "Markets Closed"}
            </div>
          </div>
          <div className="border-t-2 border-ink dark:border-slate-200 mb-5" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <article className="lg:col-span-7">
              {lead ? <LeadStory mover={lead} /> : null}
              <div className="border-t border-ink/40 dark:border-slate-700 mt-6 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {lookers.map((m) => (
                  <SecondaryCard key={m.symbol} mover={m} />
                ))}
              </div>
            </article>

            <aside className="lg:col-span-5 lg:border-l lg:border-stone-300 dark:lg:border-slate-700 lg:pl-8 space-y-6">
              <PreBreakoutPlaceholder />
              <EstablishedTrendList movers={data.movers.slice(0, 5)} />
            </aside>
          </div>
        </section>

        {/* Markets at a glance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              Markets at a glance
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted">
              Today's Session
            </div>
          </div>
          <div className="border-t-2 border-ink dark:border-slate-200 mb-5" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TopMoversList movers={data.movers.slice(0, 8)} />
            <SectorStrengthList data={data} />
            <WatchlistPanel watchlist={data.watchlist} />
          </div>
        </section>

        {/* News */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">The Tape</div>
            <div className="text-[11px] uppercase tracking-widest text-muted">Live</div>
          </div>
          <div className="border-t-2 border-ink dark:border-slate-200 mb-5" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <NewsList news={data.news} />
            <AlertsPlaceholderEditorial />
          </div>
        </section>

        <footer className="border-t-2 border-ink dark:border-slate-200 pt-4 text-center text-[11px] text-muted uppercase tracking-widest pb-6">
          Updraft · Personal use only · Not financial advice
        </footer>
      </main>
    </div>
  );
}

/* --- Lead story (top mover narrative) --- */

function LeadStory({ mover }: { mover: Mover }) {
  const up = mover.changePercent >= 0;
  const range = mover.prevClose > 0 ? ((mover.high - mover.low) / mover.prevClose) * 100 : 0;
  const headline = up
    ? `${mover.symbol} leads the tape with a ${mover.changePercent.toFixed(2)}% advance`
    : `${mover.symbol} pulls back ${Math.abs(mover.changePercent).toFixed(2)}% from yesterday's close`;
  return (
    <>
      <div className="text-[11px] uppercase tracking-[0.18em] text-editorial-700 dark:text-amber-400 font-semibold mb-2">
        Top Mover · Today
      </div>
      <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-3">
        {headline}
      </h1>
      <p className="font-serif text-lg text-slate-700 dark:text-slate-300 leading-snug mb-4">
        {mover.symbol} traded between ${mover.low.toFixed(2)} and ${mover.high.toFixed(2)} after
        opening at ${mover.open.toFixed(2)}, an intraday range of {range.toFixed(2)}% on the prior
        close.
      </p>
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <Stat label="Last" value={`$${mover.price.toFixed(2)}`} />
        <Stat label="Change" value={pct(mover.changePercent)} tone={up ? "gain" : "loss"} />
        <Stat label="High" value={`$${mover.high.toFixed(2)}`} />
        <Stat label="Low" value={`$${mover.low.toFixed(2)}`} />
        <Stat label="Prev" value={`$${mover.prevClose.toFixed(2)}`} />
        <Link
          href={`/stock/${mover.symbol}`}
          className="ml-auto text-[11px] uppercase tracking-widest underline underline-offset-4 hover:text-editorial-700 dark:hover:text-amber-400"
        >
          Open {mover.symbol} →
        </Link>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss";
}) {
  return (
    <div>
      <span className="text-muted text-xs uppercase tracking-wider">{label}</span>
      <span
        className={cn("font-mono font-semibold ml-1", tone === "gain" && "gain", tone === "loss" && "loss")}
      >
        {value}
      </span>
    </div>
  );
}

function SecondaryCard({ mover }: { mover: Mover }) {
  const up = mover.changePercent >= 0;
  return (
    <Link href={`/stock/${mover.symbol}`} className="block group">
      <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
        Honorable mention
      </div>
      <div className="font-serif text-xl font-semibold leading-tight group-hover:underline">
        {mover.symbol}
      </div>
      <div className="font-mono text-sm mt-1">
        ${mover.price.toFixed(2)}{" "}
        <span className={up ? "gain" : "loss"}>{pct(mover.changePercent)}</span>
      </div>
    </Link>
  );
}

function PreBreakoutPlaceholder() {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-editorial-700 dark:text-amber-400 font-semibold mb-2">
        Pre-Breakout
      </div>
      <h2 className="font-serif text-2xl font-bold leading-snug mb-2">
        Tight setups will appear here
      </h2>
      <p className="font-serif text-sm text-muted leading-snug">
        Once scans land in phase 6, we'll surface stocks consolidating beneath resistance, MA
        compression, and bases on bases.
      </p>
    </div>
  );
}

function EstablishedTrendList({ movers }: { movers: Mover[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-editorial-700 dark:text-amber-400 font-semibold mb-2">
        Today's Strongest
      </div>
      <h2 className="font-serif text-2xl font-bold leading-snug mb-2">
        {movers[0]?.symbol ?? "—"} continues to lead the tape
      </h2>
      <ul className="divide-y divide-stone-300 dark:divide-slate-700">
        {movers.map((m) => {
          const up = m.changePercent >= 0;
          return (
            <li key={m.symbol} className="py-2.5 flex items-baseline justify-between gap-3">
              <Link href={`/stock/${m.symbol}`} className="font-serif font-semibold text-base hover:underline">
                {m.symbol}
              </Link>
              <div className="font-mono text-sm whitespace-nowrap">
                ${m.price.toFixed(2)}{" "}
                <span className={cn("text-xs", up ? "gain" : "loss")}>{pct(m.changePercent)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --- Markets-at-a-glance columns --- */

function TopMoversList({ movers }: { movers: Mover[] }) {
  return (
    <div>
      <h3 className="font-serif text-xl font-bold mb-3">Top Movers</h3>
      <div className="border-t border-ink/40 dark:border-slate-700 mb-2" />
      <table className="w-full text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-muted">
          <tr>
            <th className="text-left pb-2 font-medium">Sym</th>
            <th className="text-right pb-2 font-medium">Last</th>
            <th className="text-right pb-2 font-medium">% 1D</th>
            <th className="text-right pb-2 font-medium">High</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300 dark:divide-slate-700">
          {movers.map((m) => {
            const up = m.changePercent >= 0;
            return (
              <tr key={m.symbol}>
                <td className="py-2">
                  <Link href={`/stock/${m.symbol}`} className="font-serif font-semibold hover:underline">
                    {m.symbol}
                  </Link>
                </td>
                <td className="py-2 text-right font-mono">{m.price.toFixed(2)}</td>
                <td className={cn("py-2 text-right font-mono", up ? "gain" : "loss")}>
                  {pct(m.changePercent)}
                </td>
                <td className="py-2 text-right font-mono text-muted">{m.high.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectorStrengthList({ data }: { data: DashboardData }) {
  return (
    <div>
      <h3 className="font-serif text-xl font-bold mb-3">Sector Strength</h3>
      <div className="border-t border-ink/40 dark:border-slate-700 mb-2" />
      <ul className="space-y-2 text-sm">
        {data.sectors.map((s) => {
          const cp = s.changePercent ?? 0;
          const up = cp >= 0;
          const widthPct = Math.min(80, Math.abs(cp) * 30);
          return (
            <li key={s.ticker} className="flex items-center justify-between gap-3">
              <span>{s.label}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-20 bg-stone-200 dark:bg-slate-700">
                  <div
                    className={cn("h-full", up ? "bg-emerald-700" : "bg-rose-700")}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className={cn("font-mono w-14 text-right", up ? "gain" : "loss")}>
                  {s.changePercent !== null ? pct(s.changePercent) : "—"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WatchlistPanel({
  watchlist,
}: {
  watchlist: DashboardData["watchlist"];
}) {
  if (!watchlist) {
    return (
      <div>
        <h3 className="font-serif text-xl font-bold mb-3">My Watchlist</h3>
        <div className="border-t border-ink/40 dark:border-slate-700 mb-2" />
        <div className="text-sm text-muted py-6">
          No watchlists yet.{" "}
          <Link
            href="/watchlists"
            className="underline underline-offset-4 hover:text-editorial-700 dark:hover:text-amber-400"
          >
            Create one →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-serif text-xl font-bold mb-3">
        {watchlist.name}{" "}
        <span className="text-xs text-muted font-normal">
          · {watchlist.totalCount} tickers
        </span>
      </h3>
      <div className="border-t border-ink/40 dark:border-slate-700 mb-2" />
      {watchlist.rows.length === 0 ? (
        <p className="text-sm text-muted py-3">
          Empty list.{" "}
          <Link
            href={`/watchlists/${watchlist.id}`}
            className="underline underline-offset-4 hover:text-editorial-700 dark:hover:text-amber-400"
          >
            Add symbols →
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-stone-300 dark:divide-slate-700 text-sm">
          {watchlist.rows.map((r) => {
            const up = r.changePercent >= 0;
            return (
              <li
                key={r.symbol}
                className="py-2 flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/stock/${r.symbol}`}
                  className="font-serif font-semibold hover:underline"
                >
                  {r.symbol}
                </Link>
                <div className="font-mono text-sm whitespace-nowrap">
                  ${r.price.toFixed(2)}{" "}
                  <span className={cn("text-xs", up ? "gain" : "loss")}>
                    {pct(r.changePercent)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={`/watchlists/${watchlist.id}`}
        className="text-xs uppercase tracking-widest underline underline-offset-4 mt-3 inline-block hover:text-editorial-700 dark:hover:text-amber-400"
      >
        Open full list →
      </Link>
    </div>
  );
}

function NewsList({ news }: { news: DashboardData["news"] }) {
  return (
    <article className="md:col-span-2">
      <h3 className="font-serif text-xl font-bold mb-3">Market headlines</h3>
      <div className="border-t border-ink/40 dark:border-slate-700 mb-3" />
      {news.length === 0 ? (
        <p className="text-sm text-muted py-6">No news fetched.</p>
      ) : (
        <ul className="divide-y divide-stone-300 dark:divide-slate-700">
          {news.slice(0, 6).map((n) => (
            <li key={n.id} className="py-3">
              <a href={n.url} target="_blank" rel="noopener noreferrer">
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1 font-mono">
                  {n.source} · {formatRelativeTime(n.datetime * 1000)}
                </div>
                <h4 className="font-serif text-lg font-semibold leading-tight mb-1 hover:underline">
                  {n.headline}
                </h4>
                {n.summary && (
                  <p className="text-sm text-muted line-clamp-2">{n.summary}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function AlertsPlaceholderEditorial() {
  return (
    <aside>
      <h3 className="font-serif text-xl font-bold mb-3">
        Live Alerts <span className="text-xs text-muted font-normal">· phase 7</span>
      </h3>
      <div className="border-t border-ink/40 dark:border-slate-700 mb-3" />
      <p className="text-sm text-muted py-3">
        Once scans are running, triggered alerts will land here as well as on Slack and your
        browser push.
      </p>
    </aside>
  );
}

function pct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
