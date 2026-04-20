"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigationState } from "./navigation-context";

function NavigatingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { pendingPathname, clearPendingPathname } = useNavigationState();
  const isFirstRender = useRef(true);

  // Clear skeleton when new RSC page content arrives (children reference changes on navigation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearPendingPathname();
  }, [children]); // intentionally only [children] — fires when new page RSC arrives

  if (pendingPathname) return <NavigatingSkeleton />;
  return <>{children}</>;
}
