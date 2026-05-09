import { finnhubFetch } from "./client";
import type { FinnhubNewsItem } from "./types";
import { format } from "date-fns";

export async function fetchCompanyNews(
  symbol: string,
  from: Date,
  to: Date,
): Promise<FinnhubNewsItem[]> {
  return finnhubFetch<FinnhubNewsItem[]>("/company-news", {
    symbol,
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
  });
}
