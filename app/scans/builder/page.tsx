import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { ScanBuilder } from "@/components/scans/scan-builder";

export const dynamic = "force-dynamic";

export default function ScanBuilderPage() {
  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        <Link
          href="/scans"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          All scans
        </Link>

        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            New custom scan
          </div>
          <h1 className="text-2xl font-semibold">Scan builder</h1>
          <p className="text-sm text-muted mt-1">
            Compose conditions from any combination of indicators (% change,
            relative volume, RSI, MACD, ATR, RS score, market cap) and
            predicates (MA alignment, breakouts, pullbacks, consolidation,
            volume dry-up). Join with AND/OR.
          </p>
        </header>

        <ScanBuilder />
      </div>
    </Shell>
  );
}
