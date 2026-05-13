import Link from "next/link";
import { Compass } from "lucide-react";
import { Shell } from "@/components/layout/shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="grid place-items-center min-h-[60vh] px-6">
        <div className="text-center max-w-md">
          <div className="h-12 w-12 rounded-md bg-terminal-50 dark:bg-terminal-700/20 text-terminal-700 dark:text-terminal-300 grid place-items-center mb-4 mx-auto">
            <Compass className="h-6 w-6" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            404
          </div>
          <h1 className="text-xl font-semibold mb-2">Page not found</h1>
          <p className="text-sm text-muted mb-4">
            That route doesn't exist in Updraft. The URL might be stale, or the
            page may have moved.
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
