/**
 * Scan engine: applies a ScanDefinition across a universe of symbols using
 * their daily bars + a benchmark (SPY) for relative strength.
 *
 * Engine is pure-ish: takes `(definition, perSymbolBars, benchmarkBars, universeMeta)`,
 * returns `ResultSnapshot[]`. No DB, no fetching. Callers (cron route, server
 * actions) wire it to data sources.
 */
import {
  Bar,
  pctChange1d,
  pctChange5d,
  pctChange21d,
  pctChange63d,
  relativeVolume,
  maAlignment,
  breakoutNDayHigh,
  breakout52WeekHigh,
  daysSince52WeekHigh,
  relativeStrength,
  rsi,
  macd,
  tightConsolidation,
  volumeDryUp,
  pullbackToMA,
  maCompression,
  atr,
} from "./signals";
import type {
  Indicator,
  NumericCondition,
  Operator,
  Predicate,
  PredicateCondition,
  ResultSnapshot,
  ScanCondition,
  ScanDefinition,
} from "./types";
import type { UniverseRow } from "@/lib/universe/queries";

export type SymbolBars = {
  symbol: string;
  bars: Bar[];
};

/** Indicator extraction. Returns null when input lacks history. */
function readIndicator(
  ind: Indicator,
  bars: Bar[],
  benchmarkBars: Bar[],
  universeMeta: Map<string, UniverseRow>,
  symbol: string,
): number | null {
  switch (ind) {
    case "price":
      return bars.length > 0 ? bars[bars.length - 1].close : null;
    case "pctChange1d":
      return pctChange1d(bars);
    case "pctChange5d":
      return pctChange5d(bars);
    case "pctChange21d":
      return pctChange21d(bars);
    case "pctChange63d":
      return pctChange63d(bars);
    case "relVol":
      return relativeVolume(bars, 20);
    case "rsScore":
      return relativeStrength(bars, benchmarkBars);
    case "rsi":
      return rsi(bars, 14);
    case "macdHistogram": {
      const m = macd(bars);
      return m ? m.histogram : null;
    }
    case "smaSlope20": {
      // SMA20 today vs SMA20 5 days ago, as a percent change.
      if (bars.length < 25) return null;
      const closes = bars.map((b) => b.close);
      // Reuse the same SMA logic inline (avoid importing again):
      const sum = (start: number, len: number) => {
        let s = 0;
        for (let i = start; i < start + len; i++) s += closes[i];
        return s / len;
      };
      const cur = sum(closes.length - 20, 20);
      const past = sum(closes.length - 25, 20);
      if (past <= 0) return null;
      return ((cur - past) / past) * 100;
    }
    case "atrPct": {
      const a = atr(bars, 14);
      const last = bars[bars.length - 1]?.close;
      if (a === null || !last || last <= 0) return null;
      return (a / last) * 100;
    }
    case "fiftyTwoWeekHighDistance": {
      const days = daysSince52WeekHigh(bars);
      return days === null ? null : days;
    }
    case "marketCap": {
      const meta = universeMeta.get(symbol.toUpperCase());
      return meta?.market_cap ?? null;
    }
    default:
      return null;
  }
}

/** Read a boolean predicate value. */
function readPredicate(
  p: Predicate,
  bars: Bar[],
): boolean {
  switch (p) {
    case "maAligned":
      return maAlignment(bars)?.aligned === true;
    case "maCompression":
      return maCompression(bars);
    case "breakout52wHigh":
      return breakout52WeekHigh(bars);
    case "breakout50dHigh":
      return breakoutNDayHigh(bars, 50);
    case "tightConsolidation":
      return tightConsolidation(bars, 5, 2);
    case "volumeDryUp":
      return volumeDryUp(bars);
    case "pullbackToMa20":
      return pullbackToMA(bars, "ma20", 5);
    case "pullbackToMa50":
      return pullbackToMA(bars, "ma50", 5);
    default:
      return false;
  }
}

function compare(value: number, op: Operator, target: number, hi?: number): boolean {
  switch (op) {
    case ">": return value > target;
    case ">=": return value >= target;
    case "<": return value < target;
    case "<=": return value <= target;
    case "=": return Math.abs(value - target) < 1e-9;
    case "between": return hi !== undefined && value >= target && value <= hi;
    default: return false;
  }
}

