import Link from "next/link";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight } from "lucide-react";
import { TickerTape } from "./ticker-tape";
import { cn } from "@/lib/utils";
import type { DashboardData, Mover, Highlight } from "@/lib/dashboard/data";

export function TerminalLayout({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-3 p-3 md:p-4">
      <TickerTape rows={data.indices} variant="terminal" marketOpen={data.marketOpen} />

      <MoverHighlights highlights={data.highlights} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-8">
          <MoversTable movers={data.movers} />
        </div>
        <div className="xl:col-span-4">
          <SectorHeat data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <AlertsPlaceholder />
        <WatchlistPlaceholder />
        <NewsPanel news={data.news} variant="terminal" />
      </div>
    </div>
  );
}

/* --- Mover Highlights (Mock B Option 3) --- */

function MoverHighlights({ highlights }: { highlights: Highlight[] }) {
  const tiles: Array<{
    title: string;
    Icon: typeof TrendingUp;
    color: "emerald" | "rose" | "indigo" | "amber";
    mover: Mover;
    metric: string;
  }> = [];

  for (const h of highlights) {
    if (h.kind === "topGainer") {
      tiles.push({
        title: "Top Gainer",
        Icon: TrendingUp,
        color: "emerald",
        mover: h.mover,
        metric: pct(h.mover.changePercent),
      });
    } else if (h.kind === "topDecliner") {
      tiles.push({
        title: "Top Decliner",
        Icon: TrendingDown,
        color: "rose",
        mover: h.mover,
        metric: pct(h.mover.changePercent),
      });
    } else if (h.kind === "biggestRange") {
      tiles.push({
        title: "Biggest Range",
        Icon: Activity,
        color: "indigo",
        mover: h.mover,
        metric: `${h.rangePct.toFixed(2)}% range`,
      });
    } else if (h.kind === "biggestGap") {
      tiles.push({
        title: h.gapPct >= 0 ? "Biggest Gap-Up" : "Biggest Gap-Down",
        Icon: ArrowUpRight,
        color: h.gapPct >= 0 ? "emerald" : "rose",
        mover: h.mover,
        metric: `Gap ${pct(h.gapPct)}`,
      });
    }
  }

  if (tiles.length === 0) return null;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 border border-app divide-x divide-y md:divide-y-0 divide-app">
      {tiles.slice(0, 4).map((tile, i) => {
        const isUp = tile.mover.changePercent >= 0;
        return (
          <Link
            key={i}
            href={`/stock/${tile.mover.symbol}`}
            className={cn(
              "p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors block",
              "flex flex-col gap-1",
            )}
          >
            <div className="flex items-center gap-1.5">
              <tile.Icon className="h-3 w-3 text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {tile.title}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold font-mono">{tile.mover.symbol}</span>
            </div>
            <div className="font-mono font-semibold">${tile.mover.price.toFixed(2)}</div>
            <div className={cn("text-sm font-mono font-bold", isUp ? "gain" : "loss")}>
              {tile.metric}
            </div>
            <Sparkline mover={tile.mover} positive={isUp} />
          </Link>
        );
      })}
    </section>
  );
}

