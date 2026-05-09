/**
 * Bearer-token check for /api/cron/* endpoints. Vercel Cron sets the header
 * automatically when CRON_SECRET is configured; we also use this for manual
 * one-off triggers (curl with the same header).
 */
import { NextResponse } from "next/server";

export function authorizeCron(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
