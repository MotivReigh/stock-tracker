"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-app bg-panel min-h-[calc(100vh-3.5rem-1.5rem)]">
      <nav className="px-3 py-5 space-y-0.5 text-sm">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                active
                  ? "bg-terminal-50 text-terminal-700 font-medium dark:bg-terminal-700/20 dark:text-terminal-100"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
