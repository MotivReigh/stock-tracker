import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { getSettings } from "@/lib/settings/queries";
import { sendSlackTest } from "@/lib/alerts/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = getCurrentUserId();
  const settings = await getSettings(userId);
  if (!settings.slack_webhook_url) {
    return NextResponse.json(
      { error: "No webhook configured" },
      { status: 400 },
    );
  }
  const r = await sendSlackTest(settings.slack_webhook_url);
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
