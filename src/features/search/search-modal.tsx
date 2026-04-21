"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search,
  FileText,
  FolderKanban,
  CheckSquare,
  Loader2,
  Target,
  TrendingUp,
  CalendarRange,
  Milestone,
} from "lucide-react";
import { useDebounce } from "@/lib/utils/use-debounce";
import { cn } from "@/lib/utils/cn";

type ResultType =
  | "page"
  | "project"
  | "milestone"
  | "task"
  | "okr_objective"
  | "okr_key_result"
  | "okr_cycle";

interface SearchResult {
  id: string;
  type: ResultType;
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
    objectives: SearchResult[];
    keyResults: SearchResult[];
    cycles: SearchResult[];
    total: number;
  };
}

const typeIcon: Record<ResultType, typeof FileText> = {
  page: FileText,
  project: FolderKanban,
  milestone: Milestone,
  task: CheckSquare,
  okr_objective: Target,
  okr_key_result: TrendingUp,
  okr_cycle: CalendarRange,
};

const typeLabel: Record<ResultType, string> = {
  page: "Página",
  project: "Projeto",
  milestone: "Milestone",
  task: "Tarefa",
  okr_objective: "Objetivo OKR",
  okr_key_result: "Key result",
  okr_cycle: "Ciclo OKR",
};

function resultHref(result: SearchResult): string {
  switch (result.type) {
    case "page":
      return `/knowledge/${result.id}`;
    case "project":
      return `/projects/${result.id}`;
    case "milestone":
      return `/projects`;
    case "task":
      return `/tasks`;
    case "okr_objective":
      return `/okr/objectives/${result.id}`;
    case "okr_key_result":
      return `/okr/key-results/${result.id}`;
    case "okr_cycle":
      return `/okr/cycles/${result.id}`;
    default:
      return "/";
  }
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

type Section = { title: string; results: SearchResult[] };

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 280);
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

  const sections = useMemo((): Section[] => {
    if (!data?.data) return [];
    const d = data.data;
    const objectives = d.objectives ?? [];
    const keyResults = d.keyResults ?? [];
    const cycles = d.cycles ?? [];
    const out: Section[] = [];
    if (d.projects.length) out.push({ title: "Projetos", results: d.projects });
    if (d.tasks.length) out.push({ title: "Tarefas", results: d.tasks });
    if (objectives.length) out.push({ title: "Objetivos OKR", results: objectives });
    if (keyResults.length) out.push({ title: "Key results", results: keyResults });
    if (cycles.length) out.push({ title: "Ciclos OKR", results: cycles });
    if (d.pages.length) out.push({ title: "Páginas e documentos", results: d.pages });
    if (d.milestones.length) out.push({ title: "Milestones", results: d.milestones });
    return out;
  }, [data]);

  const totalFlat = useMemo(() => sections.flatMap((s) => s.results), [sections]);

  const handleSelect = (result: SearchResult) => {
    router.push(resultHref(result));
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/45 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[12%] z-50 w-[min(100vw-1.5rem,32rem)] translate-x-[-50%] animate-fade-in overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <DialogPrimitive.Title className="sr-only">Busca no workspace</DialogPrimitive.Title>
          <div className="border-b border-border/80 bg-gradient-to-b from-muted/30 to-background px-4 py-3.5">
            <div className="flex items-center gap-3 rounded-xl border border-input/80 bg-background/90 px-3 py-2 shadow-inner">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Projetos, tarefas, OKRs, páginas, milestones…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {isFetching && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
              Busca em títulos e descrições do workspace. Use{" "}
              <kbd className="rounded border border-border bg-muted/80 px-1 py-0.5 font-mono text-[10px] text-foreground/90">
                Ctrl
              </kbd>
              <span className="mx-0.5">+</span>
              <kbd className="rounded border border-border bg-muted/80 px-1 py-0.5 font-mono text-[10px] text-foreground/90">
                K
              </kbd>
              <span className="hidden sm:inline"> (no Mac: </span>
              <kbd className="hidden rounded border border-border bg-muted/80 px-1 py-0.5 font-mono text-[10px] text-foreground/90 sm:inline">
                ⌘K
              </kbd>
              <span className="hidden sm:inline">)</span>
            </p>
          </div>

          <div className="max-h-[min(60vh,22rem)] overflow-y-auto py-2">
            {query.length >= 2 && !isFetching && totalFlat.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum resultado para &quot;{query}&quot;
              </p>
            )}

            {sections.map((section) => (
              <div key={section.title} className="mb-1">
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {section.title}
                </p>
                {section.results.map((result) => {
                  const Icon = typeIcon[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                        "hover:bg-accent/80 focus-visible:bg-accent/80 focus-visible:outline-none",
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {result.title}
                        </p>
                        {result.excerpt && (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                            {result.excerpt}
                          </p>
                        )}
                      </div>
                      <span className="mt-1 shrink-0 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {typeLabel[result.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {query.length < 2 && (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar em projetos, tarefas, OKRs, páginas e
                mais.
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
