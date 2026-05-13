"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/user";
import { updateSettings } from "@/lib/settings/queries";
import { sendSlackTest } from "@/lib/alerts/slack";
import { sendPushTest } from "@/lib/alerts/push";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const webhookSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .startsWith("https://hooks.slack.com/", "Must be a Slack incoming webhook URL");

export async function saveSlackWebhookAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const url = formData.get("webhook_url");
  if (typeof url !== "string") {
    return { ok: false, error: "Missing webhook URL" };
  }
  // Empty string = clear it.
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    const userId = getCurrentUserId();
    await updateSettings(userId, {
      slack_webhook_url: null,
      slack_enabled: false,
    });
    revalidatePath("/settings");
    return { ok: true, message: "Slack webhook cleared" };
  }

  const parsed = webhookSchema.safeParse(trimmed);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const userId = getCurrentUserId();
  await updateSettings(userId, {
    slack_webhook_url: parsed.data,
    slack_enabled: true,
  });
  revalidatePath("/settings");
  return { ok: true, message: "Slack webhook saved · alerts enabled" };
}

export async function toggleChannelAction(formData: FormData): Promise<void> {
  const channel = formData.get("channel");
  const enabled = formData.get("enabled") === "true";
  const userId = getCurrentUserId();
  if (channel === "push") {
    await updateSettings(userId, { push_enabled: enabled });
  } else if (channel === "slack") {
    await updateSettings(userId, { slack_enabled: enabled });
  } else if (channel === "sms") {
    await updateSettings(userId, { sms_enabled: enabled });
  }
  revalidatePath("/settings");
}

export async function sendSlackTestAction(): Promise<ActionResult> {
  const userId = getCurrentUserId();
  const { getSettings } = await import("@/lib/settings/queries");
  const settings = await getSettings(userId);
  if (!settings.slack_webhook_url) {
    return { ok: false, error: "No Slack webhook configured" };
  }
  const r = await sendSlackTest(settings.slack_webhook_url);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, message: "Test message sent — check Slack." };
}

export async function sendPushTestAction(): Promise<ActionResult> {
  const userId = getCurrentUserId();
  const r = await sendPushTest(userId);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, message: "Test notification sent." };
}
