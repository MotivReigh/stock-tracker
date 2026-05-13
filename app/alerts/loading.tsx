import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="border border-app rounded-md bg-panel">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-3 py-3 border-b border-app last:border-b-0 flex items-start gap-3"
            >
              <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
