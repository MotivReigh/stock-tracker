/**
 * Pure indicator helpers. Used by the stock detail chart (Phase 4) and the
 * scan engine (Phase 6). No I/O, no globals — all functions take arrays in
 * and return arrays out, which makes them trivial to unit-test.
 */

/** Simple moving average. Returns same-length array; first (period-1) entries are null. */
export function sma(values: number[], period: number): (number | null)[] {
  if (period <= 0) throw new Error("period must be > 0");
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    out[i] = sum / period;
  }
  return out;
}

/** Highest closing value over the last `period` bars (inclusive of last bar). */
export function highestClose(values: number[], period: number): number | null {
  if (values.length === 0 || period <= 0) return null;
  const start = Math.max(0, values.length - period);
  let max = -Infinity;
  for (let i = start; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return Number.isFinite(max) ? max : null;
}

/** Lowest closing value over the last `period` bars. */
export function lowestClose(values: number[], period: number): number | null {
  if (values.length === 0 || period <= 0) return null;
  const start = Math.max(0, values.length - period);
  let min = Infinity;
  for (let i = start; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return Number.isFinite(min) ? min : null;
}

/** Average of the last `period` values. Used for volume averaging. */
export function average(values: number[], period: number): number | null {
  if (values.length === 0 || period <= 0) return null;
  const start = Math.max(0, values.length - period);
  let sum = 0;
  let count = 0;
  for (let i = start; i < values.length; i++) {
    sum += values[i];
    count++;
  }
  return count > 0 ? sum / count : null;
}

/** Percent change between first and last value: (last - first) / first * 100. */
export function pctChange(values: number[], lookback: number): number | null {
  if (values.length < 2 || lookback <= 0) return null;
  const last = values[values.length - 1];
  const idx = values.length - 1 - lookback;
  if (idx < 0) return null;
  const ref = values[idx];
  if (ref === 0) return null;
  return ((last - ref) / ref) * 100;
}