function evaluateCondition(
  cond: ScanCondition,
  bars: Bar[],
  benchmarkBars: Bar[],
  universeMeta: Map<string, UniverseRow>,
  symbol: string,
): boolean {
  if (cond.kind === "numeric") {
    const v = readIndicator(cond.indicator, bars, benchmarkBars, universeMeta, symbol);
    if (v === null) return false;
    return compare(v, cond.operator, cond.value, cond.valueHi);
  }
  const got = readPredicate(cond.predicate, bars);
  return got === cond.expected;
}

function snapshot(
  symbol: string,
  bars: Bar[],
  benchmarkBars: Bar[],
  meta: UniverseRow | undefined,
  matchedCount: number,
  totalConditions: number,
): ResultSnapshot {
  const last = bars[bars.length - 1];
  const m = macd(bars);
  const ma = maAlignment(bars);
  const distance = daysSince52WeekHigh(bars);
  const conviction =
    totalConditions > 0
      ? Math.round((matchedCount / totalConditions) * 100)
      : 0;
  return {
    symbol,
    price: last?.close ?? null,
    pctChange1d: pctChange1d(bars),
    pctChange5d: pctChange5d(bars),
    pctChange21d: pctChange21d(bars),
    pctChange63d: pctChange63d(bars),
    relVol: relativeVolume(bars, 20),
    rsScore: relativeStrength(bars, benchmarkBars),
    rsi: rsi(bars, 14),
    macdHistogram: m?.histogram ?? null,
    maLabel: ma?.label ?? null,
    high52wDistance: distance,
    sector: meta?.sector ?? null,
    conviction,
  };
}

export type RunOptions = {
  definition: ScanDefinition;
  symbolBars: SymbolBars[];
  benchmarkBars: Bar[];
  universe: UniverseRow[];
};

export type RunResult = {
  /** Symbols that satisfied the combinator with their snapshots, sorted by conviction desc. */
  hits: ResultSnapshot[];
  /** Total symbols evaluated (after universe filtering). */
  evaluated: number;
  /** Symbols skipped because bars were missing or too short. */
  skipped: number;
};

/**
 * Run a single scan definition. Synchronous + pure — easy to unit test.
 */
export function runScan({
  definition,
  symbolBars,
  benchmarkBars,
  universe,
}: RunOptions): RunResult {
  const universeMeta = new Map<string, UniverseRow>();
  for (const u of universe) universeMeta.set(u.symbol.toUpperCase(), u);

  // Optional universe filtering by min market cap / sector / explicit symbols.
  const allowed = new Set<string>();
  const explicitSymbols = definition.universe?.symbols;
  if (explicitSymbols && explicitSymbols.length > 0) {
    for (const s of explicitSymbols) allowed.add(s.toUpperCase());
  } else {
    for (const u of universe) {
      if (!u.enabled) continue;
      if (
        definition.universe?.minMarketCap &&
        (u.market_cap ?? 0) < definition.universe.minMarketCap
      ) {
        continue;
      }
      if (
        definition.universe?.sector &&
        definition.universe.sector.length > 0 &&
        (!u.sector || !definition.universe.sector.includes(u.sector))
      ) {
        continue;
      }
      allowed.add(u.symbol.toUpperCase());
    }
  }

  const hits: ResultSnapshot[] = [];
  let evaluated = 0;
  let skipped = 0;

  for (const { symbol, bars } of symbolBars) {
    const sym = symbol.toUpperCase();
    if (!allowed.has(sym)) continue;
    if (bars.length === 0) {
      skipped++;
      continue;
    }
    evaluated++;

    let matched = 0;
    let combined: boolean;
    if (definition.combinator === "and") {
      combined = true;
      for (const c of definition.conditions) {
        const ok = evaluateCondition(c, bars, benchmarkBars, universeMeta, sym);
        if (ok) matched++;
        else combined = false;
      }
    } else {
      combined = false;
      for (const c of definition.conditions) {
        const ok = evaluateCondition(c, bars, benchmarkBars, universeMeta, sym);
        if (ok) {
          matched++;
          combined = true;
        }
      }
    }

    if (combined) {
      hits.push(
        snapshot(
          sym,
          bars,
          benchmarkBars,
          universeMeta.get(sym),
          matched,
          definition.conditions.length,
        ),
      );
    }
  }

  hits.sort((a, b) => b.conviction - a.conviction);
  return { hits, evaluated, skipped };
}
