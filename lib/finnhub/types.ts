/** Shapes returned by Finnhub REST endpoints we use. */

export type FinnhubQuote = {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // day open
  pc: number; // prev close
  t: number; // unix time (sec)
};

export type FinnhubProfile = {
  country?: string;
  currency?: string;
  exchange?: string;
  ipo?: string;
  marketCapitalization?: number; // in millions of USD
  name?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
  logo?: string;
  finnhubIndustry?: string;
};

export type FinnhubCandles = {
  c: number[]; // close
  h: number[]; // high
  l: number[]; // low
  o: number[]; // open
  s: "ok" | "no_data";
  t: number[]; // unix time (sec)
  v: number[]; // volume
};

export type FinnhubNewsItem = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

export type FinnhubSymbol = {
  description?: string;
  displaySymbol?: string;
  symbol: string;
  type?: string;
  currency?: string;
  figi?: string;
  mic?: string;
};

/** Normalized shape we store + serve to the UI. */
export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  asOf: number; // unix ms
};

export function normalizeQuote(symbol: string, q: FinnhubQuote): Quote {
  return {
    symbol,
    price: q.c,
    change: q.d ?? 0,
    changePercent: q.dp ?? 0,
    high: q.h,
    low: q.l,
    open: q.o,
    prevClose: q.pc,
    asOf: q.t * 1000,
  };
}
