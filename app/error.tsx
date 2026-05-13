"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[updraft] route error", error);
  }, [error]);

  return (
    <Shell>
      <div className="grid place-items-center min-h-[60vh] px-6">
        <div className="text-center max-w-md">
          <div className="h-12 w-12 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 grid place-items-center mb-4 mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Something broke</h1>
          <p className="text-sm text-muted mb-4">
            This page hit an unexpected error. Try again, or head back to the
            dashboard.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted mb-4">
              ref · {error.digest}
            </p>
          )}
          <div className="flex items-center justify-center gap-2">
            <Button onClick={reset} variant="primary" size="sm">
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </Button>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
