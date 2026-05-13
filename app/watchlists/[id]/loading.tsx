import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistDetailLoading() {
  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-24" />
        <div className="border border-app rounded-md bg-panel">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-3 py-3 border-b border-app last:border-b-0 flex items-center gap-3"
            >
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-40 hidden sm:block" />
              <Skeleton className="h-4 w-14 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
