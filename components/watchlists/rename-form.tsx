"use client";

import { useActionState, useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renameWatchlistAction, type ActionResult } from "@/app/watchlists/actions";

export function RenameWatchlistForm({
  id,
  currentName,
}: {
  id: string;
  currentName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await renameWatchlistAction(prev, formData);
      if (result.ok) setEditing(false);
      return result;
    },
    null,
  );

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200"
      >
        <Pencil className="h-3 w-3" />
        Rename
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        name="name"
        type="text"
        defaultValue={currentName}
        required
        maxLength={60}
        autoFocus
        className="bg-slate-50 dark:bg-slate-900 border border-app rounded-md px-2 h-7 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
      />
      <Button type="submit" size="sm" disabled={pending}>
        <Check className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setEditing(false)}
      >
        <X className="h-3 w-3" />
      </Button>
      {state && !state.ok && (
        <span className="text-xs text-rose-600 dark:text-rose-400">
          {state.error}
        </span>
      )}
    </form>
  );
}
