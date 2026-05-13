import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deletePushSubscription,
  getPushSubscriptions,
} from "@/lib/alerts/push";
import { getCurrentUserId } from "@/lib/auth/user";
import { updateSettings } from "@/lib/settings/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const userId = getCurrentUserId();
  await deletePushSubscription(parsed.data.endpoint);

  // If this was the user's last subscription, flip push_enabled off.
  const remaining = await getPushSubscriptions(userId);
  if (remaining.length === 0) {
    await updateSettings(userId, { push_enabled: false });
  }
  return NextResponse.json({ ok: true });
}
