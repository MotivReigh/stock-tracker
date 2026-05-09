/**
 * Pure-function tests for the cache key builder. The Redis client itself is
 * exercised end-to-end by scripts/smoke-data-layer.ts; we don't mock it here.
 */
import { describe, it, expect } from "vitest";
import { cacheKey, CACHE_TTL } from "@/lib/cache/redis";

describe("cacheKey", () => {
  it("prefixes with the app namespace", () => {
    expect(cacheKey("quote", "NVDA")).toBe("updraft:quote:NVDA");
  });

  it("joins multiple parts with colons", () => {
    expect(cacheKey("candles", "AAPL", "D", 365)).toBe(
      "updraft:candles:AAPL:D:365",
    );
  });

  it("coerces numbers to strings", () => {
    expect(cacheKey("scan", 42)).toBe("updraft:scan:42");
  });
});

describe("CACHE_TTL constants", () => {
  it("quote TTL is short enough for live trading", () => {
    expect(CACHE_TTL.quote).toBeLessThanOrEqual(60);
  });

  it("profile TTL is at least a few hours (rarely changes)", () => {
    expect(CACHE_TTL.profile).toBeGreaterThanOrEqual(60 * 60);
  });

  it("sector TTL fits between quote (30s) and profile (24h)", () => {
    expect(CACHE_TTL.sectors).toBeGreaterThan(CACHE_TTL.quote);
    expect(CACHE_TTL.sectors).toBeLessThan(CACHE_TTL.profile);
  });
});
