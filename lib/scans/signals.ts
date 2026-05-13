/**
 * Pure signal functions for the scan engine.
 *
 * All functions:
 *   - take normalized `Bar[]` arrays (oldest → newest), never fetch I/O
 *   - return null when there isn't enough history rather than throwing
 *   - are deterministic so they're trivial to unit-test
 *
 * The bar shape mirrors what we store in updraft_daily_bars and what
 * lib/stock/data.ts emits for the price chart.
 */

import {
  sma,
  highestClose,
  lowestClose,
  average,
  pctChange,
} from "@/lib/indicators";

export type Bar = {
  date: string; // YYYY-MM-DD
  time: number; // unix sec
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/* -------------------------------------------------------------------------- */
/* % change over N trading days                                                */
/* -------------------------------------------------------------------------- */

export function pctChange1d(bars: Bar[]): number | null {
  return pctChange(bars.map((b) => b.close), 1);
}

export function pctChange5d(bars: Bar[]): number | null {
  return pctChange(bars.map((b) => b.close), 5);
}

export function pctChange21d(bars: Bar[]): number | null {
  return pctChange(bars.map((b) => b.close), 21);
}

export function pctChange63d(bars: Bar[]): number | null {
  return pctChange(bars.map((b) => b.close), 63);
}

/* -------------------------------------------------------------------------- */
/* Relative volume: today's volume / N-day average volume                      */
/* -------------------------------------------------------------------------- */

export function relativeVolume(bars: Bar[], period: number = 20): number | null {
  if (bars.length < period + 1) return null;
  const today = bars[bars.length - 1].volume;
  const avg = average(
    bars.slice(0, -1).map((b) => b.volume),
    period,
  );
  if (avg === null || avg <= 0) return null;
  return today / avg;
}

/* -------------------------------------------------------------------------- */
/* Moving-average alignment: SMA20 > SMA50 > SMA200                            */
/* -------------------------------------------------------------------------- */

export type MaAlignment = {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  /** True when price > sma20 > sma50 > sma200 — full uptrend stack. */
  aligned: boolean;
  /** "20>50>200" / "20>50" / "20≈50" / "broken" for badge rendering. */
  label: string;
};

export function maAlignment(bars: Bar[]): MaAlignment | null {
  if (bars.length < 200) {
    // Still compute what we have so partial alignment is visible.
    const closes = bars.map((b) => b.close);
    const sma20Series = sma(closes, 20);
    const sma50Series = sma(closes, 50);
    const last = closes[closes.length - 1];
    const sma20 = sma20Series[sma20Series.length - 1] ?? null;
    const sma50 = sma50Series[sma50Series.length - 1] ?? null;
    return {
      sma20,
      sma50,
      sma200: null,
      aligned: false,
      label:
        last !== undefined && sma20 !== null && sma50 !== null && last > sma20 && sma20 > sma50
          ? "20>50"
          : "n/a",
    };
  }

  const closes = bars.map((b) => b.close);
  const sma20Series = sma(closes, 20);
  const sma50Series = sma(closes, 50);
  const sma200Series = sma(closes, 200);
  const last = closes[closes.length - 1];
  const sma20 = sma20Series[sma20Series.length - 1] ?? null;
  const sma50 = sma50Series[sma50Series.length - 1] ?? null;
  const sma200 = sma200Series[sma200Series.length - 1] ?? null;

  if (sma20 === null || sma50 === null || sma200 === null) {
    return { sma20, sma50, sma200, aligned: false, label: "n/a" };
  }

  const aligned = last > sma20 && sma20 > sma50 && sma50 > sma200;
  let label = "broken";
  if (aligned) label = "20>50>200";
  else if (last > sma20 && sma20 > sma50) label = "20>50";
  else if (Math.abs(sma20 - sma50) / sma50 < 0.005) label = "20≈50";

  return { sma20, sma50, sma200, aligned, label };
}

/* -------------------------------------------------------------------------- */
/* Breakouts                                                                    */
/* -------------------------------------------------------------------------- */

/** True when today's close is the highest close over the last N (excluding today). */
export function breakoutNDayHigh(bars: Bar[], n: number): boolean {
  if (bars.length < n + 1) return false;
  const today = bars[bars.length - 1].close;
  const prior = highestClose(
    bars.slice(0, -1).map((b) => b.close),
    n,
  );
  if (prior === null) return false;
  return today > prior;
}

/** True when today's high crosses the prior 252-session high (52w). */
export function breakout52WeekHigh(bars: Bar[]): boolean {
  if (bars.length < 252 + 1) return false;
  const today = bars[bars.length - 1].close;
  const prior = highestClose(
    bars.slice(0, -1).map((b) => b.high),
    252,
  );
  if (prior === null) return false;
  return today >= prior;
}

/** Days since the last 52-week high (lower = more recent breakout). */
export function daysSince52WeekHigh(bars: Bar[]): number | null {
  if (bars.length === 0) return null;
  const window = Math.min(bars.length, 252);
  const slice = bars.slice(-window);
  let maxClose = -Infinity;
  let maxIdx = -1;
  for (let i = 0; i < slice.length; i++) {
    if (slice[i].close > maxClose) {
      maxClose = slice[i].close;
      maxIdx = i;
    }
  }
  if (maxIdx < 0) return null;
  return slice.length - 1 - maxIdx;
}

/* -------------------------------------------------------------------------- */
/* Relative strength vs benchmark (SPY)                                        */
/* -------------------------------------------------------------------------- */

/**
 * IBD-style RS score (0-100 percentile not implementable without a peer set).
 * We approximate with a weighted relative-return composite vs benchmark over
 * 1, 3, 6 months. Higher = stronger relative to benchmark.
 */
export function relativeStrength(
  bars: Bar[],
  benchmarkBars: Bar[],
): number | null {
  const periods = [21, 63, 126];
  const weights = [0.4, 0.4, 0.2];
  let composite = 0;
  let totalWeight = 0;
  for (let i = 0; i < periods.length; i++) {
    const stockChange = pctChange(bars.map((b) => b.close), periods[i]);
    const benchChange = pctChange(benchmarkBars.map((b) => b.close), periods[i]);
    if (stockChange === null || benchChange === null) continue;
    composite += weights[i] * (stockChange - benchChange);
    totalWeight += weights[i];
  }
  if (totalWeight === 0) return null;
  // Scale relative excess return into a friendly 0-100ish range.
  // Empirically, +30% excess over 21d = strong (90+); -10% = weak (~50).
  const excess = composite / totalWeight;
  return Math.max(0, Math.min(100, 50 + excess * 1.5));
}

/* -------------------------------------------------------------------------- */
/* RSI (Wilder's smoothing, 14-period)                                         */
/* -------------------------------------------------------------------------- */

export function rsi(bars: Bar[], period: number = 14): number | null {
  if (bars.length < period + 1) return null;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/* -------------------------------------------------------------------------- */
/* MACD (12/26/9)                                                               */
/* -------------------------------------------------------------------------- */

function ema(values: number[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  // Seed with SMA of first `period` values.
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export type MacdSnapshot = {
  macd: number;
  signal: number;
  histogram: number;
};

export function macd(
  bars: Bar[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9,
): MacdSnapshot | null {
  const closes = bars.map((b) => b.close);
  if (closes.length < slow + signalPeriod) return null;
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] === null || emaSlow[i] === null) continue;
    macdLine.push((emaFast[i] as number) - (emaSlow[i] as number));
  }
  const signalLine = ema(macdLine, signalPeriod);
  const lastSignal = signalLine[signalLine.length - 1];
  const lastMacd = macdLine[macdLine.length - 1];
  if (lastSignal === null) return null;
  return {
    macd: lastMacd,
    signal: lastSignal,
    histogram: lastMacd - lastSignal,
  };
}

/* -------------------------------------------------------------------------- */
/* Tight consolidation: ATR / price ratio low + range contraction               */
/* -------------------------------------------------------------------------- */

/** True Range for a single bar (uses prior close). */
function trueRange(curr: Bar, prev: Bar): number {
  const a = curr.high - curr.low;
  const b = Math.abs(curr.high - prev.close);
  const c = Math.abs(curr.low - prev.close);
  return Math.max(a, b, c);
}

/** Average True Range over N bars. */
export function atr(bars: Bar[], period: number = 14): number | null {
  if (bars.length < period + 1) return null;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    sum += trueRange(bars[i], bars[i - 1]);
  }
  return sum / period;
}

/**
 * True when the last `weeks` weeks (5 trading days each) show ATR/price < 2%.
 * Captures the "narrowing range under resistance" pre-breakout setup.
 */
export function tightConsolidation(
  bars: Bar[],
  weeks: number = 5,
  atrPct: number = 2,
): boolean {
  const period = weeks * 5;
  if (bars.length < period + 1) return false;
  const window = bars.slice(-period - 1);
  const last = window[window.length - 1].close;
  if (last <= 0) return false;
  const a = atr(window, period - 1);
  if (a === null) return false;
  return (a / last) * 100 < atrPct;
}

/* -------------------------------------------------------------------------- */
/* Volume dry-up                                                                */
/* -------------------------------------------------------------------------- */

/** Last 5 sessions avg vol < 0.7 × 20-session avg. */
export function volumeDryUp(bars: Bar[]): boolean {
  if (bars.length < 21) return false;
  const recent = average(
    bars.slice(-5).map((b) => b.volume),
    5,
  );
  const longer = average(
    bars.slice(-21, -1).map((b) => b.volume),
    20,
  );
  if (recent === null || longer === null || longer === 0) return false;
  return recent / longer < 0.7;
}

/* -------------------------------------------------------------------------- */
/* Pullback to MA: low touches the MA in the last `lookback` bars               */
/* without close breaking below.                                                */
/* -------------------------------------------------------------------------- */

export type PullbackKind = "ma20" | "ma50";

export function pullbackToMA(
  bars: Bar[],
  ma: PullbackKind,
  lookback: number = 5,
): boolean {
  const period = ma === "ma20" ? 20 : 50;
  if (bars.length < period + lookback) return false;
  const closes = bars.map((b) => b.close);
  const smaSeries = sma(closes, period);

  for (let i = bars.length - lookback; i < bars.length; i++) {
    const maValue = smaSeries[i];
    if (maValue === null) continue;
    const touched = bars[i].low <= maValue;
    const heldClose = bars[i].close >= maValue;
    if (touched && heldClose) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* MA compression: 20-MA and 50-MA within X% of each other                      */
/* -------------------------------------------------------------------------- */

export function maCompression(bars: Bar[], thresholdPct: number = 1.5): boolean {
  if (bars.length < 50) return false;
  const closes = bars.map((b) => b.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const last20 = sma20[sma20.length - 1];
  const last50 = sma50[sma50.length - 1];
  if (last20 === null || last50 === null || last50 === 0) return false;
  return (Math.abs(last20 - last50) / last50) * 100 < thresholdPct;
}
