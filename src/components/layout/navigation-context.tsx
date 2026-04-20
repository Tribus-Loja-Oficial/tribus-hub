"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

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
        href.startsWith("tel:") ||
        href === pathname
      )
        return;

      setPendingPathname(href);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // Fallback: if navigation takes too long, clear skeleton
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
