"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { markResultSeenAction } from "@/app/scans/actions";
import { Button } from "@/components/ui/button";
import type { ScanResultRow } from "@/lib/scans/queries";
import type { ResultSnapshot } from "@/lib/scans/types";

type SortKey =
  | "symbol"
  | "price"
  | "pctChange1d"
  | "pctChange5d"
  | "pctChange21d"
  | "pctChange63d"
  | "relVol"
  | "rsScore"
  | "rsi"
  | "conviction";

type SortDir = "asc" | "desc";

export function ResultsTable({
  scanId,
  results,
}: {
  scanId: string;
  results: ScanResultRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("conviction");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSeen, setShowSeen] = useState(true);

  const filtered = useMemo(
    () => (showSeen ? results : results.filter((r) => !r.seen_at)),
    [results, showSeen],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const av = pickSortValue(a.snapshot, a.symbol, sortKey);
      const bv = pickSortValue(b.snapshot, b.symbol, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (results.length === 0) {
    return (
      <div className="border border-app">
        <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-[13px] uppercase tracking-wider">
            Results
          </h3>
        </div>
        <div className="px-4 py-10 text-center text-sm text-muted">
          No results yet. Click <span className="font-medium">Run now</span>{" "}
          above to execute this scan against current bars.
        </div>
      </div>
    );
  }

  const unseenCount = results.filter((r) => !r.seen_at).length;

  return (
    <div className="border border-app">
      <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-3">
        <h3 className="font-bold text-[13px] uppercase tracking-wider">
          Results
        </h3>
        <span className="text-[11px] font-mono text-muted">
          {sorted.length} of {results.length} · {unseenCount} unseen
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showSeen}
            onChange={(e) => setShowSeen(e.target.checked)}
            className="accent-terminal-600"
          />
          Show seen
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-muted uppercase text-[10px] tracking-wider">
            <tr className="border-b border-app">
              <Th label="Sym" sortKey="symbol" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Last" sortKey="price" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="%1D" sortKey="pctChange1d" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="%1W" sortKey="pctChange5d" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="%1M" sortKey="pctChange21d" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="%3M" sortKey="pctChange63d" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="RVol" sortKey="relVol" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="RS" sortKey="rsScore" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="RSI" sortKey="rsi" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="MA" current={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Conv" sortKey="conviction" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <th className="text-right px-2 py-2 font-medium">{""}</th>
            </tr>
          </thead>
          <tbody className="font-mono divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((row) => {
              const s = row.snapshot;
              const seen = !!row.seen_at;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-terminal-50/40 dark:hover:bg-terminal-700/10",
                    seen && "opacity-60",
                  )}
                >
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/stock/${row.symbol}`}
                      className="font-bold hover:underline"
                    >
                      {row.symbol}
                    </Link>
                  </td>
                  <td className="px-2 text-right">{fmtNum(s.price, 2)}</td>
                  <td className={cn("px-2 text-right", tone(s.pctChange1d))}>
                    {fmtPct(s.pctChange1d)}
                  </td>
                  <td className={cn("px-2 text-right", tone(s.pctChange5d))}>
                    {fmtPct(s.pctChange5d)}
                  </td>
                  <td className={cn("px-2 text-right", tone(s.pctChange21d))}>
                    {fmtPct(s.pctChange21d)}
                  </td>
                  <td className={cn("px-2 text-right", tone(s.pctChange63d))}>
                    {fmtPct(s.pctChange63d)}
                  </td>
                  <td className="px-2 text-right">{fmtNum(s.relVol, 2, "×")}</td>
                  <td className="px-2 text-right">{fmtNum(s.rsScore, 0)}</td>
                  <td className="px-2 text-right">{fmtNum(s.rsi, 0)}</td>
                  <td className="px-2 text-[10px] text-muted">{s.maLabel ?? "—"}</td>
                  <td className="px-2 text-right font-semibold">
                    {fmtNum(s.conviction, 0)}
                  </td>
                  <td className="px-2 text-right">
                    {!seen && (
                      <MarkSeenButton resultId={row.id} scanId={scanId} />
                    )}
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

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey?: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = sortKey === current;
  return (
    <th
      className={cn(
        "px-2 py-2 font-medium",
        align === "right" ? "text-right" : "text-left",
        sortKey ? "cursor-pointer select-none" : "",
      )}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp className="h-2.5 w-2.5" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5" />
          )
        ) : null}
      </span>
    </th>
  );
}

function MarkSeenButton({
  resultId,
  scanId,
}: {
  resultId: string;
  scanId: string;
}) {
  return (
    <form action={markResultSeenAction}>
      <input type="hidden" name="result_id" value={resultId} />
      <input type="hidden" name="scan_id" value={scanId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="Mark as seen"
        className="text-muted hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <Check className="h-3 w-3" />
      </Button>
    </form>
  );
}

function pickSortValue(
  s: ResultSnapshot,
  symbol: string,
  key: SortKey,
): number | string | null {
  if (key === "symbol") return symbol;
  return s[key];
}

function fmtNum(
  n: number | null,
  precision: number,
  suffix: string = "",
): string {
  if (n === null) return "—";
  return n.toFixed(precision) + suffix;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function tone(n: number | null): string | undefined {
  if (n === null) return undefined;
  return n >= 0 ? "gain" : "loss";
}
