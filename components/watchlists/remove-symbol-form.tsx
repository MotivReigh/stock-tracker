"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeSymbolAction } from "@/app/watchlists/actions";

export function RemoveSymbolForm({
  watchlistId,
  symbol,
}: {
  watchlistId: string;
  symbol: string;
}) {
  return (
    <form action={removeSymbolAction}>
      <input type="hidden" name="watchlist_id" value={watchlistId} />
      <input type="hidden" name="symbol" value={symbol} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${symbol}`}
        className="text-muted hover:text-rose-600 dark:hover:text-rose-400"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}
