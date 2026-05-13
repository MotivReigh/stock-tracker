import { cn } from "@/lib/utils";
import type { FinnhubRecommendation } from "@/lib/finnhub/types";

type Bucket = {
  key: keyof Pick<FinnhubRecommendation, "strongBuy" | "buy" | "hold" | "sell" | "strongSell">;
  label: string;
  shortLabel: string;
  /** Tailwind bar color */
  color: string;
  /** Sentiment weighting for the composite score */
  weight: number;
};

const BUCKETS: Bucket[] = [
  { key: "strongBuy",  label: "Strong Buy",  shortLabel: "SB", color: "bg-emerald-600", weight: 2 },
  { key: "buy",        label: "Buy",         shortLabel: "B",  color: "bg-emerald-400", weight: 1 },
  { key: "hold",       label: "Hold",        shortLabel: "H",  color: "bg-slate-400",   weight: 0 },
  { key: "sell",       label: "Sell",        shortLabel: "S",  color: "bg-rose-400",    weight: -1 },
  { key: "strongSell", label: "Strong Sell", shortLabel: "SS", color: "bg-rose-600",    weight: -2 },
];

export function RecommendationsPanel({
  recommendations,
  symbol,
}: {
  recommendations: FinnhubRecommendation[];
  symbol: string;
}) {
  const latest = recommendations[0] ?? null;

  if (!latest) {
    return (
      <div className="border border-app">
        <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-[13px] uppercase tracking-wider">
            Analyst Ratings
          </h3>
        </div>
        <div className="px-4 py-8 text-center text-sm text-muted">
          No analyst coverage for {symbol}.
        </div>
      </div>
    );
  }

  const total =
    latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
  const weighted =
    latest.strongBuy * 2 + latest.buy - latest.sell - latest.strongSell * 2;
  // Score on a -100..100 scale (analysts).
  const score = total > 0 ? Math.round((weighted / (total * 2)) * 100) : 0;
  const sentiment = scoreLabel(score);

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Analyst Ratings
        </h3>
        <span className="text-[10px] font-mono text-muted">
          {formatPeriod(latest.period)} · {total} analysts
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Composite */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted uppercase tracking-wider">
              Composite
            </div>
            <div
              className={cn(
                "font-mono font-bold text-2xl mt-0.5",
                sentiment.tone,
              )}
            >
              {sentiment.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted uppercase tracking-wider">
              Score
            </div>
            <div className={cn("font-mono font-bold text-2xl mt-0.5", sentiment.tone)}>
              {score >= 0 ? "+" : ""}
              {score}
            </div>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="flex w-full h-3 rounded overflow-hidden bg-slate-100 dark:bg-slate-800">
          {BUCKETS.map((b) => {
            const count = latest[b.key];
            const width = total > 0 ? (count / total) * 100 : 0;
            if (width === 0) return null;
            return (
              <div
                key={b.key}
                className={b.color}
                style={{ width: `${width}%` }}
                title={`${b.label}: ${count}`}
              />
            );
          })}
        </div>

        {/* Per-bucket counts */}
        <ul className="grid grid-cols-5 gap-1 text-center">
          {BUCKETS.map((b) => {
            const count = latest[b.key];
            return (
              <li key={b.key} className="border border-app rounded px-1 py-1.5">
                <div className="text-[9px] uppercase tracking-wider text-muted">
                  {b.shortLabel}
                </div>
                <div className="font-mono font-bold text-sm">{count}</div>
              </li>
            );
          })}
        </ul>

        {/* Trend across periods */}
        {recommendations.length > 1 && (
          <div className="pt-2 border-t border-app">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
              Trend
            </div>
            <ul className="space-y-1 text-xs font-mono">
              {recommendations.slice(0, 4).map((r) => {
                const t =
                  r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
                const w =
                  r.strongBuy * 2 + r.buy - r.sell - r.strongSell * 2;
                const s = t > 0 ? Math.round((w / (t * 2)) * 100) : 0;
                return (
                  <li
                    key={r.period}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted">{formatPeriod(r.period)}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted">{t} an.</span>
                      <span className={cn("font-semibold", scoreLabel(s).tone)}>
                        {s >= 0 ? "+" : ""}
                        {s}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPeriod(period: string): string {
  // Finnhub returns "YYYY-MM-DD" (always month-start).
  const d = new Date(period + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function scoreLabel(score: number): { label: string; tone: string } {
  if (score >= 65) return { label: "Strong Buy", tone: "gain" };
  if (score >= 25) return { label: "Buy", tone: "gain" };
  if (score >= -25) return { label: "Hold", tone: "text-slate-700 dark:text-slate-300" };
  if (score >= -65) return { label: "Sell", tone: "loss" };
  return { label: "Strong Sell", tone: "loss" };
}
