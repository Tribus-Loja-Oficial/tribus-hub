"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, CalendarRange, FolderKanban, Search, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { cyclePhaseLabel, getCyclePhase, type CyclePhase } from "@/lib/cycles/cycle-phase";

type WorkspaceCycle = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  summary: {
    objectiveCount: number;
    objectiveCompleted: number;
    projectCount: number;
    projectBlocked: number;
  };
  objectives: Array<{ id: string; title: string; status: string; progressPercent: number }>;
  projects: Array<{
    id: string;
    title: string;
    slug?: string | null;
    status: string;
    progressPercent: number;
  }>;
};

export function WorkspaceCyclesPage() {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | CyclePhase>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "planned" | "active" | "closed" | "archived"
  >("all");
  const [qualityFilter, setQualityFilter] = useState<
    "all" | "without_objectives" | "without_projects" | "without_active_projects"
  >("all");

  const { data, isLoading } = useQuery<{ data: WorkspaceCycle[] }>({
    queryKey: ["workspace-cycles"],
    queryFn: () => fetch("/api/workspace/cycles").then((r) => r.json()),
    staleTime: 30_000,
  });
  const cycles = data?.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cycles.filter((c) => {
      if (phaseFilter !== "all" && getCyclePhase(c.startDate, c.endDate) !== phaseFilter)
        return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (qualityFilter === "without_objectives" && c.summary.objectiveCount > 0) return false;
      if (qualityFilter === "without_projects" && c.summary.projectCount > 0) return false;
      if (
        qualityFilter === "without_active_projects" &&
        c.projects.some((p) => p.status === "active")
      ) {
        return false;
      }
      if (!q) return true;
      const inCycle = c.title.toLowerCase().includes(q);
      const inObjectives = c.objectives.some((o) => o.title.toLowerCase().includes(q));
      const inProjects = c.projects.some((p) => p.title.toLowerCase().includes(q));
      return inCycle || inObjectives || inProjects;
    });
  }, [cycles, phaseFilter, qualityFilter, search, statusFilter]);

  const qualityIssues = useMemo(
    () =>
      cycles.filter((c) => c.summary.objectiveCount === 0 || c.summary.projectCount === 0).length,
    [cycles],
  );

  return (
    <div className="max-w-6xl space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Ciclos do workspace</h1>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} ciclo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ciclo, objetivo ou projeto"
              className="h-9 pl-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
            >
              <option value="all">Todas as fases</option>
              <option value="upcoming">Por vir</option>
              <option value="running">Em andamento</option>
              <option value="ended">Encerrado</option>
              <option value="undated">Sem janela</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">Todos status</option>
              <option value="planned">Planejado</option>
              <option value="active">Ativo</option>
              <option value="closed">Encerrado</option>
              <option value="archived">Arquivado</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as typeof qualityFilter)}
            >
              <option value="all">Qualidade</option>
              <option value="without_objectives">Sem objetivos</option>
              <option value="without_projects">Sem projetos</option>
              <option value="without_active_projects">Sem ativos</option>
            </select>
          </div>
        </div>
        {qualityIssues > 0 && (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-3.5 w-3.5" />
            {qualityIssues} ciclo(s) com lacuna de composição (sem objetivos e/ou sem projetos).
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border bg-card",
                c.summary.objectiveCount === 0 || c.summary.projectCount === 0
                  ? "border-amber-400/40"
                  : "border-border",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                    <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {cyclePhaseLabel(getCyclePhase(c.startDate, c.endDate))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.startDate} → {c.endDate}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Obj: {c.summary.objectiveCount} · Proj: {c.summary.projectCount}
                </div>
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Target className="h-3.5 w-3.5" /> Objetivos
                  </p>
                  {c.objectives.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Sem objetivos neste ciclo.
                    </p>
                  ) : (
                    c.objectives.slice(0, 6).map((o) => (
                      <Link
                        key={o.id}
                        href={`/okr/objectives/${o.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/20"
                      >
                        <span className="truncate text-sm">{o.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(o.progressPercent)}%
                        </span>
                      </Link>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <FolderKanban className="h-3.5 w-3.5" /> Projetos
                  </p>
                  {c.projects.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Sem projetos neste ciclo.
                    </p>
                  ) : (
                    c.projects.slice(0, 6).map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${encodeURIComponent(p.slug || p.id)}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/20"
                      >
                        <span className="truncate text-sm">{p.title}</span>
                        <span className="text-xs text-muted-foreground">{p.status}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum ciclo encontrado com os filtros atuais.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
