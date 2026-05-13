/**
 * Server-side composer for /stock/[symbol].
 *
 * Returns whatever subset of (quote, profile, candles, news) we can fetch.
 * A failure in any single fetch does not blank the page — the UI handles
 * null/empty values gracefully.
 */
import { getCachedQuote } from "@/lib/cache/quoteCache";
import { fetchProfile } from "@/lib/finnhub/profile";
import { fetchDailyCandles } from "@/lib/market/candles";
import { fetchCompanyNews } from "@/lib/finnhub/news";
import { fetchMetrics } from "@/lib/finnhub/metrics";
import { fetchRecommendations } from "@/lib/finnhub/recommendations";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import type {
  FinnhubProfile,
  FinnhubCandles,
  FinnhubNewsItem,
  FinnhubMetric,
  FinnhubRecommendation,
  Quote,
} from "@/lib/finnhub/types";
import { highestClose, lowestClose, average } from "@/lib/indicators";

export type DailyBar = {
  /** Trading date as 'YYYY-MM-DD' so Lightweight Charts can use it directly. */
  date: string;
  /** Unix seconds (Lightweight Charts also accepts this). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StockDetail = {
  symbol: string;
  quote: Quote | null;
  profile: FinnhubProfile | null;
  bars: DailyBar[];
  news: FinnhubNewsItem[];
  /** Finnhub paid: fundamental metrics. Null if the endpoint fails. */
  metrics: FinnhubMetric["metric"] | null;
  /** Finnhub paid: analyst recommendations, newest first. */
  recommendations: FinnhubRecommendation[];
  derived: {
    /** Trailing 252 sessions from bars — fallback when metrics endpoint lacks the field. */
    high52w: number | null;
    low52w: number | null;
    avgVol20d: number | null;
    relVol: number | null;
  };
  asOf: number;
};

const CANDLES_LOOKBACK_DAYS = 365 * 5; // 5 years of daily bars

function normalizeCandles(raw: FinnhubCandles): DailyBar[] {
  if (raw.s !== "ok" || !raw.t || raw.t.length === 0) return [];
  const bars: DailyBar[] = [];
  for (let i = 0; i < raw.t.length; i++) {
    const date = new Date(raw.t[i] * 1000).toISOString().slice(0, 10);
    bars.push({
      date,
      time: raw.t[i],
      open: raw.o[i],
      high: raw.h[i],
      low: raw.l[i],
      close: raw.c[i],
      volume: raw.v[i],
    });
  }
  return bars;
}

async function getCachedCandles(symbol: string): Promise<DailyBar[]> {
  const key = cacheKey("candles", symbol, "D", CANDLES_LOOKBACK_DAYS);
  const cached = await cacheGet<DailyBar[]>(key);
  if (cached && cached.length > 0) return cached;

  const to = Math.floor(Date.now() / 1000);
  const from = to - CANDLES_LOOKBACK_DAYS * 24 * 60 * 60;
  const result = await fetchDailyCandles(symbol, from, to);
  const bars = normalizeCandles(result.candles);
  if (bars.length > 0) {
    await cacheSet(key, bars, CACHE_TTL.candlesDaily);
  } else if (result.error) {
    console.warn(`[stock/${symbol}] candle providers failed: ${result.error}`);
  }
  return bars;
}

async function getCachedProfile(
  symbol: string,
): Promise<FinnhubProfile | null> {
  const key = cacheKey("profile", symbol);
  const cached = await cacheGet<FinnhubProfile>(key);
  if (cached) return cached;
  try {
    const profile = await fetchProfile(symbol);
    if (profile && Object.keys(profile).length > 0) {
      await cacheSet(key, profile, CACHE_TTL.profile);
    }
    return profile;
  } catch (err) {
    console.warn(`[stock/${symbol}] profile fetch failed:`, err);
    return null;
  }
}

