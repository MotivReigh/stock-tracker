import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Shell } from "@/components/layout/shell";

export default function StockNotFound() {
  return (
    <Shell>
      <div className="grid place-items-center min-h-[60vh] px-6">
        <div className="text-center max-w-md">
          <div className="h-12 w-12 rounded-md bg-terminal-50 dark:bg-terminal-700/20 text-terminal-700 dark:text-terminal-300 grid place-items-center mb-4 mx-auto">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Symbol not found</h1>
          <p className="text-sm text-muted mb-4">
            We couldn't find any data for that ticker. Check the spelling, or
            try one in your watchlist.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-terminal-700 dark:text-terminal-400 hover:underline"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    </Shell>
  );
}
