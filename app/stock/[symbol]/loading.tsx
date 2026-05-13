import { Shell } from "@/components/layout/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function StockDetailLoading() {
  return (
    <Shell>
      <div className="border-b border-app bg-panel">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="ml-auto space-y-2 text-right">
            <Skeleton className="h-8 w-32 ml-auto" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Skeleton className="h-[380px]" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-[420px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </Shell>
  );
}
