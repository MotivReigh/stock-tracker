/**
 * Programmatic bar generators for signal unit tests.
 * Each function returns deterministic, named patterns so tests can assert
 * which signal should fire on which shape.
 */
import type { Bar } from "@/lib/scans/signals";

const DAY_MS = 86_400_000;

function makeBar(
  index: number,
  close: number,
  opts: { high?: number; low?: number; open?: number; volume?: number } = {},
): Bar {
  // Start fixture series on a Monday for stable weekday math (date is cosmetic).
  const start = Date.UTC(2026, 0, 5); // 2026-01-05 (Monday)
  const date = new Date(start + index * DAY_MS);
  const iso = date.toISOString().slice(0, 10);
  const high = opts.high ?? close * 1.005;
  const low = opts.low ?? close * 0.995;
  const open = opts.open ?? close * 0.999;
  const volume = opts.volume ?? 1_000_000;
  return {
    date: iso,
    time: Math.floor(date.getTime() / 1000),
    open,
    high,
    low,
    close,
    volume,
  };
}

/** N bars climbing from `start` to `end` linearly. */
export function steadyUptrend(
  n: number = 300,
  start: number = 50,
  end: number = 100,
): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const close = start + (end - start) * (i / (n - 1));
    bars.push(makeBar(i, close));
  }
  return bars;
}

/** N bars declining from `start` to `end`. */
export function steadyDowntrend(
  n: number = 300,
  start: number = 100,
  end: number = 50,
): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const close = start + (end - start) * (i / (n - 1));
    bars.push(makeBar(i, close));
  }
  return bars;
}

/** Flat for `flatN`, then sharp breakout in last `breakoutN` bars. */
export function freshBreakout(
  flatN: number = 260,
  breakoutN: number = 5,
  flatLevel: number = 100,
  breakoutEnd: number = 115,
): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < flatN; i++) {
    bars.push(makeBar(i, flatLevel + Math.sin(i / 5) * 0.5));
  }
  for (let i = 0; i < breakoutN; i++) {
    const close = flatLevel + ((breakoutEnd - flatLevel) * (i + 1)) / breakoutN;
    bars.push(
      makeBar(flatN + i, close, {
        volume: 3_500_000, // surge volume on breakout
        high: close * 1.01,
        low: close * 0.995,
      }),
    );
  }
  return bars;
}

/** Tight consolidation above a prior uptrend so MAs remain stacked underneath. */
export function tightConsolidationPattern(): Bar[] {
  const bars: Bar[] = [];
  // 200 bars rising 70 → 100
  for (let i = 0; i < 200; i++) {
    const close = 70 + (i / 200) * 30;
    bars.push(makeBar(i, close));
  }
  // Short push to ~108 so the consolidation sits above the rising 20-MA
  for (let i = 0; i < 5; i++) {
    const close = 100 + (i + 1) * 1.5;
    bars.push(makeBar(200 + i, close));
  }
  // 25 bars drifting 108 → 110 inside a narrow daily range. Slight upward
  // drift keeps `price > SMA20` true on the last bar.
  for (let i = 0; i < 25; i++) {
    const close = 108 + (i / 24) * 2 + Math.sin(i / 2) * 0.15;
    bars.push(
      makeBar(205 + i, close, {
        high: close + 0.3,
        low: close - 0.3,
        volume: 700_000,
      }),
    );
  }
  return bars;
}

/** Uptrend with a clean pullback to the 20-MA in the last few bars. */
export function pullbackTo20MA(): Bar[] {
  const bars: Bar[] = [];
  // 200 bars climbing 50 -> 130 (puts 20MA well below price)
  for (let i = 0; i < 200; i++) {
    const close = 50 + (i / 200) * 80;
    bars.push(makeBar(i, close));
  }
  // Pull back so price touches roughly where SMA20 sits (~127)
  for (let i = 0; i < 4; i++) {
    const close = 130 - (i + 1) * 0.7;
    bars.push(makeBar(200 + i, close, { low: close - 0.3, high: close + 0.2 }));
  }
  // Today: dip into MA20 (~127.5) but close above
  bars.push(makeBar(204, 128.5, { low: 127.0, high: 129.0 }));
  return bars;
}

/** Volume dries up in last 5 sessions. */
export function volumeDryUpPattern(): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < 25; i++) {
    // First 20 bars: vol around 2M
    if (i < 20) bars.push(makeBar(i, 100 + i * 0.1, { volume: 2_000_000 }));
    // Last 5 bars: vol drops to ~800K (well under 0.7 × 2M = 1.4M)
    else bars.push(makeBar(i, 102 + (i - 20) * 0.05, { volume: 800_000 }));
  }
  return bars;
}

/** 20-MA and 50-MA hugging tight (within 0.5%). */
export function maCompressionPattern(): Bar[] {
  const bars: Bar[] = [];
  // 200 bars of gradual climb 80 -> 100, last 50 hover near 100 so both MAs converge
  for (let i = 0; i < 150; i++) {
    bars.push(makeBar(i, 80 + (i / 150) * 20));
  }
  for (let i = 0; i < 60; i++) {
    bars.push(makeBar(150 + i, 100 + Math.sin(i / 3) * 0.5));
  }
  return bars;
}

/** Today's volume is 3.5× the prior 20-day average. */
export function volumeSurge(): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < 21; i++) {
    bars.push(makeBar(i, 100, { volume: 1_000_000 }));
  }
  // Today: 3.5M volume
  bars.push(makeBar(21, 103, { volume: 3_500_000 }));
  return bars;
}
