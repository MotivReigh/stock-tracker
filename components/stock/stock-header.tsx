import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TradingViewLink } from "./tradingview-link";
import type { StockDetail } from "@/lib/stock/data";

export function StockHeader({ detail }: { detail: StockDetail }) {
  const { symbol, quote, profile } = detail;
  const up = (quote?.changePercent ?? 0) >= 0;

  return (
    <header className="border-b border-app bg-panel">
      <div className="px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200 mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {/* Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {profile?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo}
                alt=""
                className="h-10 w-10 rounded-md bg-white border border-app object-contain p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 grid place-items-center font-bold font-mono text-sm">
                {symbol.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-bold font-mono tracking-tight">
                  {symbol}
                </h1>
                {profile?.exchange && (
                  <span className="text-[10px] uppercase tracking-wider text-muted font-mono">
                    {profile.exchange}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted truncate">
                {profile?.name ?? "—"}
              </div>
              {profile?.finnhubIndustry && (
                <div className="text-[11px] text-muted mt-0.5">
                  {profile.finnhubIndustry}
                </div>
              )}
            </div>
          </div>

          {/* Price block */}
          {quote && (
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-3xl font-bold tabular">
                ${quote.price.toFixed(2)}
              </div>
              <div
                className={cn(
                  "font-mono text-sm font-semibold",
                  up ? "gain" : "loss",
                )}
              >
                {sign(quote.change)} ({pct(quote.changePercent)})
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-2">
            <TradingViewLink symbol={symbol} />
            {profile?.weburl && (
              <a
                href={profile.weburl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200 px-2 h-8 border border-app rounded-md"
              >
                Company site
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function pct(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function sign(n: number): string {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}`;
}
