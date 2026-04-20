import { Skeleton } from "@/components/ui/skeleton";

export default function KeyResultDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      <Skeleton className="h-4 w-20" />

      {/* Header card */}
      <div className="space-y-4 rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
        </div>

        {/* Values */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>

        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* Updates timeline */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-5 py-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
