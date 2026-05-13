import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { dispatchPending } from "@/lib/alerts/dispatcher";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const summary = await dispatchPending(100);
  revalidatePath("/alerts");
  revalidatePath("/");
  return NextResponse.json(summary);
}

export const POST = GET;
