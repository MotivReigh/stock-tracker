import { AlertCircle } from "lucide-react";

export function BarsStatusBanner({
  withBarsCount,
  universeCount,
}: {
  withBarsCount: number;
  universeCount: number;
}) {
  if (withBarsCount >= universeCount) return null;

  if (withBarsCount === 0) {
    return (
      <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 rounded-md p-4 flex items-start gap-3 text-sm">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">No daily bars in the database yet</p>
          <p className="text-xs mt-1 text-amber-800 dark:text-amber-200">
            Scans need historical OHLCV to compute signals. Run{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 rounded">
              npm run bars:refresh
            </code>{" "}
            to backfill. If <code className="font-mono">TWELVE_DATA_API_KEY</code>{" "}
            is empty, the fetcher falls back to Yahoo (works in production; may
            rate-limit your dev IP). Free Twelve Data signup:{" "}
            <a
              href="https://twelvedata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              twelvedata.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 rounded-md px-4 py-2 text-xs">
      <AlertCircle className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
      Bars loaded for {withBarsCount} of {universeCount} symbols — results will
      be partial until the refresh completes.
    </div>
  );
}
