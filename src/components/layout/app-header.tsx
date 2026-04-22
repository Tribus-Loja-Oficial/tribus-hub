"use client";

import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";
import { SearchModal } from "@/features/search/search-modal";
import { IngestionModal } from "@/features/ingestion/components/ingestion-modal";
import { UserMenu } from "./user-menu";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [ingestionOpen, setIngestionOpen] = useState(false);

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
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border/80 bg-card/35 px-4 shadow-sm shadow-black/[0.02] backdrop-blur-md supports-[backdrop-filter]:bg-card/25 sm:px-6 dark:shadow-black/30">
        <div className="hidden min-w-0 max-w-[min(40%,320px)] flex-1 md:block">
          <AppBreadcrumbs />
        </div>

        <div className="flex min-w-0 flex-1 justify-center md:max-w-xl">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(
              "group flex w-full max-w-md items-center gap-2.5 rounded-xl border border-border/80 bg-gradient-to-b from-card/90 to-muted/25 px-3 py-2.5 text-sm text-muted-foreground shadow-inset",
              "transition-all duration-200 ease-out hover:border-primary/22 hover:from-card hover:to-muted/35 hover:text-foreground hover:shadow-card",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1",
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="flex-1 truncate text-left text-muted-foreground group-hover:text-foreground/90">
              Buscar no workspace…
            </span>
            <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
              <kbd className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/80 shadow-inset">
                Ctrl
              </kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/80 shadow-inset">
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

          <button
            type="button"
            onClick={() => setIngestionOpen(true)}
            className={cn(
              "hidden items-center gap-1.5 rounded-lg border border-border/75 bg-muted/35 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-inset",
              "transition-all duration-200 ease-out hover:border-border hover:bg-muted/70 hover:text-foreground hover:shadow-card",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1",
              "md:flex",
            )}
            aria-label="Nova ingestão de dados"
          >
            <Package className="h-3.5 w-3.5" />
            Ingestão
          </button>

          <UserMenu />
        </div>
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <IngestionModal open={ingestionOpen} onOpenChange={setIngestionOpen} />
    </>
  );
}
