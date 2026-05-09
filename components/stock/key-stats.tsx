import { cn } from "@/lib/utils";
import type { StockDetail } from "@/lib/stock/data";

export function KeyStats({ detail }: { detail: StockDetail }) {
  const { quote, profile, derived, bars } = detail;
  const todayVolume = bars.length > 0 ? bars[bars.length - 1].volume : null;

  const stats: Array<{ label: string; value: string; tone?: "gain" | "loss" }> =
    [];

  if (quote) {
    stats.push({
      label: "Day Range",
      value: `$${quote.low.toFixed(2)} – $${quote.high.toFixed(2)}`,
    });
    stats.push({
      label: "Open",
      value: `$${quote.open.toFixed(2)}`,
    });
    stats.push({
      label: "Prev Close",
      value: `$${quote.prevClose.toFixed(2)}`,
    });
  }

  stats.push({
    label: "52-Week High",
    value: derived.high52w !== null ? `$${derived.high52w.toFixed(2)}` : "—",
  });
  stats.push({
    label: "52-Week Low",
    value: derived.low52w !== null ? `$${derived.low52w.toFixed(2)}` : "—",
  });

  if (todayVolume !== null) {
    stats.push({
      label: "Volume",
      value: formatVolume(todayVolume),
    });
  }
  if (derived.avgVol20d !== null) {
    stats.push({
      label: "Avg Vol 20d",
      value: formatVolume(derived.avgVol20d),
    });
  }
  if (derived.relVol !== null) {
    stats.push({
      label: "Relative Volume",
      value: `${derived.relVol.toFixed(2)}×`,
      tone: derived.relVol >= 1.5 ? "gain" : undefined,
    });
  }
  if (profile?.marketCapitalization) {
    stats.push({
      label: "Market Cap",
      value: formatMarketCap(profile.marketCapitalization),
    });
  }
  if (profile?.shareOutstanding) {
    stats.push({
      label: "Shares Out",
      value: `${(profile.shareOutstanding / 1000).toFixed(2)}B`,
    });
  }
  if (profile?.ipo) {
    stats.push({ label: "IPO Date", value: profile.ipo });
  }
  if (profile?.country) {
    stats.push({ label: "Country", value: profile.country });
  }

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Key Stats
        </h3>
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between px-3 py-2"
          >
            <dt className="text-muted">{s.label}</dt>
            <dd
              className={cn(
                "font-mono font-medium",
                s.tone === "gain" && "gain",
                s.tone === "loss" && "loss",
              )}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

/** Finnhub returns market cap in millions of USD. */
function formatMarketCap(millions: number): string {
  if (millions >= 1_000_000) return `$${(millions / 1_000_000).toFixed(2)}T`;
  if (millions >= 1_000) return `$${(millions / 1_000).toFixed(2)}B`;
  return `$${millions.toFixed(0)}M`;
}
