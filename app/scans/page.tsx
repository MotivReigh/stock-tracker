import Link from "next/link";
import { Radar, Plus } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { ScanCard } from "@/components/scans/scan-card";
import { BarsStatusBanner } from "@/components/scans/bars-status-banner";
import { getCurrentUserId } from "@/lib/auth/user";
import { listScans, listLatestResults } from "@/lib/scans/queries";
import { countSymbolsWithBars } from "@/lib/bars/queries";
import { listUniverse } from "@/lib/universe/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ScansPage() {
  const userId = getCurrentUserId();
  const [scans, withBarsCount, universe] = await Promise.all([
    listScans(userId),
    countSymbolsWithBars(),
    listUniverse(),
  ]);

  // Fetch hit counts in parallel per scan (last 24h).
  const hitInfo = await Promise.all(
    scans.map(async (s) => {
      const recent = await listLatestResults(s.id, 100);
      return {
        scanId: s.id,
        count: recent.length,
        lastTriggered: recent[0]?.triggered_at ?? null,
      };
    }),
  );
  const hitMap = new Map(hitInfo.map((h) => [h.scanId, h]));

  const presets = scans.filter((s) => s.type === "preset");
  const custom = scans.filter((s) => s.type === "custom");

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
              Phase 6 · Scans
            </div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Radar className="h-6 w-6 text-terminal-600 dark:text-terminal-400" />
              Trend scans
            </h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              Ten built-in scans across pre-breakout, just-broke-out, and
              established-trend stages, plus your custom builds. Each scan
              evaluates the universe against signal conditions and reports
              symbols that satisfy them.
            </p>
          </div>
          <Link
            href="/scans/builder"
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-terminal-600 hover:bg-terminal-700 text-white px-3 h-9 rounded-md"
          >
            <Plus className="h-4 w-4" />
            New custom scan
          </Link>
        </header>

        <BarsStatusBanner
          withBarsCount={withBarsCount}
          universeCount={universe.length}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Preset scans{" "}
            <span className="text-xs text-muted font-normal">
              · {presets.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presets.map((s) => {
              const info = hitMap.get(s.id);
              return (
                <ScanCard
                  key={s.id}
                  scan={s}
                  hitCount={info?.count ?? 0}
                  lastTriggered={info?.lastTriggered ?? null}
                />
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Custom scans{" "}
            <span className="text-xs text-muted font-normal">
              · {custom.length}
            </span>
          </h2>
          {custom.length === 0 ? (
            <div className="border border-app rounded-md bg-panel px-6 py-10 text-center">
              <p className="text-sm text-muted">No custom scans yet.</p>
              <Link
                href="/scans/builder"
                className="text-sm font-medium text-terminal-700 dark:text-terminal-400 mt-2 inline-block hover:underline"
              >
                Build one →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {custom.map((s) => {
                const info = hitMap.get(s.id);
                return (
                  <ScanCard
                    key={s.id}
                    scan={s}
                    hitCount={info?.count ?? 0}
                    lastTriggered={info?.lastTriggered ?? null}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
