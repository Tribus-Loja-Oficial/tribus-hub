import { Skeleton } from "@/components/ui/skeleton";

export default function OkrsLoading() {
  return (
    <div className="max-w-[1120px] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="ml-auto h-8 w-32 rounded-md" />
      </div>

      {/* Column labels */}
      <div className="flex gap-3 px-4 pl-12">
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 w-[100px] shrink-0" />
        <Skeleton className="h-3 w-[90px] shrink-0" />
        <Skeleton className="h-3 w-[110px] shrink-0" />
        <Skeleton className="h-3 w-[168px] shrink-0" />
        <Skeleton className="h-3 w-[58px] shrink-0" />
        <Skeleton className="h-3 w-[64px] shrink-0" />
      </div>

      {/* Objective blocks */}
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border">
            {/* Objective header */}
            <div
              className="flex items-center gap-3 bg-card px-4 py-3"
              style={{ borderLeft: "3px solid #e2e8f0" }}
            >
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                {i === 1 && <Skeleton className="h-3 w-1/2" />}
              </div>
              <Skeleton className="h-3 w-[100px] shrink-0" />
              <Skeleton className="h-5 w-[90px] shrink-0 rounded-md" />
              <Skeleton className="h-3 w-[110px] shrink-0" />
              <div className="flex w-[168px] shrink-0 items-center gap-2">
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-9" />
              </div>
              <Skeleton className="h-3 w-[58px] shrink-0" />
              <Skeleton className="h-7 w-[64px] shrink-0 rounded-md" />
            </div>

            {/* KR rows (first block expanded as example) */}
            {i === 0 && (
              <div className="border-t border-border/60">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-3 border-b border-border/30 bg-muted/5 px-4 py-2.5 last:border-b-0"
                  >
                    <Skeleton className="h-3 w-5 shrink-0" />
                    <div className="flex-1 pl-2">
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-3 w-[100px] shrink-0" />
                    <Skeleton className="h-5 w-[90px] shrink-0 rounded-md" />
                    <Skeleton className="h-3 w-[110px] shrink-0" />
                    <div className="flex w-[168px] shrink-0 items-center gap-2">
                      <Skeleton className="h-1.5 flex-1 rounded-full" />
                      <Skeleton className="h-3 w-9" />
                    </div>
                    <Skeleton className="h-3 w-[58px] shrink-0" />
                    <Skeleton className="h-7 w-[64px] shrink-0 rounded-md" />
                  </div>
                ))}
                <div className="border-t border-border/30 bg-muted/5 px-4 py-2 pl-12">
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
