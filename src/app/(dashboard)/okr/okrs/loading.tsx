import { Skeleton } from "@/components/ui/skeleton";

export default function OkrsLoading() {
  return (
    <div className="space-y-5 max-w-[1120px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
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
        <Skeleton className="h-8 w-32 rounded-md ml-auto" />
      </div>

      {/* Column labels */}
      <div className="flex gap-3 px-4 pl-12">
        <Skeleton className="flex-1 h-3" />
        <Skeleton className="w-[100px] h-3 shrink-0" />
        <Skeleton className="w-[90px] h-3 shrink-0" />
        <Skeleton className="w-[110px] h-3 shrink-0" />
        <Skeleton className="w-[168px] h-3 shrink-0" />
        <Skeleton className="w-[58px] h-3 shrink-0" />
        <Skeleton className="w-[64px] h-3 shrink-0" />
      </div>

      {/* Objective blocks */}
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            {/* Objective header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-card" style={{ borderLeft: "3px solid #e2e8f0" }}>
              <Skeleton className="w-5 h-5 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                {i === 1 && <Skeleton className="h-3 w-1/2" />}
              </div>
              <Skeleton className="w-[100px] h-3 shrink-0" />
              <Skeleton className="w-[90px] h-5 rounded-md shrink-0" />
              <Skeleton className="w-[110px] h-3 shrink-0" />
              <div className="w-[168px] flex items-center gap-2 shrink-0">
                <Skeleton className="flex-1 h-1.5 rounded-full" />
                <Skeleton className="w-9 h-3" />
              </div>
              <Skeleton className="w-[58px] h-3 shrink-0" />
              <Skeleton className="w-[64px] h-7 rounded-md shrink-0" />
            </div>

            {/* KR rows (first block expanded as example) */}
            {i === 0 && (
              <div className="border-t border-border/60">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5 bg-muted/5 border-b border-border/30 last:border-b-0">
                    <Skeleton className="w-5 h-3 shrink-0" />
                    <div className="flex-1 pl-2">
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="w-[100px] h-3 shrink-0" />
                    <Skeleton className="w-[90px] h-5 rounded-md shrink-0" />
                    <Skeleton className="w-[110px] h-3 shrink-0" />
                    <div className="w-[168px] flex items-center gap-2 shrink-0">
                      <Skeleton className="flex-1 h-1.5 rounded-full" />
                      <Skeleton className="w-9 h-3" />
                    </div>
                    <Skeleton className="w-[58px] h-3 shrink-0" />
                    <Skeleton className="w-[64px] h-7 rounded-md shrink-0" />
                  </div>
                ))}
                <div className="px-4 py-2 pl-12 bg-muted/5 border-t border-border/30">
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