/* Tiny sparkline using high/low/open/prevClose to draw a 4-point trend. */
function Sparkline({ mover, positive }: { mover: Mover; positive: boolean }) {
  const pts = [mover.prevClose, mover.open, mover.low, mover.high, mover.price];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const W = 100;
  const H = 14;
  const points = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((p - min) / span) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = positive ? "rgb(5 150 105)" : "rgb(220 38 38)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-3.5 mt-1">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --- Movers Table (terminal style) --- */

function MoversTable({ movers }: { movers: Mover[] }) {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[13px] uppercase tracking-wider">Top Movers</h3>
          <span className="text-[11px] text-muted font-mono">
            {movers.length} symbols · sorted by %1D
          </span>
        </div>
        <div className="flex gap-1 text-[11px] font-mono">
          <button className="px-2 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            1D
          </button>
          <button disabled className="px-2 py-0.5 border border-app opacity-50 cursor-not-allowed">
            1W
          </button>
          <button disabled className="px-2 py-0.5 border border-app opacity-50 cursor-not-allowed">
            1M
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-muted uppercase text-[10px] tracking-wider">
            <tr className="border-b border-app">
              <th className="text-left px-3 py-2 font-medium">Sym</th>
              <th className="text-right px-2 py-2 font-medium">Last</th>
              <th className="text-right px-2 py-2 font-medium">Change</th>
              <th className="text-right px-2 py-2 font-medium">% 1D</th>
              <th className="text-right px-2 py-2 font-medium">High</th>
              <th className="text-right px-2 py-2 font-medium">Low</th>
              <th className="text-right px-2 py-2 font-medium">Open</th>
              <th className="text-right px-2 py-2 font-medium">Prev</th>
              <th className="text-right px-2 py-2 font-medium">Range</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-slate-100 dark:divide-slate-800">
            {movers.map((m) => {
              const range = m.prevClose > 0 ? ((m.high - m.low) / m.prevClose) * 100 : 0;
              const up = m.changePercent >= 0;
              return (
                <tr
                  key={m.symbol}
                  className="hover:bg-terminal-50/40 dark:hover:bg-terminal-700/10"
                >
                  <td className="px-3 py-1.5">
                    <Link href={`/stock/${m.symbol}`} className="font-bold hover:underline">
                      {m.symbol}
                    </Link>
                  </td>
                  <td className="px-2 text-right">{m.price.toFixed(2)}</td>
                  <td className={cn("px-2 text-right", up ? "gain" : "loss")}>
                    {sign(m.change)}
                  </td>
                  <td className={cn("px-2 text-right font-semibold", up ? "gain" : "loss")}>
                    {pct(m.changePercent)}
                  </td>
                  <td className="px-2 text-right text-muted">{m.high.toFixed(2)}</td>
                  <td className="px-2 text-right text-muted">{m.low.toFixed(2)}</td>
                  <td className="px-2 text-right text-muted">{m.open.toFixed(2)}</td>
                  <td className="px-2 text-right text-muted">{m.prevClose.toFixed(2)}</td>
                  <td className="px-2 text-right text-muted">{range.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- Sector Heat --- */

function SectorHeat({ data }: { data: DashboardData }) {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">Sector Heat</h3>
        <span className="text-[10px] font-mono text-muted">via sector ETFs</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700 p-px">
        {data.sectors.map((s) => {
          const cp = s.changePercent ?? 0;
          const tone = sectorTone(cp);
          return (
            <div key={s.ticker} className={cn("p-3", tone)}>
              <div className="text-[11px] font-bold leading-tight">{s.label}</div>
              <div
                className={cn(
                  "font-mono font-bold mt-0.5",
                  cp >= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200",
                )}
              >
                {s.changePercent !== null ? pct(s.changePercent) : "—"}
              </div>
              <div className="text-[9px] font-mono text-muted">{s.ticker}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sectorTone(pct: number): string {
  if (pct >= 1.5) return "bg-emerald-200 dark:bg-emerald-900/50";
  if (pct >= 0.5) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (pct >= 0) return "bg-emerald-50 dark:bg-emerald-900/15";
  if (pct >= -0.5) return "bg-rose-50 dark:bg-rose-900/15";
  if (pct >= -1.5) return "bg-rose-100 dark:bg-rose-900/30";
  return "bg-rose-200 dark:bg-rose-900/50";
}

/* --- Placeholders for Phase 6/7 --- */

function AlertsPlaceholder() {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">Alerts Log</h3>
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted">No alerts yet</p>
        <p className="text-[11px] text-muted mt-1 font-mono">phase 7 · scan triggers will appear here</p>
      </div>
    </div>
  );
}

function WatchlistPlaceholder() {
  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">Watchlist</h3>
      </div>
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted">No watchlists yet</p>
        <Link href="/watchlists" className="text-[11px] text-terminal-600 dark:text-terminal-400 mt-1 font-mono inline-block hover:underline">
          phase 5 · create one →
        </Link>
      </div>
    </div>
  );
}

/* --- News Panel --- */

function NewsPanel({
  news,
  variant,
}: {
  news: DashboardData["news"];
  variant: "terminal" | "editorial";
}) {
  if (variant === "terminal") {
    return (
      <div className="border border-app">
        <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="font-bold text-[13px] uppercase tracking-wider">Market News</h3>
          <span className="text-[10px] font-mono text-muted">general · live</span>
        </div>
        {news.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">No news yet.</div>
        ) : (
          <ul className="text-[12px] divide-y divide-slate-100 dark:divide-slate-800">
            {news.slice(0, 6).map((n) => (
              <li key={n.id} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(n.datetime * 1000)}</span>
                  </div>
                  <div className="font-medium leading-snug mt-0.5">{n.headline}</div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}

/* --- Helpers --- */

function pct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function sign(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}`;
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
