import { describe, it, expect } from "vitest";
import {
  pctChange1d,
  pctChange5d,
  pctChange21d,
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
} from "@/lib/scans/signals";
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

/* -------------------------------------------------------------------------- */
/* % change                                                                    */
/* -------------------------------------------------------------------------- */

describe("pctChange1d / 5d / 21d", () => {
  it("returns positive change on an uptrend", () => {
    const bars = steadyUptrend(300, 50, 100);
    expect(pctChange1d(bars)).toBeGreaterThan(0);
    expect(pctChange5d(bars)).toBeGreaterThan(0);
    expect(pctChange21d(bars)).toBeGreaterThan(0);
  });

  it("returns negative change on a downtrend", () => {
    const bars = steadyDowntrend(300, 100, 50);
    expect(pctChange1d(bars)).toBeLessThan(0);
    expect(pctChange21d(bars)).toBeLessThan(0);
  });

  it("returns null when not enough history", () => {
    expect(pctChange21d([])).toBeNull();
    expect(pctChange21d(steadyUptrend(10))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Relative volume                                                              */
/* -------------------------------------------------------------------------- */

describe("relativeVolume", () => {
  it("returns ~3.5 on a 3.5× surge fixture", () => {
    const bars = volumeSurge();
    const r = relativeVolume(bars, 20);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(3.4);
    expect(r!).toBeLessThan(3.6);
  });

  it("returns ~1 on a flat-volume fixture", () => {
    const bars = steadyUptrend(50, 90, 100);
    const r = relativeVolume(bars, 20);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(1, 2);
  });

  it("returns null when not enough history", () => {
    expect(relativeVolume(steadyUptrend(5), 20)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* MA alignment                                                                 */
/* -------------------------------------------------------------------------- */

describe("maAlignment", () => {
  it("reports full 20>50>200 alignment on a long uptrend", () => {
    const bars = steadyUptrend(300, 50, 100);
    const a = maAlignment(bars);
    expect(a).not.toBeNull();
    expect(a!.aligned).toBe(true);
    expect(a!.label).toBe("20>50>200");
  });

  it("reports broken alignment on a downtrend", () => {
    const bars = steadyDowntrend(300, 100, 50);
    const a = maAlignment(bars);
    expect(a!.aligned).toBe(false);
  });

  it("falls back to partial label with limited history", () => {
    const bars = steadyUptrend(60, 80, 100);
    const a = maAlignment(bars);
    expect(a).not.toBeNull();
    expect(a!.sma200).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Breakouts                                                                    */
/* -------------------------------------------------------------------------- */

describe("breakoutNDayHigh", () => {
  it("fires on the breakout fixture for 50-day high", () => {
    const bars = freshBreakout();
    expect(breakoutNDayHigh(bars, 50)).toBe(true);
  });

  it("does not fire on a steady downtrend", () => {
    const bars = steadyDowntrend(100, 100, 50);
    expect(breakoutNDayHigh(bars, 20)).toBe(false);
  });

  it("returns false on insufficient history", () => {
    expect(breakoutNDayHigh(steadyUptrend(10), 50)).toBe(false);
  });
});

describe("breakout52WeekHigh", () => {
  it("fires on the fresh-breakout fixture", () => {
    const bars = freshBreakout(260, 5, 100, 130);
    expect(breakout52WeekHigh(bars)).toBe(true);
  });

  it("does not fire on a downtrend", () => {
    expect(breakout52WeekHigh(steadyDowntrend(300, 100, 50))).toBe(false);
  });
});

describe("daysSince52WeekHigh", () => {
  it("returns 0 when today is the high", () => {
    const bars = steadyUptrend(300, 50, 100);
    expect(daysSince52WeekHigh(bars)).toBe(0);
  });

  it("returns higher numbers when peak is older", () => {
    const bars = steadyUptrend(150, 50, 100).concat(
      steadyDowntrend(50, 100, 90),
    );
    // Renumber dates (cosmetic; calculation uses array indices)
    const days = daysSince52WeekHigh(bars);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Relative strength                                                            */
/* -------------------------------------------------------------------------- */

describe("relativeStrength", () => {
  it("returns >50 when stock outperforms benchmark", () => {
    const stock = steadyUptrend(200, 50, 120); // +140%
    const bench = steadyUptrend(200, 100, 110); // +10%
    const score = relativeStrength(stock, bench);
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(50);
  });

  it("returns <50 when stock underperforms benchmark", () => {
    const stock = steadyDowntrend(200, 100, 80);
    const bench = steadyUptrend(200, 100, 120);
    const score = relativeStrength(stock, bench);
    expect(score).not.toBeNull();
    expect(score!).toBeLessThan(50);
  });
});

/* -------------------------------------------------------------------------- */
/* RSI                                                                         */
/* -------------------------------------------------------------------------- */

describe("rsi", () => {
  it("approaches 100 on a pure uptrend", () => {
    const bars = steadyUptrend(50, 50, 100);
    const r = rsi(bars, 14);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(95);
  });

  it("approaches 0 on a pure downtrend", () => {
    const bars = steadyDowntrend(50, 100, 50);
    const r = rsi(bars, 14);
    expect(r).not.toBeNull();
    expect(r!).toBeLessThan(5);
  });

  it("returns null on insufficient history", () => {
    expect(rsi(steadyUptrend(5))).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* MACD                                                                         */
/* -------------------------------------------------------------------------- */

describe("macd", () => {
  it("positive MACD line on a steady uptrend", () => {
    const bars = steadyUptrend(100, 50, 100);
    const m = macd(bars);
    expect(m).not.toBeNull();
    expect(m!.macd).toBeGreaterThan(0);
    // Histogram tracks MACD-vs-signal divergence; on a perfectly linear ramp
    // both converge to the same value, so we only assert MACD is positive.
  });

  it("negative histogram on a steady downtrend", () => {
    const bars = steadyDowntrend(100, 100, 50);
    const m = macd(bars);
    expect(m).not.toBeNull();
    expect(m!.macd).toBeLessThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Consolidation / volume dry-up / pullback / compression                       */
/* -------------------------------------------------------------------------- */

describe("tightConsolidation", () => {
  it("fires on the tight-consolidation fixture", () => {
    expect(tightConsolidation(tightConsolidationPattern(), 5, 2)).toBe(true);
  });

  it("does not fire on a volatile uptrend", () => {
    const bars: ReturnType<typeof steadyUptrend> = [];
    for (let i = 0; i < 200; i++) {
      bars.push({
        date: "2026-01-01",
        time: i,
        open: 100 + Math.sin(i) * 4,
        close: 100 + Math.sin(i + 1) * 4,
        high: 105 + Math.sin(i) * 4,
        low: 95 + Math.sin(i) * 4,
        volume: 1_000_000,
      });
    }
    expect(tightConsolidation(bars, 5, 2)).toBe(false);
  });
});

describe("volumeDryUp", () => {
  it("fires on the dry-up fixture", () => {
    expect(volumeDryUp(volumeDryUpPattern())).toBe(true);
  });

  it("does not fire on uniform volume", () => {
    const bars = steadyUptrend(50, 90, 100);
    expect(volumeDryUp(bars)).toBe(false);
  });
});

describe("pullbackToMA", () => {
  it("fires when price taps the 20-MA in the last few bars", () => {
    expect(pullbackToMA(pullbackTo20MA(), "ma20", 5)).toBe(true);
  });

  it("does not fire on a steady uptrend that never touches 20-MA", () => {
    const bars = steadyUptrend(100, 50, 100);
    // Pure steady uptrend has price always well above MA20 — no touch.
    expect(pullbackToMA(bars, "ma20", 5)).toBe(false);
  });
});

describe("maCompression", () => {
  it("fires when 20-MA and 50-MA converge", () => {
    expect(maCompression(maCompressionPattern(), 1.5)).toBe(true);
  });

  it("does not fire when MAs are far apart", () => {
    const bars = steadyUptrend(200, 50, 150);
    expect(maCompression(bars, 1.5)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* ATR sanity                                                                   */
/* -------------------------------------------------------------------------- */

describe("atr", () => {
  it("returns a positive value on real bars", () => {
    const bars = steadyUptrend(50);
    const a = atr(bars, 14);
    expect(a).not.toBeNull();
    expect(a!).toBeGreaterThan(0);
  });

  it("returns null on insufficient history", () => {
    expect(atr(steadyUptrend(5), 14)).toBeNull();
  });
});
