"use client";

import Link from "next/link";
import { Bell, Search, TrendingUp } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LayoutModeToggle } from "./layout-mode-toggle";
import { MobileDrawer } from "./mobile-drawer";

export function TopNav() {
  return (
    <header className="bg-panel border-b border-app sticky top-0 z-30">
      <div className="px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-4">
        <MobileDrawer />

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-terminal-500 to-terminal-700 grid place-items-center">
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight">Updraft</span>
        </Link>

        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search ticker, company, scan…"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md pl-9 pr-14 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted bg-panel border border-app rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LayoutModeToggle />
          <Link
            href="/alerts"
            aria-label="Alerts"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <ThemeToggle />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 grid place-items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
            TH
          </div>
        </div>
      </div>
    </header>
  );
}
