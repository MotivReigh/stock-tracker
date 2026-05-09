import { cn } from "@/lib/utils";
import type { IndexRow } from "@/lib/dashboard/data";

export function TickerTape({
  rows,
  variant = "terminal",
  marketOpen,
}: {
  rows: IndexRow[];
  variant?: "terminal" | "editorial";
  marketOpen: boolean;
}) {
  if (variant === "editorial") {
    return (
      <section className="px-4 sm:px-8 py-3 border-b border-stone-300 dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.ticker} className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted uppercase tracking-wider">
                {r.label}
              </span>
              <span className="font-mono font-semibold">
                {r.price !== null ? r.price.toFixed(2) : "—"}
              </span>
              <span
                className={cn(
                  "font-mono text-xs",
                  (r.changePercent ?? 0) >= 0 ? "gain" : "loss",
                )}
              >
                {r.changePercent !== null ? formatPct(r.changePercent) : "—"}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="border-y border-app bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-1 text-[12px] font-mono whitespace-nowrap overflow-x-auto">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider",
            marketOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              marketOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400",
            )}
          />
          {marketOpen ? "OPEN" : "CLOSED"}
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        {rows.map((r, i) => (
          <span key={r.ticker} className="contents">
            <span className="text-muted">{r.label}</span>
            <span className="font-semibold">
              {r.price !== null ? r.price.toFixed(2) : "—"}
            </span>
            <span
              className={cn(
                (r.changePercent ?? 0) >= 0 ? "gain" : "loss",
              )}
            >
              {r.changePercent !== null ? formatPct(r.changePercent) : "—"}
            </span>
            {i < rows.length - 1 && (
              <span className="text-slate-300 dark:text-slate-700">|</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
