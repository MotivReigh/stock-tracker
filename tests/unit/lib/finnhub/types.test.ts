import { describe, it, expect } from "vitest";
import { normalizeQuote, type FinnhubQuote } from "@/lib/finnhub/types";

describe("normalizeQuote", () => {
  it("maps Finnhub fields to our normalized Quote shape", () => {
    const raw: FinnhubQuote = {
      c: 215.20,
      d: 3.70,
      dp: 1.75,
      h: 217.00,
      l: 211.50,
      o: 212.00,
      pc: 211.50,
      t: 1715090400, // unix seconds
    };

    const q = normalizeQuote("NVDA", raw);

    expect(q.symbol).toBe("NVDA");
    expect(q.price).toBe(215.20);
    expect(q.change).toBe(3.70);
    expect(q.changePercent).toBe(1.75);
    expect(q.high).toBe(217.00);
    expect(q.low).toBe(211.50);
    expect(q.open).toBe(212.00);
    expect(q.prevClose).toBe(211.50);
    expect(q.asOf).toBe(1715090400 * 1000);
  });

  it("treats null change/changePercent as 0", () => {
    const raw: FinnhubQuote = {
      c: 100, d: null, dp: null, h: 100, l: 100, o: 100, pc: 100, t: 1,
    };
    const q = normalizeQuote("XYZ", raw);
    expect(q.change).toBe(0);
    expect(q.changePercent).toBe(0);
  });
});
