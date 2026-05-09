/**
 * Token-bucket rate limiter tests.
 *
 * The exported `finnhubBucket` is the singleton; we exercise it directly
 * (mutating internal state via the `_setTokensForTest` hook) since these
 * are unit tests, not integration tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { finnhubBucket } from "@/lib/finnhub/client";

describe("finnhubBucket", () => {
  beforeEach(() => {
    finnhubBucket._setTokensForTest(60);
  });

  it("acquires immediately when tokens available", async () => {
    const start = Date.now();
    await finnhubBucket.take();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(20);
  });

  it("queues when bucket is empty", async () => {
    finnhubBucket._setTokensForTest(0);
    const start = Date.now();
    await finnhubBucket.take();
    const elapsed = Date.now() - start;
    // 1 token at 1/sec refill = ~1s wait. Allow generous slack for CI.
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it("decrements available count by 1 per take", async () => {
    finnhubBucket._setTokensForTest(5);
    await finnhubBucket.take();
    expect(finnhubBucket._availableTokens()).toBeLessThan(5);
    expect(finnhubBucket._availableTokens()).toBeGreaterThanOrEqual(4);
  });

  it("caps at MAX_TOKENS even after long idle", async () => {
    finnhubBucket._setTokensForTest(60);
    // Refill should not take it above 60.
    await new Promise((r) => setTimeout(r, 100));
    expect(finnhubBucket._availableTokens()).toBeLessThanOrEqual(60);
  });
});
