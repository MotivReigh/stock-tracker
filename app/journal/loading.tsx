import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function JournalLoading() {
  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          <Skeleton className="h-72" />
          <div className="border border-app rounded-md bg-panel">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-app last:border-b-0 space-y-2"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
