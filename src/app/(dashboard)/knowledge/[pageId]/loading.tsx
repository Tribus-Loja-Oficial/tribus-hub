import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgePageLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 rounded ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-4 rounded ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}
