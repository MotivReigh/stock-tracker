import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { sendPushTest } from "@/lib/alerts/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = getCurrentUserId();
  const result = await sendPushTest(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
