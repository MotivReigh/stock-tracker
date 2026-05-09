/**
 * Curated list of the most-watched US large/mid caps within our universe.
 * Used as the default population for "Top Movers" before the user configures
 * watchlists or scans of their own.
 *
 * 25 symbols × ~1 Finnhub call on cache miss = comfortably under the 60/min limit.
 */
export const POPULAR_SYMBOLS = [
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN",
  "META", "TSLA", "AVGO", "AMD", "TSM",
  "MU", "ARM", "QCOM", "KLAC", "LRCX",
  "AMAT", "MRVL", "CRM", "ORCL", "PANW",
  "CRWD", "NFLX", "JPM", "V", "LLY",
] as const;

/** Indices/ETFs always shown in the top ticker tape. */
export const INDEX_TAPE_SYMBOLS = [
  { ticker: "SPY",  label: "S&P" },
  { ticker: "QQQ",  label: "NDX" },
  { ticker: "IWM",  label: "RUT" },
  { ticker: "SOXX", label: "SOXX" },
  { ticker: "DIA",  label: "DOW" },
] as const;
