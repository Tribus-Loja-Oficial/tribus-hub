"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

const NAV_PERF = process.env.NEXT_PUBLIC_NAV_PERF === "1";

function fullPathFromHref(href: string): string {
  if (typeof window === "undefined") return href;
  try {
    const u = new URL(href, window.location.href);
    return u.pathname + u.search;
  } catch {
    return href;
  }
}

interface NavigationState {
  pendingPathname: string | null;
  clearPendingPathname: () => void;
}

const NavigationContext = createContext<NavigationState>({
  pendingPathname: null,
  clearPendingPathname: () => {},
});

export function useNavigationState() {
  return useContext(NavigationContext);
}

export function NavigationStateProvider({ children }: { children: React.ReactNode }) {
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const pathname = usePathname();

  const clearPendingPathname = useCallback(() => setPendingPathname(null), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href")!;
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      if (typeof window !== "undefined") {
        const targetFull = fullPathFromHref(href);
        const currentFull = window.location.pathname + window.location.search;
        if (targetFull === currentFull) return;
      }

      if (NAV_PERF && typeof performance !== "undefined") {
        try {
          performance.clearMarks("nav-click");
          performance.mark("nav-click");
        } catch {
          /* ignore */
        }
      }

      setPendingPathname(href);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  /** Breadcrumbs: limpar `pending` quando pathname + query coincidem com o link clicado. */
  useEffect(() => {
    if (!pendingPathname || typeof window === "undefined") return;
    try {
      const pending = new URL(pendingPathname, window.location.href);
      if (pending.pathname !== pathname) return;
      const pendingSearch = pending.search || "";
      const currentSearch = window.location.search || "";
      if (pendingSearch !== currentSearch) return;
      if (NAV_PERF && typeof performance !== "undefined") {
        try {
          performance.mark("nav-route");
          performance.measure("nav-click-to-route", "nav-click", "nav-route");
        } catch {
          /* ignore */
        }
      }
      setPendingPathname(null);
    } catch {
      if (pendingPathname.split("?")[0] === pathname) {
        setPendingPathname(null);
      }
    }
  }, [pathname, pendingPathname]);

  useEffect(() => {
    if (!pendingPathname) return;
    const t = setTimeout(clearPendingPathname, 8000);
    return () => clearTimeout(t);
  }, [pendingPathname, clearPendingPathname]);

  return (
    <NavigationContext.Provider value={{ pendingPathname, clearPendingPathname }}>
      {children}
    </NavigationContext.Provider>
  );
}
