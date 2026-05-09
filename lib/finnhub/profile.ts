import { finnhubFetch } from "./client";
import type { FinnhubProfile } from "./types";

export async function fetchProfile(symbol: string): Promise<FinnhubProfile> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}
