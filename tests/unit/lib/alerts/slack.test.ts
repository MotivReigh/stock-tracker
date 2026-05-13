import { describe, it, expect } from "vitest";
import { buildSlackPayload, sendSlackAlert } from "@/lib/alerts/slack";
import type { AlertPayload } from "@/lib/alerts/types";

const sample: AlertPayload = {
  scanId: "scan-1",
  scanName: "Just Broke Out · 52-Week High + Volume",
  scanResultId: "result-1",
  symbol: "MU",
  stage: "just-broke-out",
  stockUrl: "https://updraft.example.com/stock/MU",
  snapshot: {
    symbol: "MU",
    price: 112.45,
    pctChange1d: 2.8,
    pctChange5d: 11.6,
    pctChange21d: 24.0,
    pctChange63d: 38.5,
    relVol: 3.5,
    rsScore: 96,
    rsi: 68,
    macdHistogram: 1.2,
    maLabel: "20>50>200",
    high52wDistance: 0,
    sector: "Technology",
    conviction: 94,
  },
};

describe("buildSlackPayload", () => {
  it("includes a header, section, fields, action button, and disclaimer context", () => {
    const body = buildSlackPayload(sample);
    expect(body.text).toContain("MU");
    expect(body.text).toContain("matched");
    const blocks = (body.blocks as Array<{ type: string }>);
    expect(blocks[0].type).toBe("header");
    expect(blocks[blocks.length - 1].type).toBe("context");
    // Locate the actions block and verify the button URL
    const actions = blocks.find((b) => b.type === "actions") as { elements: Array<{ url: string }> } | undefined;
    expect(actions).toBeDefined();
    expect(actions!.elements[0].url).toBe(sample.stockUrl);
  });

  it("formats null indicator values as em-dash", () => {
    const empty = {
      ...sample,
      snapshot: { ...sample.snapshot, pctChange1d: null, relVol: null, rsScore: null },
    };
    const body = buildSlackPayload(empty);
    const blocks = body.blocks as Array<{ fields?: Array<{ text: string }> }>;
    const fieldsBlock = blocks.find((b) => b.fields);
    const text = JSON.stringify(fieldsBlock?.fields);
    expect(text).toContain("—");
  });

  it("emits a stage-appropriate emoji in the header text", () => {
    expect((buildSlackPayload({ ...sample, stage: "pre-breakout" }).text as string)).toContain("🌱");
    expect((buildSlackPayload({ ...sample, stage: "just-broke-out" }).text as string)).toContain("🚀");
    expect((buildSlackPayload({ ...sample, stage: "established-trend" }).text as string)).toContain("📈");
    expect((buildSlackPayload({ ...sample, stage: "momentum" }).text as string)).toContain("🔥");
  });
});

describe("sendSlackAlert", () => {
  it("rejects non-Slack webhook URLs", async () => {
    const r = await sendSlackAlert("https://example.com/hook", sample);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Invalid Slack webhook");
  });

  it("rejects empty webhook URL", async () => {
    const r = await sendSlackAlert("", sample);
    expect(r.ok).toBe(false);
  });

  it("captures non-2xx as a failure rather than throwing", async () => {
    // Stub global fetch to return 500
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("internal error", { status: 500 })) as typeof fetch;
    try {
      const r = await sendSlackAlert(
        "https://hooks.slack.com/services/T/B/X",
        sample,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain("500");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns ok on 200", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("ok", { status: 200 })) as typeof fetch;
    try {
      const r = await sendSlackAlert(
        "https://hooks.slack.com/services/T/B/X",
        sample,
      );
      expect(r.ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
