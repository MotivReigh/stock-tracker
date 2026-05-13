"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  LayoutGrid,
  Newspaper,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { useLayoutMode, type LayoutMode } from "@/lib/layout-mode";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark";

export function DisplayPreferences() {
  const { theme, setTheme } = useTheme();
  const { mode, setMode } = useLayoutMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentTheme: ThemeChoice = mounted && theme === "dark" ? "dark" : "light";

  return (
    <section className="border border-app rounded-md bg-panel p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 grid place-items-center">
          <Palette className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Display</h3>
          <p className="text-xs text-muted">
            Theme and dashboard layout. Both choices are stored locally and
            apply immediately.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[11px] uppercase tracking-wider font-semibold text-muted">
          Theme
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceTile
            label="Light"
            description="Cream paper, ink type"
            Icon={Sun}
            selected={currentTheme === "light"}
            onClick={() => setTheme("light")}
            disabled={!mounted}
          />
          <ChoiceTile
            label="Dark"
            description="Slate panel, soft contrast"
            Icon={Moon}
            selected={currentTheme === "dark"}
            onClick={() => setTheme("dark")}
            disabled={!mounted}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-[11px] uppercase tracking-wider font-semibold text-muted">
          Dashboard layout
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceTile
            label="Terminal"
            description="Dense tables, monospace, indigo"
            Icon={LayoutGrid}
            selected={mode === "terminal"}
            onClick={() => setMode("terminal" as LayoutMode)}
          />
          <ChoiceTile
            label="Editorial"
            description="Serif headlines, newspaper, amber"
            Icon={Newspaper}
            selected={mode === "editorial"}
            onClick={() => setMode("editorial" as LayoutMode)}
          />
        </div>
      </fieldset>
    </section>
  );
}

function ChoiceTile({
  label,
  description,
  Icon,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  Icon: typeof Sun;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        selected
          ? "border-terminal-500 bg-terminal-50 dark:bg-terminal-900/30"
          : "border-app bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          selected
            ? "text-terminal-700 dark:text-terminal-300"
            : "text-slate-600 dark:text-slate-300",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium flex items-center gap-2">
          {label}
          {selected && (
            <span className="text-[10px] uppercase tracking-wider text-terminal-600 dark:text-terminal-400">
              Current
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted leading-snug">{description}</p>
      </div>
    </button>
  );
}
