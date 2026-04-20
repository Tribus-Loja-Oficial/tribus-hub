"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, FileText, FolderKanban, CheckSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDebounce } from "@/lib/utils/use-debounce";

interface SearchResult {
  id: string;
  type: "page" | "project" | "milestone" | "task";
  title: string;
  slug: string;
  excerpt?: string;
}

interface SearchResponse {
  data: {
    pages: SearchResult[];
    projects: SearchResult[];
    milestones: SearchResult[];
    tasks: SearchResult[];
    total: number;
  };
}

const typeIcon = {
  page: FileText,
  project: FolderKanban,
  milestone: FolderKanban,
  task: CheckSquare,
};

const typeHref = (result: SearchResult) => {
  switch (result.type) {
    case "page":
      return `/knowledge/${result.id}`;
    case "project":
      return `/projects/${result.id}`;
    case "task":
      return `/tasks`;
    default:
      return "/";
  }
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // handled by parent
        }
      }
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data, isFetching } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    enabled: debouncedQuery.length >= 2,
  });

  const allResults = data
    ? [...data.data.pages, ...data.data.projects, ...data.data.tasks, ...data.data.milestones]
    : [];

  const handleSelect = (result: SearchResult) => {
    router.push(typeHref(result));
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[20%] z-50 w-full max-w-xl translate-x-[-50%] animate-fade-in overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
          <DialogPrimitive.Title className="sr-only">
            Buscar páginas, projetos e tarefas
          </DialogPrimitive.Title>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar páginas, projetos, tarefas..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {query.length >= 2 && !isFetching && allResults.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{query}"
              </p>
            )}

            {allResults.map((result) => {
              const Icon = typeIcon[result.type];
              return (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{result.title}</p>
                    {result.excerpt && (
                      <p className="truncate text-xs text-muted-foreground">{result.excerpt}</p>
                    )}
                  </div>
                  <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground/60">
                    {result.type}
                  </span>
                </button>
              );
            })}

            {query.length < 2 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Digite ao menos 2 caracteres para buscar
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
