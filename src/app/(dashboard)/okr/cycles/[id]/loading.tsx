import { Skeleton } from "@/components/ui/skeleton";

export default function CycleDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      <Skeleton className="h-4 w-20" />

      {/* Header card */}
      <div className="space-y-4 rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Objectives */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-2.5 w-24 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
