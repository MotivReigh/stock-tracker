import { describe, it, expect } from "vitest";
import { runScan } from "@/lib/scans/engine";
import { getPreset } from "@/lib/scans/presets";
import {
  steadyUptrend,
  steadyDowntrend,
  freshBreakout,
  tightConsolidationPattern,
  pullbackTo20MA,
  volumeDryUpPattern,
  maCompressionPattern,
  volumeSurge,
} from "@/tests/fixtures/bars";
import type { UniverseRow } from "@/lib/universe/queries";
import type { Bar } from "@/lib/scans/signals";
import type { ScanDefinition } from "@/lib/scans/types";

function uni(rows: Array<Partial<UniverseRow> & { symbol: string }>): UniverseRow[] {
  return rows.map((r) => ({
    symbol: r.symbol,
    name: r.name ?? r.symbol,
    sector: r.sector ?? "Technology",
    industry: r.industry ?? "Software",
    market_cap: r.market_cap ?? 50_000,
    enabled: r.enabled ?? true,
    last_refreshed: r.last_refreshed ?? new Date().toISOString(),
  }));
}

// Benchmark used by RS scoring — flat-ish uptrend.
const SPY: Bar[] = steadyUptrend(300, 100, 110);

describe("scan engine · preset · 52-week high + volume", () => {
  it("fires on a fresh-breakout symbol with volume surge", () => {
    const preset = getPreset("break-52w-high-vol")!;
    const breakoutBars = mergeVolume(freshBreakout(260, 5, 100, 130), volumeSurge());
    const universe = uni([{ symbol: "BRK1" }, { symbol: "NOPE" }]);
    const { hits } = runScan({
      definition: preset.definition,
      symbolBars: [
        { symbol: "BRK1", bars: breakoutBars },
        { symbol: "NOPE", bars: steadyDowntrend(300, 100, 50) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toContain("BRK1");
    expect(hits.map((h) => h.symbol)).not.toContain("NOPE");
  });
});

describe("scan engine · preset · tight consolidation", () => {
  it("fires on the tight-consolidation fixture and not on a downtrend", () => {
    const preset = getPreset("pre-tight-consolidation")!;
    const universe = uni([{ symbol: "TIGHT" }, { symbol: "FALL" }]);
    const { hits } = runScan({
      definition: preset.definition,
      symbolBars: [
        { symbol: "TIGHT", bars: tightConsolidationPattern() },
        { symbol: "FALL", bars: steadyDowntrend(300, 100, 50) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toContain("TIGHT");
    expect(hits.map((h) => h.symbol)).not.toContain("FALL");
  });
});

describe("scan engine · preset · pullback to 20-MA", () => {
  it("fires on the pullback fixture", () => {
    const preset = getPreset("trend-pullback-20ma")!;
    const universe = uni([{ symbol: "PULL" }]);
    const { hits } = runScan({
      definition: preset.definition,
      symbolBars: [{ symbol: "PULL", bars: pullbackTo20MA() }],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toContain("PULL");
  });
});

describe("scan engine · combinators", () => {
  const universe = uni([{ symbol: "A" }, { symbol: "B" }]);

  it("AND requires every condition to match", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: 0 },
        { kind: "predicate", predicate: "maAligned", expected: true },
      ],
    };
    const { hits } = runScan({
      definition: def,
      symbolBars: [
        { symbol: "A", bars: steadyUptrend(300, 50, 100) },
        { symbol: "B", bars: steadyDowntrend(300, 100, 50) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toEqual(["A"]);
  });

  it("OR fires when at least one condition matches", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "or",
      conditions: [
        { kind: "numeric", indicator: "pctChange21d", operator: ">=", value: 999 }, // impossible
        { kind: "predicate", predicate: "maAligned", expected: true },
      ],
    };
    const { hits } = runScan({
      definition: def,
      symbolBars: [{ symbol: "A", bars: steadyUptrend(300, 50, 100) }],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toContain("A");
  });
});

describe("scan engine · universe filtering", () => {
  it("skips symbols below minMarketCap", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: -100 },
      ],
      universe: { minMarketCap: 100_000 },
    };
    const universe = uni([
      { symbol: "BIG", market_cap: 200_000 },
      { symbol: "SMALL", market_cap: 1_000 },
    ]);
    const { hits } = runScan({
      definition: def,
      symbolBars: [
        { symbol: "BIG", bars: steadyUptrend(50, 90, 100) },
        { symbol: "SMALL", bars: steadyUptrend(50, 90, 100) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol)).toEqual(["BIG"]);
  });

  it("restricts to explicit symbol list when provided", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: -100 },
      ],
      universe: { symbols: ["A"] },
    };
    const universe = uni([{ symbol: "A" }, { symbol: "B" }, { symbol: "C" }]);
    const { hits } = runScan({
      definition: def,
      symbolBars: [
        { symbol: "A", bars: steadyUptrend(50, 90, 100) },
        { symbol: "B", bars: steadyUptrend(50, 90, 100) },
        { symbol: "C", bars: steadyUptrend(50, 90, 100) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(hits.map((h) => h.symbol).sort()).toEqual(["A"]);
  });
});

describe("scan engine · resilience", () => {
  it("returns empty hits on empty inputs", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: 0 },
      ],
    };
    const r = runScan({
      definition: def,
      symbolBars: [],
      benchmarkBars: SPY,
      universe: [],
    });
    expect(r.hits).toEqual([]);
    expect(r.evaluated).toBe(0);
  });

  it("skips symbols with empty bars without crashing", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: 0 },
      ],
    };
    const universe = uni([{ symbol: "X" }, { symbol: "Y" }]);
    const r = runScan({
      definition: def,
      symbolBars: [
        { symbol: "X", bars: [] },
        { symbol: "Y", bars: steadyUptrend(50, 90, 100) },
      ],
      benchmarkBars: SPY,
      universe,
    });
    expect(r.skipped).toBe(1);
    expect(r.hits.map((h) => h.symbol)).toEqual(["Y"]);
  });
});

describe("scan engine · snapshot fields", () => {
  it("populates conviction and key snapshot fields", () => {
    const def: ScanDefinition = {
      version: 1,
      combinator: "and",
      conditions: [
        { kind: "numeric", indicator: "pctChange1d", operator: ">", value: 0 },
      ],
    };
    const universe = uni([{ symbol: "A" }]);
    const r = runScan({
      definition: def,
      symbolBars: [{ symbol: "A", bars: steadyUptrend(300, 50, 100) }],
      benchmarkBars: SPY,
      universe,
    });
    expect(r.hits).toHaveLength(1);
    const s = r.hits[0];
    expect(s.symbol).toBe("A");
    expect(s.price).not.toBeNull();
    expect(s.conviction).toBe(100); // 1/1 matched
    expect(s.maLabel).toBe("20>50>200");
  });
});

/** Helper: copy the last N volumes from `source` onto the tail of `target`. */
function mergeVolume(target: Bar[], source: Bar[]): Bar[] {
  const out = target.slice();
  for (let i = 0; i < Math.min(out.length, source.length); i++) {
    const ti = out.length - 1 - i;
    const si = source.length - 1 - i;
    out[ti] = { ...out[ti], volume: source[si].volume };
  }
  return out;
}
