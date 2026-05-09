import { describe, it, expect } from "vitest";
import { isMarketOpen, marketSession } from "@/lib/market/calendar";

/**
 * Times below are constructed in UTC; the helpers convert to America/New_York
 * via Intl.DateTimeFormat.
 */
function dateAt(isoUtc: string): Date {
  return new Date(isoUtc);
}

describe("isMarketOpen", () => {
  it("returns true Tuesday 14:00 UTC (10:00 ET)", () => {
    expect(isMarketOpen(dateAt("2026-05-12T14:00:00Z"))).toBe(true);
  });

  it("returns false on Saturday", () => {
    expect(isMarketOpen(dateAt("2026-05-09T14:00:00Z"))).toBe(false);
  });

  it("returns false on Sunday", () => {
    expect(isMarketOpen(dateAt("2026-05-10T14:00:00Z"))).toBe(false);
  });

  it("returns false at 13:25 UTC (9:25 ET) — five minutes before open", () => {
    expect(isMarketOpen(dateAt("2026-05-12T13:25:00Z"))).toBe(false);
  });

  it("returns false at 20:05 UTC (16:05 ET) — five minutes after close", () => {
    expect(isMarketOpen(dateAt("2026-05-12T20:05:00Z"))).toBe(false);
  });
});

describe("marketSession", () => {
  it("classifies pre-market 12:00 UTC (8:00 ET) as 'pre'", () => {
    expect(marketSession(dateAt("2026-05-12T12:00:00Z"))).toBe("pre");
  });

  it("classifies regular hours 14:00 UTC (10:00 ET) as 'regular'", () => {
    expect(marketSession(dateAt("2026-05-12T14:00:00Z"))).toBe("regular");
  });

  it("classifies after-hours 22:00 UTC (18:00 ET) as 'after'", () => {
    expect(marketSession(dateAt("2026-05-12T22:00:00Z"))).toBe("after");
  });

  it("classifies overnight 03:00 UTC (23:00 ET prev day) as 'closed'", () => {
    expect(marketSession(dateAt("2026-05-13T03:00:00Z"))).toBe("closed");
  });

  it("classifies weekends as 'closed'", () => {
    expect(marketSession(dateAt("2026-05-09T14:00:00Z"))).toBe("closed");
  });
});
