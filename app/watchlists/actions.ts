"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth/user";
import * as wl from "@/lib/watchlists/queries";
import { getCachedQuote } from "@/lib/cache/quoteCache";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(60, "Name is too long");

const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.-]{1,10}$/, "Invalid symbol");

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createWatchlistAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const userId = getCurrentUserId();
  try {
    await wl.createWatchlist(userId, parsed.data);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/watchlists");
  revalidatePath("/");
  return { ok: true };
}

export async function renameWatchlistAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing watchlist id" };
  }
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const userId = getCurrentUserId();
  try {
    await wl.renameWatchlist(userId, id, parsed.data);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  revalidatePath("/watchlists");
  revalidatePath(`/watchlists/${id}`);
  return { ok: true };
}

export async function deleteWatchlistAction(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;
  const userId = getCurrentUserId();
  await wl.deleteWatchlist(userId, id);
  revalidatePath("/watchlists");
  revalidatePath("/");
  redirect("/watchlists");
}

export async function addSymbolAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const watchlistId = formData.get("watchlist_id");
  if (typeof watchlistId !== "string" || watchlistId.length === 0) {
    return { ok: false, error: "Missing watchlist id" };
  }
  const parsed = symbolSchema.safeParse(formData.get("symbol"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const symbol = parsed.data;

  // Verify the symbol resolves to a real quote so we don't pollute lists with typos.
  try {
    const result = await getCachedQuote(symbol);
    const q = result.quote;
    const looksFake =
      q.price === 0 && q.prevClose === 0 && q.high === 0 && q.low === 0;
    if (looksFake) {
      return { ok: false, error: `Symbol ${symbol} not found at Finnhub` };
    }
  } catch (err) {
    return { ok: false, error: `Could not verify ${symbol}: ${(err as Error).message}` };
  }

  try {
    await wl.addItem(watchlistId, symbol);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/watchlists");
  revalidatePath("/");
  revalidatePath(`/stock/${symbol}`);
  return { ok: true };
}

export async function removeSymbolAction(formData: FormData): Promise<void> {
  const watchlistId = formData.get("watchlist_id");
  const symbol = formData.get("symbol");
  if (typeof watchlistId !== "string" || typeof symbol !== "string") return;
  await wl.removeItem(watchlistId, symbol);
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath("/watchlists");
  revalidatePath("/");
  revalidatePath(`/stock/${symbol.toUpperCase()}`);
}

/**
 * Single-step "add this symbol to this list" used by the stock-detail
 * affordance. Same validation as addSymbolAction but assumes the symbol is
 * pre-validated (came from a real stock page).
 */
export async function toggleSymbolInWatchlistAction(
  formData: FormData,
): Promise<void> {
  const watchlistId = formData.get("watchlist_id");
  const symbol = formData.get("symbol");
  const action = formData.get("action"); // "add" | "remove"
  if (
    typeof watchlistId !== "string" ||
    typeof symbol !== "string" ||
    (action !== "add" && action !== "remove")
  ) {
    return;
  }
  if (action === "add") {
    await wl.addItem(watchlistId, symbol);
  } else {
    await wl.removeItem(watchlistId, symbol);
  }
  revalidatePath(`/watchlists/${watchlistId}`);
  revalidatePath(`/stock/${symbol.toUpperCase()}`);
  revalidatePath("/watchlists");
  revalidatePath("/");
}
