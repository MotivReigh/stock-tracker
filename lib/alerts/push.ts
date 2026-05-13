/**
 * Web Push sender using the `web-push` library + VAPID auth.
 *
 * Subscriptions are stored in updraft_push_subscriptions. On 404/410 (the
 * subscription has been revoked or expired by the browser), we delete the
 * row so it doesn't keep generating errors.
 */
import webpush from "web-push";
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import type { AlertPayload, SendResult } from "./types";

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:tylershill@gmail.com";
  if (!pub || !priv) {
    throw new Error(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing — run `npx web-push generate-vapid-keys` and add to .env.local",
    );
  }
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at: string;
};

export async function getPushSubscriptions(
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.pushSubscriptions)
    .select("*")
    .eq("user_id", userId);
  if (error) throw new Error(`getPushSubscriptions: ${error.message}`);
  return (data ?? []) as PushSubscriptionRow[];
}

export async function upsertPushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.pushSubscriptions)
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(`upsertPushSubscription: ${error.message}`);
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.pushSubscriptions)
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw new Error(`deletePushSubscription: ${error.message}`);
}

function buildPushBody(payload: AlertPayload): string {
  const s = payload.snapshot;
  const pct = s.pctChange1d ?? 0;
  const sign = pct >= 0 ? "+" : "";
  return JSON.stringify({
    title: `🚀 ${payload.symbol} · ${payload.scanName}`,
    body: `Price $${s.price?.toFixed(2) ?? "—"} (${sign}${pct.toFixed(2)}%) · Conviction ${s.conviction}/100`,
    tag: `${payload.scanId}-${payload.symbol}`,
    url: payload.stockUrl,
  });
}

/**
 * Send `payload` to every subscription belonging to `userId`. Returns the
 * combined SendResult. A single failure does not block other subscriptions.
 * Expired subscriptions (404/410) are auto-cleaned.
 */
export async function sendPushAlert(
  userId: string,
  payload: AlertPayload,
): Promise<SendResult> {
  ensureVapid();
  const subscriptions = await getPushSubscriptions(userId);
  if (subscriptions.length === 0) {
    return {
      ok: false,
      channel: "push",
      error: "No push subscriptions registered for this user",
    };
  }

  const body = buildPushBody(payload);
  let successes = 0;
  const errors: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
        );
        successes++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          // Subscription is dead; prune so we don't keep failing.
          try {
            await deletePushSubscription(sub.endpoint);
          } catch (delErr) {
            errors.push(`prune failed: ${(delErr as Error).message}`);
          }
        } else {
          errors.push(`${code ?? "?"}: ${(err as Error).message}`);
        }
      }
    }),
  );

  if (successes > 0) {
    return { ok: true, channel: "push" };
  }
  return {
    ok: false,
    channel: "push",
    error: errors.length > 0 ? errors.join("; ") : "All subscriptions failed",
  };
}

/** Test payload independent of scans. */
export async function sendPushTest(userId: string): Promise<SendResult> {
  ensureVapid();
  const subscriptions = await getPushSubscriptions(userId);
  if (subscriptions.length === 0) {
    return {
      ok: false,
      channel: "push",
      error: "No push subscriptions — grant permission first",
    };
  }
  const body = JSON.stringify({
    title: "✅ Updraft test push",
    body: "Browser push is wired up. Real scan triggers will appear here.",
    tag: "test-push",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "/",
  });

  let successes = 0;
  const errors: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
        );
        successes++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await deletePushSubscription(sub.endpoint).catch(() => undefined);
        } else {
          errors.push(`${code ?? "?"}: ${(err as Error).message}`);
        }
      }
    }),
  );

  return successes > 0
    ? { ok: true, channel: "push" }
    : { ok: false, channel: "push", error: errors.join("; ") || "All sends failed" };
}
