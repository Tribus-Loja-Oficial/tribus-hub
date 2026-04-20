"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SearchModal } from "@/features/search/search-modal";
import { UserMenu } from "./user-menu";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <div className="hidden min-w-0 max-w-[min(40%,320px)] flex-1 md:block">
          <AppBreadcrumbs />
        </div>

        <div className="flex min-w-0 flex-1 justify-center md:max-w-xl">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground",
              "shadow-sm transition-all hover:border-border hover:bg-muted/40 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Search className="h-4 w-4 shrink-0 opacity-70" />
            <span className="flex-1 truncate text-left">Buscar no workspace…</span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <UserMenu />
        </div>
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
