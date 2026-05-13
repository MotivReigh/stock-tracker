import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Radar } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { ResultsTable } from "@/components/scans/results-table";
import { RunNowButton } from "@/components/scans/run-now-button";
import { DeleteScanForm } from "@/components/scans/delete-scan-form";
import { BarsStatusBanner } from "@/components/scans/bars-status-banner";
import { getCurrentUserId } from "@/lib/auth/user";
import { getScan, listLatestResults } from "@/lib/scans/queries";
import { countSymbolsWithBars } from "@/lib/bars/queries";
import { listUniverse } from "@/lib/universe/queries";
import type { ScanDefinition, ScanCondition } from "@/lib/scans/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScanResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = getCurrentUserId();

  const [scan, withBarsCount, universe] = await Promise.all([
    getScan(userId, id),
    countSymbolsWithBars(),
    listUniverse(),
  ]);

  if (!scan) notFound();

  const results = await listLatestResults(scan.id, 200);

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <Link
          href="/scans"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          All scans
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1 flex items-center gap-2">
              <Radar className="h-3 w-3" />
              {scan.type === "preset" ? "Preset scan" : "Custom scan"}
            </div>
            <h1 className="text-2xl font-semibold">{scan.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <RunNowButton scanId={scan.id} />
            {scan.type === "custom" && (
              <DeleteScanForm id={scan.id} name={scan.name} variant="full" />
            )}
          </div>
        </header>

        <DefinitionSummary definition={scan.definition} />

        <BarsStatusBanner
          withBarsCount={withBarsCount}
          universeCount={universe.length}
        />

        <ResultsTable scanId={scan.id} results={results} />
      </div>
    </Shell>
  );
}

function DefinitionSummary({ definition }: { definition: ScanDefinition }) {
  return (
    <section className="border border-app bg-panel rounded-md p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
        Definition · {definition.conditions.length}{" "}
        {definition.conditions.length === 1 ? "condition" : "conditions"}{" "}
        joined by{" "}
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 uppercase">
          {definition.combinator}
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {definition.conditions.map((c, i) => (
          <li key={i} className="font-mono text-xs">
            <span className="text-muted">{i + 1}.</span> {describeCondition(c)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function describeCondition(c: ScanCondition): string {
  if (c.kind === "predicate") {
    return `${humanPredicate(c.predicate)} ${c.expected ? "is true" : "is false"}`;
  }
  const ind = humanIndicator(c.indicator);
  if (c.operator === "between") {
    return `${ind} between ${c.value} and ${c.valueHi ?? "?"}`;
  }
  return `${ind} ${c.operator} ${c.value}`;
}

function humanIndicator(i: string): string {
  const map: Record<string, string> = {
    price: "Price",
    pctChange1d: "% change 1D",
    pctChange5d: "% change 1W",
    pctChange21d: "% change 1M",
    pctChange63d: "% change 3M",
    relVol: "Relative volume",
    rsScore: "RS score",
    rsi: "RSI(14)",
    macdHistogram: "MACD histogram",
    smaSlope20: "SMA20 slope %",
    atrPct: "ATR % of price",
    fiftyTwoWeekHighDistance: "Days since 52W high",
    marketCap: "Market cap (USD)",
  };
  return map[i] ?? i;
}

function humanPredicate(p: string): string {
  const map: Record<string, string> = {
    maAligned: "MA alignment (20>50>200)",
    maCompression: "MA compression",
    breakout52wHigh: "52-week high breakout",
    breakout50dHigh: "50-day high breakout",
    tightConsolidation: "Tight consolidation",
    volumeDryUp: "Volume dry-up",
    pullbackToMa20: "Pullback to 20-MA",
    pullbackToMa50: "Pullback to 50-MA",
  };
  return map[p] ?? p;
}
