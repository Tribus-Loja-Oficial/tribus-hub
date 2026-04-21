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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
              "group flex w-full max-w-md items-center gap-2.5 rounded-xl border border-border/90 bg-gradient-to-b from-muted/40 to-muted/20 px-3 py-2.5 text-sm text-muted-foreground",
              "shadow-sm transition-all hover:border-primary/25 hover:from-muted/50 hover:to-muted/30 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="flex-1 truncate text-left text-muted-foreground group-hover:text-foreground/90">
              Buscar no workspace…
            </span>
            <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
              <kbd className="rounded-md border border-border/80 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/85 shadow-sm">
                Ctrl
              </kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="rounded-md border border-border/80 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/85 shadow-sm">
                K
              </kbd>
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Buscar (Ctrl+K)"
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
