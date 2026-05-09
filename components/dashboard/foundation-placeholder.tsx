"use client";

import { useLayoutMode } from "@/lib/layout-mode";
import { CheckCircle2, Circle } from "lucide-react";

const PHASES = [
  { num: 1, title: "Foundation", description: "Scaffold, layout, theme, password gate", done: true },
  { num: 2, title: "Data layer", description: "Finnhub client + token bucket, Redis cache, Supabase schema, universe seed (143 symbols), API routes", done: true },
  { num: 3, title: "Dashboard", description: "Top movers, sectors, watchlist, alerts, news", done: false },
  { num: 4, title: "Stock detail", description: "Charts, key stats, news, journal", done: false },
  { num: 5, title: "Watchlists", description: "CRUD for unlimited named lists", done: false },
  { num: 6, title: "Scans", description: "10 presets + custom builder + scan engine", done: false },
  { num: 7, title: "Alerts", description: "Web Push + Slack webhook + dispatcher", done: false },
  { num: 8, title: "Journal", description: "Per-stock markdown notes", done: false },
  { num: 9, title: "Polish", description: "Mobile pass, empty states, disclaimers", done: false },
  { num: 10, title: "Deploy", description: "Vercel + Supabase + Upstash + cron", done: false },
];

export function FoundationPlaceholder() {
  const { mode } = useLayoutMode();

  if (mode === "editorial") {
    return (
      <div className="px-4 sm:px-8 py-6 max-w-[1400px] mx-auto">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-3">
          The Trend Edition · Foundation
        </div>
        <div className="border-t-2 border-ink dark:border-slate-200 mb-6" />
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight mb-4">
          Updraft has lift-off
        </h1>
        <p className="font-serif text-lg text-slate-700 dark:text-slate-300 leading-snug max-w-2xl mb-8">
          Phase 1 complete. The shell, navigation, light/dark theme, layout-mode
          switcher, and password gate are wired. Phases 2 through 10 follow on
          deck — data layer, dashboard, stock detail, scans, alerts, journal,
          polish, deploy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
          {PHASES.map((p) => (
            <div
              key={p.num}
              className="flex items-baseline gap-3 border-b border-slate-300 dark:border-slate-700 py-2"
            >
              <span className="font-mono text-sm text-muted w-6 shrink-0">
                {String(p.num).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold flex items-center gap-2">
                  {p.title}
                  {p.done && (
                    <span className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-semibold">
                      Done
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted">{p.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Terminal mode (default)
  return (
    <div className="p-3 md:p-4">
      <div className="border border-app">
        <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h1 className="font-bold text-[13px] uppercase tracking-wider">
            Updraft · Build Status
          </h1>
          <span className="text-[10px] font-mono text-muted">
            v0.1 · phase 1 · foundation up
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-muted uppercase text-[10px] tracking-wider">
            <tr className="border-b border-app">
              <th className="text-left px-3 py-2 font-medium w-12">#</th>
              <th className="text-left px-2 py-2 font-medium w-24">Status</th>
              <th className="text-left px-2 py-2 font-medium">Phase</th>
              <th className="text-left px-2 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {PHASES.map((p) => (
              <tr key={p.num} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2 font-mono text-muted">
                  {String(p.num).padStart(2, "0")}
                </td>
                <td className="px-2 py-2">
                  {p.done ? (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted px-1.5 py-0.5 uppercase tracking-wider">
                      <Circle className="h-3 w-3" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 font-semibold">{p.title}</td>
                <td className="px-2 py-2 text-muted">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-app text-[11px] font-mono text-muted">
          layout=terminal · switch via dropdown in top nav · same data, different presentation
        </div>
      </div>
    </div>
  );
}
