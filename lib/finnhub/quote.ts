import { finnhubFetch } from "./client";
import { normalizeQuote, type FinnhubQuote, type Quote } from "./types";

export async function fetchQuote(symbol: string): Promise<Quote> {
  const raw = await finnhubFetch<FinnhubQuote>("/quote", { symbol });
  return normalizeQuote(symbol, raw);
}
