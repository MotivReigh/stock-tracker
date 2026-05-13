import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanResultsLoading() {
  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <Skeleton className="h-3 w-24" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-20" />
        <div className="border border-app rounded-md bg-panel overflow-hidden">
          <div className="border-b border-app px-3 py-2">
            <Skeleton className="h-4 w-40" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-3 py-2 border-b border-app last:border-b-0 flex items-center gap-3"
            >
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
