import { cn } from "@/lib/utils";
import type { StockDetail } from "@/lib/stock/data";

type Stat = { label: string; value: string; tone?: "gain" | "loss" };

export function KeyStats({ detail }: { detail: StockDetail }) {
  const { quote, profile, derived, bars, metrics } = detail;
  const todayVolume = bars.length > 0 ? bars[bars.length - 1].volume : null;

  /* ----------------------------- Price & range ---------------------------- */
  const priceStats: Stat[] = [];
  if (quote) {
    priceStats.push({
      label: "Day Range",
      value: `$${quote.low.toFixed(2)} – $${quote.high.toFixed(2)}`,
    });
    priceStats.push({ label: "Open", value: `$${quote.open.toFixed(2)}` });
    priceStats.push({
      label: "Prev Close",
      value: `$${quote.prevClose.toFixed(2)}`,
    });
  }
  // Prefer Finnhub's 52w numbers when available; fall back to derived from bars.
  const hi52 = metrics?.["52WeekHigh"] ?? derived.high52w;
  const lo52 = metrics?.["52WeekLow"] ?? derived.low52w;
  if (hi52 !== null && hi52 !== undefined) {
    priceStats.push({ label: "52-Week High", value: `$${hi52.toFixed(2)}` });
  }
  if (lo52 !== null && lo52 !== undefined) {
    priceStats.push({ label: "52-Week Low", value: `$${lo52.toFixed(2)}` });
  }

  /* -------------------------------- Volume ------------------------------- */
  const volStats: Stat[] = [];
  if (todayVolume !== null) {
    volStats.push({ label: "Volume", value: formatVolume(todayVolume) });
  }
  const avgVol10d = metrics?.["10DayAverageTradingVolume"];
  if (avgVol10d) {
    volStats.push({
      label: "Avg Vol 10d",
      value: `${avgVol10d.toFixed(2)}M`,
    });
  } else if (derived.avgVol20d !== null) {
    volStats.push({
      label: "Avg Vol 20d",
      value: formatVolume(derived.avgVol20d),
    });
  }
  const avgVol3m = metrics?.["3MonthAverageTradingVolume"];
  if (avgVol3m) {
    volStats.push({ label: "Avg Vol 3m", value: `${avgVol3m.toFixed(2)}M` });
  }
  if (derived.relVol !== null) {
    volStats.push({
      label: "Relative Volume",
      value: `${derived.relVol.toFixed(2)}×`,
      tone: derived.relVol >= 1.5 ? "gain" : undefined,
    });
  }

  /* ------------------------------ Valuation ------------------------------ */
  const valStats: Stat[] = [];
  if (profile?.marketCapitalization) {
    valStats.push({
      label: "Market Cap",
      value: formatMarketCap(profile.marketCapitalization),
    });
  }
  const pe = metrics?.peBasicExclExtraTTM ?? metrics?.peExclExtraAnnual;
  if (pe !== undefined && pe !== null) {
    valStats.push({ label: "P/E (TTM)", value: pe.toFixed(2) });
  }
  const eps = metrics?.epsBasicExclExtraItemsTTM ?? metrics?.epsTTM;
  if (eps !== undefined && eps !== null) {
    valStats.push({ label: "EPS (TTM)", value: `$${eps.toFixed(2)}` });
  }
  if (metrics?.pbAnnual !== undefined) {
    valStats.push({ label: "P/B", value: metrics.pbAnnual.toFixed(2) });
  }
  if (metrics?.psAnnual !== undefined) {
    valStats.push({ label: "P/S", value: metrics.psAnnual.toFixed(2) });
  }
  if (metrics?.beta !== undefined) {
    valStats.push({ label: "Beta", value: metrics.beta.toFixed(2) });
  }
  const divYield = metrics?.dividendYieldIndicatedAnnual;
  if (divYield !== undefined && divYield !== null) {
    valStats.push({
      label: "Dividend Yield",
      value: `${divYield.toFixed(2)}%`,
    });
  }
  if (metrics?.dividendsPerShareAnnual) {
    valStats.push({
      label: "Div / Share",
      value: `$${metrics.dividendsPerShareAnnual.toFixed(2)}`,
    });
  }

  /* ------------------------------- Returns ------------------------------- */
  const returnStats: Stat[] = [];
  const pushReturn = (label: string, value: number | undefined) => {
    if (value === undefined || value === null) return;
    returnStats.push({
      label,
      value: `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`,
      tone: value >= 0 ? "gain" : "loss",
    });
  };
  pushReturn("Return · 5D", metrics?.["5DayPriceReturnDaily"]);
  pushReturn("Return · MTD", metrics?.monthToDatePriceReturnDaily);
  pushReturn("Return · 13W", metrics?.["13WeekPriceReturnDaily"]);
  pushReturn("Return · 26W", metrics?.["26WeekPriceReturnDaily"]);
  pushReturn("Return · YTD", metrics?.ytdPriceReturnDaily);
  pushReturn("Return · 52W", metrics?.["52WeekPriceReturnDaily"]);

  /* ------------------------------- Company ------------------------------- */
  const companyStats: Stat[] = [];
  if (profile?.shareOutstanding) {
    companyStats.push({
      label: "Shares Out",
      value: `${(profile.shareOutstanding / 1000).toFixed(2)}B`,
    });
  }
  if (metrics?.roeTTM !== undefined) {
    companyStats.push({
      label: "ROE (TTM)",
      value: `${metrics.roeTTM.toFixed(2)}%`,
    });
  }
  if (metrics?.bookValuePerShareAnnual !== undefined) {
    companyStats.push({
      label: "Book Value / Share",
      value: `$${metrics.bookValuePerShareAnnual.toFixed(2)}`,
    });
  }
  if (profile?.ipo) {
    companyStats.push({ label: "IPO Date", value: profile.ipo });
  }
  if (profile?.country) {
    companyStats.push({ label: "Country", value: profile.country });
  }

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Key Stats
        </h3>
      </div>
      <div className="divide-y divide-app">
        <StatSection title="Price" stats={priceStats} />
        <StatSection title="Volume" stats={volStats} />
        <StatSection title="Valuation" stats={valStats} />
        <StatSection title="Returns" stats={returnStats} />
        <StatSection title="Company" stats={companyStats} />
      </div>
    </div>
  );
}

function StatSection({ title, stats }: { title: string; stats: Stat[] }) {
  if (stats.length === 0) return null;
  return (
    <div>
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">
        {title}
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between px-3 py-1.5"
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