async function getCachedCompanyNews(symbol: string): Promise<FinnhubNewsItem[]> {
  const key = cacheKey("news-symbol", symbol);
  const cached = await cacheGet<FinnhubNewsItem[]>(key);
  if (cached) return cached;
  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const news = await fetchCompanyNews(symbol, from, to);
    await cacheSet(key, news, CACHE_TTL.news);
    return news;
  } catch (err) {
    console.warn(`[stock/${symbol}] company news fetch failed:`, err);
    return [];
  }
}

async function getCachedMetrics(
  symbol: string,
): Promise<FinnhubMetric["metric"] | null> {
  const key = cacheKey("metric", symbol);
  const cached = await cacheGet<FinnhubMetric["metric"]>(key);
  if (cached) return cached;
  try {
    const raw = await fetchMetrics(symbol);
    const metric = raw.metric ?? null;
    if (metric) await cacheSet(key, metric, CACHE_TTL.profile);
    return metric;
  } catch (err) {
    console.warn(`[stock/${symbol}] metrics fetch failed:`, err);
    return null;
  }
}

async function getCachedRecommendations(
  symbol: string,
): Promise<FinnhubRecommendation[]> {
  const key = cacheKey("recommendation", symbol);
  const cached = await cacheGet<FinnhubRecommendation[]>(key);
  if (cached) return cached;
  try {
    const list = await fetchRecommendations(symbol);
    await cacheSet(key, list, CACHE_TTL.profile);
    return list;
  } catch (err) {
    console.warn(`[stock/${symbol}] recommendations fetch failed:`, err);
    return [];
  }
}

function computeDerived(bars: DailyBar[], todayVolume: number) {
  if (bars.length === 0) {
    return { high52w: null, low52w: null, avgVol20d: null, relVol: null };
  }
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const high52w = highestClose(bars.map((b) => b.high), 252);
  const low52w = lowestClose(bars.map((b) => b.low), 252);
  const avgVol20d = average(volumes.slice(0, -1), 20); // exclude today
  const relVol = avgVol20d && avgVol20d > 0 ? todayVolume / avgVol20d : null;
  // closes is unused beyond this scope; suppress lint by referencing it:
  void closes;
  return { high52w, low52w, avgVol20d, relVol };
}

/** Finnhub returns {c:0, d:null, ..., t:0} for invalid symbols. Detect that. */
function isEmptyQuote(q: Quote | null): boolean {
  if (!q) return true;
  return (
    q.price === 0 &&
    q.prevClose === 0 &&
    q.high === 0 &&
    q.low === 0 &&
    q.asOf === 0
  );
}

function isEmptyProfile(p: FinnhubProfile | null): boolean {
  if (!p) return true;
  return !p.name && !p.ticker && !p.exchange;
}

export async function getStockDetail(symbol: string): Promise<StockDetail> {
  const sym = symbol.toUpperCase();
  const [rawQuote, rawProfile, bars, news, metrics, recommendations] =
    await Promise.all([
      getCachedQuote(sym).then((r) => r.quote).catch(() => null),
      getCachedProfile(sym),
      getCachedCandles(sym),
      getCachedCompanyNews(sym),
      getCachedMetrics(sym),
      getCachedRecommendations(sym),
    ]);

  const quote = isEmptyQuote(rawQuote) ? null : rawQuote;
  const profile = isEmptyProfile(rawProfile) ? null : rawProfile;
  const todayVolume = bars.length > 0 ? bars[bars.length - 1].volume : 0;
  const derived = computeDerived(bars, todayVolume);

  return {
    symbol: sym,
    quote,
    profile,
    bars,
    news,
    metrics,
    recommendations,
    derived,
    asOf: Date.now(),
  };
}

/** Convenience for the page route: true means /stock/[symbol] should 404. */
export function isStockUnknown(detail: StockDetail): boolean {
  return !detail.quote && !detail.profile && detail.bars.length === 0;
}
