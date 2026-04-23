import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-6 w-40" />
      <div className="rounded-xl border border-border p-6">
        <div className="flex gap-6">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
