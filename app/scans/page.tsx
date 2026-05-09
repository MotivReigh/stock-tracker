import { Radar } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function ScansPage() {
  return (
    <Shell>
      <PhasePlaceholder
        title="Scans"
        phase={6}
        Icon={Radar}
        description="Ten preset scans plus a form-based custom builder for pre-breakout, just-broke-out, and established-trend setups. Coming in phase 6."
      />
    </Shell>
  );
}
