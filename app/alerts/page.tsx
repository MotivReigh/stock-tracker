import { BellRing } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { AlertsList } from "@/components/alerts/alerts-list";
import { getCurrentUserId } from "@/lib/auth/user";
import { listRecentAlerts } from "@/lib/alerts/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AlertsPage() {
  const userId = getCurrentUserId();
  const alerts = await listRecentAlerts(userId, 100);

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            Phase 7 · Alerts
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BellRing className="h-6 w-6 text-terminal-600 dark:text-terminal-400" />
            Alerts inbox
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Every fresh scan trigger creates an alert with a record of which
            channels it was fanned out to and the delivery outcome. Stays here
            for 30 days before pruning.
          </p>
        </header>

        <AlertsList alerts={alerts} />
      </div>
    </Shell>
  );
}
