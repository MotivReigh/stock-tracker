import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/finnhub/types";
import { RemoveSymbolForm } from "./remove-symbol-form";

export type ItemQuote = {
  symbol: string;
  quote: Quote | null;
  source?: string;
};

export function ItemsTable({
  watchlistId,
  rows,
}: {
  watchlistId: string;
  rows: ItemQuote[];
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-app">
        <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-[13px] uppercase tracking-wider">
            Symbols
          </h3>
        </div>
        <div className="px-6 py-10 text-center text-sm text-muted">
          No symbols yet. Use the form above to add one.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Symbols
        </h3>
        <span className="text-[11px] font-mono text-muted">
          {rows.length} symbol{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-muted uppercase text-[10px] tracking-wider">
            <tr className="border-b border-app">
              <th className="text-left px-3 py-2 font-medium">Sym</th>
              <th className="text-right px-2 py-2 font-medium">Last</th>
              <th className="text-right px-2 py-2 font-medium">Change</th>
              <th className="text-right px-2 py-2 font-medium">% 1D</th>
              <th className="text-right px-2 py-2 font-medium">High</th>
              <th className="text-right px-2 py-2 font-medium">Low</th>
              <th className="text-right px-2 py-2 font-medium w-10">{""}</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(({ symbol, quote }) => {
              if (!quote) {
                return (
                  <tr key={symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2">
                      <Link href={`/stock/${symbol}`} className="font-bold hover:underline">
                        {symbol}
                      </Link>
                    </td>
                    <td colSpan={5} className="px-2 text-right text-muted">
                      (quote unavailable)
                    </td>
                    <td className="px-2 text-right">
                      <RemoveSymbolForm watchlistId={watchlistId} symbol={symbol} />
                    </td>
                  </tr>
                );
              }
              const up = quote.changePercent >= 0;
              return (
                <tr
                  key={symbol}
                  className="hover:bg-terminal-50/40 dark:hover:bg-terminal-700/10"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/stock/${symbol}`}
                      className="font-bold hover:underline"
                    >
                      {symbol}
                    </Link>
                  </td>
                  <td className="px-2 text-right">{quote.price.toFixed(2)}</td>
                  <td className={cn("px-2 text-right", up ? "gain" : "loss")}>
                    {sign(quote.change)}
                  </td>
                  <td className={cn("px-2 text-right font-semibold", up ? "gain" : "loss")}>
                    {pct(quote.changePercent)}
                  </td>
                  <td className="px-2 text-right text-muted">{quote.high.toFixed(2)}</td>
                  <td className="px-2 text-right text-muted">{quote.low.toFixed(2)}</td>
                  <td className="px-2 text-right">
                    <RemoveSymbolForm watchlistId={watchlistId} symbol={symbol} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
