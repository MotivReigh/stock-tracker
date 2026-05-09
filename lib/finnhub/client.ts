/**
 * Finnhub HTTP client with token-bucket rate limiting and 429 retry.
 *
 * Free tier ceiling: 60 requests / 60 second window.
 * Bucket: 60 tokens, refills 1 per second.
 *
 * Single-process single-instance bucket. On Vercel, multiple cold-start lanes
 * could exceed the global 60/min if many crons fire simultaneously. We mitigate
 * by serializing scan + universe refresh through Redis-backed locks (Phase 6).
 */

const BASE_URL = "https://finnhub.io/api/v1";
const MAX_TOKENS = 60;
const REFILL_PER_MS = MAX_TOKENS / 60_000; // 60 tokens per 60s
const MAX_RETRIES_429 = 3;
const RETRY_BASE_MS = 500;

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(initialTokens = MAX_TOKENS) {
    this.tokens = initialTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(MAX_TOKENS, this.tokens + elapsed * REFILL_PER_MS);
    this.lastRefill = now;
  }

  /** Acquire one token. Returns immediately if available, otherwise waits. */
  async take(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.tokens -= 1;
        resolve();
      });
      this.scheduleDrain();
    });
  }

  private scheduleDrain() {
    const tokensNeeded = 1;
    const ms = Math.ceil((tokensNeeded - this.tokens) / REFILL_PER_MS);
    setTimeout(() => {
      this.refill();
      while (this.queue.length > 0 && this.tokens >= 1) {
        const next = this.queue.shift();
        if (next) next();
      }
      if (this.queue.length > 0) this.scheduleDrain();
    }, Math.max(50, ms));
  }

  /** Test-only: force the bucket to a given level. */
  _setTokensForTest(n: number) {
    this.tokens = n;
    this.lastRefill = Date.now();
  }

  _availableTokens() {
    this.refill();
    return this.tokens;
  }
}

export const finnhubBucket = new TokenBucket();

export class FinnhubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "FinnhubError";
  }
}

type FetchOptions = {
  /** Skip the rate limiter (used for tests). */
  skipRateLimit?: boolean;
};

export async function finnhubFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  opts: FetchOptions = {},
): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set");
  }

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set("token", apiKey);

  for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
    if (!opts.skipRateLimit) await finnhubBucket.take();

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES_429) {
        throw new FinnhubError(
          `Finnhub rate limited after ${MAX_RETRIES_429} retries`,
          429,
          url.pathname + url.search.replace(apiKey, "REDACTED"),
        );
      }
      const wait = RETRY_BASE_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      throw new FinnhubError(
        `Finnhub ${res.status}: ${res.statusText}`,
        res.status,
        url.pathname,
      );
    }

    return (await res.json()) as T;
  }

  throw new FinnhubError("unreachable", 0, url.pathname);
}
