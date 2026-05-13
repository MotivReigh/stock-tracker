/**
 * Scan-engine type system.
 *
 * A scan is a JSON document persisted in updraft_scans.definition. The engine
 * walks the conditions, queries the indicator value per symbol, and emits a
 * result when the combinator evaluates true.
 *
 * Keep this file free of runtime imports so it can be shared between server
 * (engine) and client (builder UI) without bringing in heavy deps.
 */

/** Trend stage tag — for grouping results and color coding in the UI. */
export type ScanStage = "pre-breakout" | "just-broke-out" | "established-trend" | "momentum";

/** The indicators a condition can reference. */
export type Indicator =
  | "price"
  | "pctChange1d"
  | "pctChange5d"
  | "pctChange21d"
  | "pctChange63d"
  | "relVol"
  | "rsScore"
  | "rsi"
  | "macdHistogram"
  | "smaSlope20"
  | "atrPct"
  | "fiftyTwoWeekHighDistance"
  | "marketCap";

/** Boolean checks that don't take a numeric value. */
export type Predicate =
  | "maAligned"            // 20>50>200 = true
  | "maCompression"        // 20-MA and 50-MA within X%
  | "breakout52wHigh"      // today closes above prior 52w high
  | "breakout50dHigh"      // today closes above prior 50d high
  | "tightConsolidation"   // ATR < 2% over last 5w
  | "volumeDryUp"          // recent 5d vol < 0.7× 20d avg
  | "pullbackToMa20"       // intraday low touched SMA20, close above
  | "pullbackToMa50";      // intraday low touched SMA50, close above

export type Operator = ">" | ">=" | "<" | "<=" | "=" | "between";

/** A numeric condition. */
export type NumericCondition = {
  kind: "numeric";
  indicator: Indicator;
  operator: Operator;
  value: number;
  /** Required only when operator === "between". */
  valueHi?: number;
};

/** A boolean predicate condition. */
export type PredicateCondition = {
  kind: "predicate";
  predicate: Predicate;
  /** Always required so the builder can show "is" / "is not". */
  expected: boolean;
};

export type ScanCondition = NumericCondition | PredicateCondition;

/** Full scan definition stored in updraft_scans.definition (jsonb). */
export type ScanDefinition = {
  /** Schema version. Bump when adding indicators / breaking changes. */
  version: 1;
  combinator: "and" | "or";
  conditions: ScanCondition[];
  /** Optional universe filter; defaults to enabled=true, US, $2B+. */
  universe?: {
    minMarketCap?: number;     // USD
    sector?: string[];
    /** Override the user's universe with an explicit symbol list. */
    symbols?: string[];
  };
};

/** Snapshot stored alongside each scan result for the UI. */
export type ResultSnapshot = {
  symbol: string;
  price: number | null;
  pctChange1d: number | null;
  pctChange5d: number | null;
  pctChange21d: number | null;
  pctChange63d: number | null;
  relVol: number | null;
  rsScore: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  maLabel: string | null;
  high52wDistance: number | null;
  sector: string | null;
  /** Conviction score 0-100 — how strongly the conditions held. */
  conviction: number;
};
