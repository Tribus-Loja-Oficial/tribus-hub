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
  const debouncedQuery = useDebounce(query, 220);
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

  const searchEnabled = debouncedQuery.length >= 2;
  const pendingDebounce = query.trim().length >= 2 && debouncedQuery !== query.trim();

  const { data, isFetching, isFetched } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery],
    queryFn: () =>
      fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    enabled: searchEnabled,
  });

  const showLoadingRow =
    query.trim().length >= 2 && (pendingDebounce || (searchEnabled && isFetching && !data?.data));

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
    if (d.pages.length) out.push({ title: "Páginas", results: d.pages });
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[10%] z-50 w-[min(100vw-1rem,26rem)] translate-x-[-50%] animate-fade-in overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <DialogPrimitive.Title className="sr-only">Busca no workspace</DialogPrimitive.Title>

          <div className="border-b border-border/70 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
              Projetos, tarefas, OKRs e páginas.{" "}
              <kbd className="rounded border border-border/80 bg-muted/60 px-1 py-px font-mono text-[9px]">
                Ctrl
              </kbd>
              <span className="mx-0.5">+</span>
              <kbd className="rounded border border-border/80 bg-muted/60 px-1 py-px font-mono text-[9px]">
                K
              </kbd>
            </p>
          </div>

          <div className="max-h-[min(52vh,16rem)] overflow-y-auto">
            {query.trim().length < 2 && (
              <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                Mínimo 2 caracteres.
              </p>
            )}

            {query.trim().length >= 2 && showLoadingRow && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />A buscar…
              </div>
            )}

            {searchEnabled &&
              isFetched &&
              !isFetching &&
              !pendingDebounce &&
              totalFlat.length === 0 && (
                <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                  Nada encontrado.
                </p>
              )}

            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
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
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                        "hover:bg-accent/70 focus-visible:bg-accent/70 focus-visible:outline-none",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {result.title}
                      </span>
                      <span className="shrink-0 text-[9px] text-muted-foreground/80">
                        {typeLabel[result.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
