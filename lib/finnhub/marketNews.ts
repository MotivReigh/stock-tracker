import { finnhubFetch } from "./client";
import type { FinnhubNewsItem } from "./types";

/** General market news. Free-tier endpoint. */
export async function fetchGeneralNews(
  category: "general" | "forex" | "crypto" | "merger" = "general",
): Promise<FinnhubNewsItem[]> {
  return finnhubFetch<FinnhubNewsItem[]>("/news", { category });
}
