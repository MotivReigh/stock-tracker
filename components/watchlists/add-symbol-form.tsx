"use client";

import { useActionState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSymbolAction, type ActionResult } from "@/app/watchlists/actions";
import type { UniverseRow } from "@/lib/universe/queries";

export function AddSymbolForm({
  watchlistId,
  universe,
}: {
  watchlistId: string;
  universe: UniverseRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    addSymbolAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [state]);

  const datalistId = `universe-options-${watchlistId}`;

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <input type="hidden" name="watchlist_id" value={watchlistId} />
        <div className="flex-1 min-w-0">
          <input
            ref={inputRef}
            name="symbol"
            type="text"
            list={datalistId}
            placeholder="Add ticker (e.g. NVDA, MU, SPY)…"
            required
            maxLength={10}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 h-9 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
          />
          <datalist id={datalistId}>
            {universe.map((row) => (
              <option key={row.symbol} value={row.symbol}>
                {row.name}
              </option>
            ))}
          </datalist>
        </div>
        <Button type="submit" disabled={pending} size="md">
          <Plus className="h-4 w-4" />
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {state && !state.ok && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
    </form>
  );
}
