/**
 * Slack incoming-webhook sender. POST a Block Kit message.
 *
 * Failure handling: any non-2xx is captured as a SendResult error rather
 * than thrown — the dispatcher logs it but does not block other channels.
 */
import type { AlertPayload, SendResult } from "./types";

export class SlackError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SlackError";
  }
}

const EMOJI_FOR_STAGE: Record<string, string> = {
  "pre-breakout": "🌱",
  "just-broke-out": "🚀",
  "established-trend": "📈",
  momentum: "🔥",
};

const STAGE_LABEL: Record<string, string> = {
  "pre-breakout": "Pre-Breakout",
  "just-broke-out": "Just Broke Out",
  "established-trend": "Established Trend",
  momentum: "Momentum",
};

/** Pure helper: produces the JSON body POSTed to the webhook. Exposed for tests. */
export function buildSlackPayload(p: AlertPayload): Record<string, unknown> {
  const emoji = EMOJI_FOR_STAGE[p.stage] ?? "📊";
  const stageLabel = STAGE_LABEL[p.stage] ?? p.stage;

  const s = p.snapshot;
  const pct = (n: number | null) =>
    n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
  const num = (n: number | null, precision = 0, suffix = "") =>
    n === null ? "—" : n.toFixed(precision) + suffix;
  const usd = (n: number | null) =>
    n === null ? "—" : `$${n.toFixed(2)}`;

  return {
    text: `${emoji} Updraft: ${p.symbol} matched ${p.scanName}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ${p.symbol} · ${stageLabel}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${p.scanName}*\nConviction *${s.conviction}/100*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Price*\n${usd(s.price)}` },
          { type: "mrkdwn", text: `*% 1D*\n${pct(s.pctChange1d)}` },
          { type: "mrkdwn", text: `*Rel Vol*\n${num(s.relVol, 2, "×")}` },
          { type: "mrkdwn", text: `*RS*\n${num(s.rsScore, 0)}` },
          { type: "mrkdwn", text: `*% 1M*\n${pct(s.pctChange21d)}` },
          { type: "mrkdwn", text: `*MA*\n${s.maLabel ?? "—"}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: `Open ${p.symbol}` },
            url: p.stockUrl,
            style: "primary",
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "_Personal use · Not financial advice_",
          },
        ],
      },
    ],
  };
}

/** Send `payload` to `webhookUrl`. */
export async function sendSlackAlert(
  webhookUrl: string,
  payload: AlertPayload,
): Promise<SendResult> {
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { ok: false, channel: "slack", error: "Invalid Slack webhook URL" };
  }
  try {
    const body = buildSlackPayload(payload);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        channel: "slack",
        error: `Slack ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, channel: "slack" };
  } catch (err) {
    return {
      ok: false,
      channel: "slack",
      error: `Slack fetch failed: ${(err as Error).message}`,
    };
  }
}

/** Lightweight "test" payload independent of scans — used by /settings test button. */
export async function sendSlackTest(webhookUrl: string): Promise<SendResult> {
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return { ok: false, channel: "slack", error: "Invalid Slack webhook URL" };
  }
  const body = {
    text: "✅ Updraft test alert · channel is connected",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "✅ Updraft test alert" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Your Slack webhook is working. Real scan triggers will land here.",
        },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "_Personal use · Not financial advice_" },
        ],
      },
    ],
  };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        channel: "slack",
        error: `Slack ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    return { ok: true, channel: "slack" };
  } catch (err) {
    return {
      ok: false,
      channel: "slack",
      error: (err as Error).message,
    };
  }
}
