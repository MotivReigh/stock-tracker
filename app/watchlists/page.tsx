import { Star } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function WatchlistsPage() {
  return (
    <Shell>
      <PhasePlaceholder
        title="Watchlists"
        phase={5}
        Icon={Star}
        description="Unlimited named watchlists for tracking groups of tickers (Semis, Breakouts, Owned, etc). Coming in phase 5."
      />
    </Shell>
  );
}
