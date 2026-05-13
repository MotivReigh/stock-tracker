/**
 * Ten preset scans across the three trend stages the user cares about.
 * Each preset has a stable `key` so we can upsert on the user's account
 * without dupes (see seed-presets.ts).
 *
 * Edit thresholds here — definitions are pure JSON.
 */
import type { ScanDefinition, ScanStage } from "./types";

export type Preset = {
  key: string;
  name: string;
  description: string;
  stage: ScanStage;
  definition: ScanDefinition;
};

export const PRESETS: Preset[] = [
  /* ------------------------------ pre-breakout ----------------------------- */
  {
    key: "pre-tight-consolidation",
    name: "Pre-Breakout · Tight Consolidation",
    description:
      "Stocks tightening near resistance: ATR/price < 2% over the last 5 weeks, MAs still in uptrend stack.",
    stage: "pre-breakout",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "tightConsolidation", expected: true },
        { kind: "predicate", predicate: "maAligned", expected: true },
      ],
    },
  },
  {
    key: "pre-volume-dry-up",
    name: "Pre-Breakout · Volume Drying Up",
    description:
      "Last 5 sessions of volume below 0.7× 20-day average while trend remains intact (classic VCP setup).",
    stage: "pre-breakout",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "volumeDryUp", expected: true },
        { kind: "numeric", indicator: "smaSlope20", operator: ">=", value: 0 },
      ],
    },
  },
  {
    key: "pre-ma-compression",
    name: "Pre-Breakout · MA Compression",
    description:
      "20-day and 50-day moving averages have converged within 1.5% — coiled spring above the 200.",
    stage: "pre-breakout",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "maCompression", expected: true },
        { kind: "numeric", indicator: "rsi", operator: ">=", value: 45 },
        { kind: "numeric", indicator: "rsi", operator: "<=", value: 65 },
      ],
    },
  },

  /* ----------------------------- just broke out ---------------------------- */
  {
    key: "break-52w-high-vol",
    name: "Just Broke Out · 52-Week High + Volume",
    description:
      "Today closes at or above the prior 52-week high with at least 1.5× relative volume.",
    stage: "just-broke-out",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "breakout52wHigh", expected: true },
        { kind: "numeric", indicator: "relVol", operator: ">=", value: 1.5 },
      ],
    },
  },
  {
    key: "break-50d-high-vol",
    name: "Just Broke Out · 50-Day High + Volume",
    description:
      "Closes above the prior 50-day high on 1.5× volume — earlier signal than 52w but still a real breakout.",
    stage: "just-broke-out",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "breakout50dHigh", expected: true },
        { kind: "numeric", indicator: "relVol", operator: ">=", value: 1.5 },
      ],
    },
  },
  {
    key: "break-gap-hold",
    name: "Just Broke Out · Gap & Hold",
    description:
      "Gap up ≥ 2% on 1.5× volume with the close inside the upper half of the day's range.",
    stage: "just-broke-out",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">=", value: 2 },
        { kind: "numeric", indicator: "relVol", operator: ">=", value: 1.5 },
        { kind: "predicate", predicate: "maAligned", expected: true },
      ],
    },
  },

  /* --------------------------- established trend --------------------------- */
  {
    key: "trend-pullback-20ma",
    name: "Established Trend · Pullback to 20-MA",
    description:
      "Intraday low tapped the 20-day MA but closed above — classic trend-continuation entry.",
    stage: "established-trend",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "predicate", predicate: "pullbackToMa20", expected: true },
        { kind: "predicate", predicate: "maAligned", expected: true },
        { kind: "numeric", indicator: "rsScore", operator: ">=", value: 60 },
      ],
    },
  },
  {
    key: "trend-rs-leaders",
    name: "Established Trend · RS Leaders",
    description:
      "Top relative-strength stocks (vs SPY composite) with MAs in alignment — the market's strongest names.",
    stage: "established-trend",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "rsScore", operator: ">=", value: 75 },
        { kind: "predicate", predicate: "maAligned", expected: true },
        { kind: "numeric", indicator: "pctChange63d", operator: ">=", value: 10 },
      ],
    },
  },
  {
    key: "trend-strong-sector-aligned",
    name: "Established Trend · Strong Sector + MA",
    description:
      "Outperformers in strong-sector context: ≥5% 21-day return, MAs aligned, recent breakout activity.",
    stage: "established-trend",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange21d", operator: ">=", value: 5 },
        { kind: "predicate", predicate: "maAligned", expected: true },
        { kind: "numeric", indicator: "rsi", operator: ">=", value: 50 },
        { kind: "numeric", indicator: "rsi", operator: "<=", value: 80 },
      ],
    },
  },

  /* ------------------------------ momentum --------------------------------- */
  {
    key: "momentum-multi-timeframe",
    name: "Momentum · Multi-Timeframe Gainers",
    description:
      "Stocks up across all of 1D / 1W / 1M / 3M — broad uptrend with day-of confirmation.",
    stage: "momentum",
    definition: {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: 0 },
        { kind: "numeric", indicator: "pctChange5d", operator: ">", value: 0 },
        { kind: "numeric", indicator: "pctChange21d", operator: ">=", value: 3 },
        { kind: "numeric", indicator: "pctChange63d", operator: ">=", value: 10 },
      ],
    },
  },
];

export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}
