import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { listScans, pruneOldResults } from "@/lib/scans/queries";
import { runScanAndPersist } from "@/lib/scans/runner";
import { SINGLE_USER_ID } from "@/lib/db/tables";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  // Single-user MVP: just iterate the bootstrap user's enabled scans.
  const scans = (await listScans(SINGLE_USER_ID)).filter((s) => s.enabled);

  const results = [];
  for (const scan of scans) {
    try {
      const r = await runScanAndPersist(scan);
      results.push(r);
    } catch (err) {
      results.push({
        scanId: scan.id,
        scanName: scan.name,
        hits: 0,
        evaluated: 0,
        skipped: 0,
        inserted: 0,
        notes: [`error: ${(err as Error).message}`],
      });
    }
  }

  const pruned = await pruneOldResults(30);
  revalidatePath("/scans");
  revalidatePath("/");

  return NextResponse.json({ scansRun: scans.length, results, pruned });
}

export const POST = GET;
