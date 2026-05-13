import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { listScans, pruneOldResults } from "@/lib/scans/queries";
import { runScanAndPersist } from "@/lib/scans/runner";
import { createAndDispatchAlertsForScan } from "@/lib/alerts/dispatcher";
import { SINGLE_USER_ID } from "@/lib/db/tables";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const scans = (await listScans(SINGLE_USER_ID)).filter((s) => s.enabled);

  const results = [];
  let totalDispatched = 0;
  let totalDispatchSuccesses = 0;
  let totalDispatchFailures = 0;

  for (const scan of scans) {
    try {
      const r = await runScanAndPersist(scan);

      // Fan out alerts for the freshly-inserted scan_results.
      let dispatchNotes: string[] = [];
      try {
        const d = await createAndDispatchAlertsForScan(scan.id, r.inserted);
        totalDispatched += d.processed;
        totalDispatchSuccesses += d.successes;
        totalDispatchFailures += d.failures;
        if (d.failures > 0) {
          dispatchNotes = d.errors.slice(0, 3).map((e) => e.error);
        }
      } catch (dErr) {
        dispatchNotes = [`dispatch error: ${(dErr as Error).message}`];
      }

      results.push({
        ...r,
        notes: [...r.notes, ...dispatchNotes],
      });
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
  revalidatePath("/alerts");
  revalidatePath("/");

  return NextResponse.json({
    scansRun: scans.length,
    results,
    pruned,
    dispatch: {
      processed: totalDispatched,
      successes: totalDispatchSuccesses,
      failures: totalDispatchFailures,
    },
  });
}

export const POST = GET;
