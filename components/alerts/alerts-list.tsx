import Link from "next/link";
import {
  Sprout,
  Rocket,
  Activity,
  Flame,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stageOf, type AlertWithContext } from "@/lib/alerts/queries";

const STAGE_ICON = {
  "pre-breakout": { Icon: Sprout, tone: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" },
  "just-broke-out": { Icon: Rocket, tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
  "established-trend": { Icon: Activity, tone: "text-terminal-700 dark:text-terminal-400 bg-terminal-50 dark:bg-terminal-900/40" },
  momentum: { Icon: Flame, tone: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40" },
} as const;

export function AlertsList({
  alerts,
  variant = "full",
}: {
  alerts: AlertWithContext[];
  variant?: "full" | "compact";
}) {
  if (alerts.length === 0) {
    return (
      <div className="border border-app rounded-md bg-panel px-6 py-10 text-center">
        <p className="text-sm text-muted">No alerts yet.</p>
        <p className="text-xs text-muted mt-1">
          When a scan triggers a fresh symbol, the result lands here and
          fans out to your enabled channels.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-app border border-app rounded-md bg-panel overflow-hidden">
      {alerts.map((a) => {
        const stage = stageOf(a.scan.preset_key);
        const meta = STAGE_ICON[stage as keyof typeof STAGE_ICON] ?? STAGE_ICON.momentum;
        const Icon = meta.Icon;
        const s = a.scanResult.snapshot;
        const pct = s.pctChange1d ?? 0;
        const sign = pct >= 0 ? "+" : "";
        const failed = !!a.error;

        return (
          <li
            key={a.id}
            className={cn(
              "px-3 py-3 flex items-start gap-3",
              variant === "compact" && "px-2 py-2",
            )}
          >
            <span
              className={cn(
                "h-7 w-7 rounded-md grid place-items-center shrink-0",
                meta.tone,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Link
                  href={`/stock/${a.scanResult.symbol}`}
                  className="font-bold font-mono hover:underline"
                >
                  {a.scanResult.symbol}
                </Link>
                <Link
                  href={`/scans/${a.scan.id}`}
                  className="text-xs text-muted hover:underline truncate"
                >
                  {a.scan.name}
                </Link>
                <span className="ml-auto text-[10px] font-mono text-muted">
                  {formatRelativeTime(new Date(a.fired_at).getTime())}
                </span>
              </div>
              <div
                className={cn(
                  "text-xs font-mono mt-1 flex items-center gap-2 flex-wrap",
                  failed && "text-muted",
                )}
              >
                <span>
                  ${s.price?.toFixed(2) ?? "—"}
                </span>
                <span className={cn(pct >= 0 ? "gain" : "loss")}>
                  {sign}
                  {pct.toFixed(2)}%
                </span>
                {s.relVol !== null && (
                  <span className="text-muted">RVol {s.relVol.toFixed(2)}×</span>
                )}
                {s.rsScore !== null && (
                  <span className="text-muted">RS {s.rsScore.toFixed(0)}</span>
                )}
                <span className="text-muted">Conv {s.conviction}/100</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {a.channels.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded",
                      a.delivered_at && !a.error
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : a.delivered_at && a.error
                          ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
                    )}
                  >
                    {c}
                    {a.delivered_at && !a.error && <Check className="h-2.5 w-2.5 inline ml-0.5" />}
                    {a.delivered_at && a.error && <AlertTriangle className="h-2.5 w-2.5 inline ml-0.5" />}
                  </span>
                ))}
                {a.error && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono truncate">
                    {a.error}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
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
