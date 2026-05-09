"use client";

import { useLayoutMode, type LayoutMode } from "@/lib/layout-mode";
import { LayoutGrid, Newspaper, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  value: LayoutMode;
  label: string;
  description: string;
  Icon: typeof LayoutGrid;
}> = [
  {
    value: "terminal",
    label: "Terminal",
    description: "Dense data, monospace numbers, indigo accent",
    Icon: LayoutGrid,
  },
  {
    value: "editorial",
    label: "Editorial",
    description: "Serif headlines, newspaper hierarchy, amber accent",
    Icon: Newspaper,
  },
];

export function LayoutModeToggle() {
  const { mode, setMode } = useLayoutMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];
  const CurrentIcon = current.Icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-app bg-transparent px-2.5 h-8 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-64 rounded-md border border-app bg-panel shadow-lg z-50 overflow-hidden"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            const selected = opt.value === mode;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setMode(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                  selected && "bg-slate-50 dark:bg-slate-800",
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-slate-600 dark:text-slate-300" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {opt.label}
                    {selected && (
                      <span className="text-[10px] uppercase tracking-wider text-terminal-600 dark:text-terminal-500">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted leading-snug">
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
