import Link from "next/link";
import { Radar, Sprout, Rocket, Activity, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteScanForm } from "./delete-scan-form";
import type { ScanRow } from "@/lib/scans/queries";
import type { ScanStage } from "@/lib/scans/types";

const STAGE_META: Record<ScanStage, { label: string; Icon: typeof Sprout; color: string }> = {
  "pre-breakout": { label: "Pre-Breakout", Icon: Sprout, color: "text-amber-700 dark:text-amber-400" },
  "just-broke-out": { label: "Just Broke Out", Icon: Rocket, color: "text-emerald-700 dark:text-emerald-400" },
  "established-trend": { label: "Established Trend", Icon: Activity, color: "text-terminal-700 dark:text-terminal-400" },
  momentum: { label: "Momentum", Icon: Flame, color: "text-rose-700 dark:text-rose-400" },
};

function stageFromPresetKey(key: string | null): ScanStage {
  if (!key) return "momentum";
  if (key.startsWith("pre-")) return "pre-breakout";
  if (key.startsWith("break-")) return "just-broke-out";
  if (key.startsWith("trend-")) return "established-trend";
  return "momentum";
}

export function ScanCard({
  scan,
  hitCount,
  lastTriggered,
}: {
  scan: ScanRow;
  hitCount: number;
  lastTriggered: string | null;
}) {
  const stage = stageFromPresetKey(scan.preset_key);
  const meta = STAGE_META[stage];
  const Icon = scan.type === "custom" ? Radar : meta.Icon;

  return (
    <div className="border border-app bg-panel rounded-md p-4 flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <Link
          href={`/scans/${scan.id}`}
          className="flex items-start gap-2.5 min-w-0 group flex-1"
        >
          <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.color)} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate group-hover:underline">
              {scan.name}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  meta.color,
                )}
              >
                {scan.type === "custom" ? "Custom" : meta.label}
              </span>
              <span className="text-xs text-muted">
                {scan.definition.conditions.length} condition
                {scan.definition.conditions.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </Link>
        {scan.type === "custom" && (
          <DeleteScanForm id={scan.id} name={scan.name} />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-muted">
          {hitCount > 0 ? (
            <span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {hitCount}
              </span>{" "}
              hit{hitCount === 1 ? "" : "s"}
              {lastTriggered && (
                <span className="text-muted">
                  {" · "}
                  {formatRelativeTime(new Date(lastTriggered).getTime())}
                </span>
              )}
            </span>
          ) : (
            <span>Not run yet</span>
          )}
        </div>
        <Link
          href={`/scans/${scan.id}`}
          className="text-terminal-700 dark:text-terminal-400 hover:underline font-medium"
        >
          Open →
        </Link>
      </div>
    </div>
  );
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
