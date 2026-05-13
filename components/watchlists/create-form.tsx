"use client";

import { useActionState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWatchlistAction, type ActionResult } from "@/app/watchlists/actions";

export function CreateWatchlistForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createWatchlistAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      // Clear input on successful create so the user can keep adding.
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          name="name"
          type="text"
          placeholder="New watchlist name (e.g. Semis, Owned, Pre-Breakout)"
          required
          maxLength={60}
          autoComplete="off"
          className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
        />
      </div>
      <Button type="submit" disabled={pending} size="md">
        <Plus className="h-4 w-4" />
        {pending ? "Creating…" : "Create list"}
      </Button>
      {state && !state.ok && (
        <p className="text-sm text-rose-600 dark:text-rose-400 sm:basis-full">
          {state.error}
        </p>
      )}
    </form>
  );
}
