import { BarChart3 } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function SectorsPage() {
  return (
    <Shell>
      <PhasePlaceholder
        title="Sectors"
        phase={3}
        Icon={BarChart3}
        description="Sector strength heat map computed from sector ETFs (XLK, SOXX, XLE, XLF, XLV, XLI, XLY, XLP, XLB, XLRE, XLU, XLC). Coming in phase 3."
      />
    </Shell>
  );
}
