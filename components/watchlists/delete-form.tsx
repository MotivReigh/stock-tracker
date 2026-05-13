"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWatchlistAction } from "@/app/watchlists/actions";

export function DeleteWatchlistForm({
  id,
  name,
  variant = "icon",
}: {
  id: string;
  name: string;
  variant?: "icon" | "full";
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const ok = window.confirm(
      `Delete watchlist "${name}"? Symbols inside will be removed too. This cannot be undone.`,
    );
    if (!ok) e.preventDefault();
  }

  return (
    <form action={deleteWatchlistAction} onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={id} />
      {variant === "icon" ? (
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${name}`}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete list
        </Button>
      )}
    </form>
  );
}
