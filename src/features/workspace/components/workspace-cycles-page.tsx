"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  FolderKanban,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeSelectSmClassName } from "@/components/ui/form-control-classes";
import { Input } from "@/components/ui/input";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { OkrProgressBar } from "@/features/okr/components/okr-progress-bar";
import { CreateCycleDialog } from "@/features/okr/components/create-cycle-dialog";
import { UpdateCycleDialog } from "@/features/okr/components/update-cycle-dialog";
import { CycleGovernanceBadge } from "@/components/cycles/cycle-governance-badge";
import { OkrEntityStatusRow } from "@/features/okr/components/okr-status-badge";
import { ProjectHealthRow } from "@/features/projects/components/project-badges";
import { cn } from "@/lib/utils/cn";
import { formatCivilDate, parseCivilDateInput } from "@/lib/date/civil-date";
import { differenceInDays, isAfter, isBefore } from "date-fns";
import type { OkrCycle, Project } from "@/lib/types/domain";
import type {
  CycleCardStats,
  ObjectiveWithKRs,
  OkrCycleWithStats,
} from "@/lib/services/okr.service";

type SortKey = "start_desc" | "start_asc" | "end_desc" | "end_asc";
type StatusFilter = "all" | OkrCycle["status"];
type QualityFilter = "all" | "without_objectives" | "without_projects" | "without_active_projects";

/** Resposta consolidada GET /workspace/cycles (alinhar a apps/hub-api v1-extra-routes). */
type WorkspacePortfolioRow = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  summary: {
    objectiveCount: number;
    objectiveCompleted: number;
    projectCount: number;
    projectBlocked: number;
  };
  objectives: Array<{
    id: string;
    title: string;
    status: string;
    progressPercent: number;
    startDate: string | null;
    targetDate: string | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    slug?: string | null;
    status: Project["status"];
    progressPercent: number;
    startDate: string | null;
    targetDate: string | null;
    healthInsight?: Project["healthInsight"];
    workflowStatusInsight?: Project["workflowStatusInsight"];
  }>;
};

const EMPTY_CYCLE_STATS: CycleCardStats = {
  objectiveCount: 0,
  keyResultCount: 0,
  objectivesCompleted: 0,
  krsCompleted: 0,
  objectivesAtRisk: 0,
  objectivesOffTrack: 0,
  krsAtRisk: 0,
  krsOffTrack: 0,
  avgKrProgress: 0,
};

function resolveCycleStats(cycle: { stats?: CycleCardStats }): CycleCardStats {
  return cycle.stats ?? EMPTY_CYCLE_STATS;
}

function formatD(d: string | null | undefined) {
  if (!d) return "—";
  return formatCivilDate(d, "dd MMM yyyy") || "—";
}

/** Progresso temporal 0–100 e legenda contextual. */
function getTemporalLine(cycle: OkrCycle): { progress: number; caption: string } {
  const now = new Date();
  const start = parseCivilDateInput(cycle.startDate);
  const end = parseCivilDateInput(cycle.endDate);
  if (!start || !end) return { progress: 0, caption: "—" };
  if (isBefore(now, start)) {
    const days = differenceInDays(start, now);
    return { progress: 0, caption: days <= 0 ? "Começa hoje" : `Começa em ${days} dia(s)` };
  }
  if (isAfter(now, end)) {
    const daysSince = differenceInDays(now, end);
    if (daysSince === 0) return { progress: 100, caption: "Último dia do período" };
    return { progress: 100, caption: `Período encerrado há ${daysSince} dia(s)` };
  }
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  const progress = total === 0 ? 100 : Math.min(100, Math.round((elapsed / total) * 100));
  const daysLeft = differenceInDays(end, now);
  if (daysLeft === 0) return { progress, caption: `${progress}% do tempo · último dia` };
  return { progress, caption: `${progress}% do tempo decorrido · faltam ${daysLeft} dia(s)` };
}

function cycleCardTone(status: OkrCycle["status"]): string {
  switch (status) {
    case "active":
      return "border-primary/35 bg-gradient-to-br from-primary/[0.06] to-card shadow-sm ring-1 ring-primary/15";
    case "planned":
      return "border-border bg-card hover:border-muted-foreground/25";
    case "closed":
      return "border-border/80 bg-muted/25";
    default:
      return "border-border bg-card";
  }
}

export function WorkspaceCyclesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [cycleToEdit, setCycleToEdit] = useState<OkrCycle | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("start_desc");
  const [quickOnlyActive, setQuickOnlyActive] = useState(false);
  const [quickOnlyPlanned, setQuickOnlyPlanned] = useState(false);

  const { data: cyclesRes, isLoading } = useQuery<{ data: OkrCycleWithStats[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: wsRes } = useQuery<{ data: WorkspacePortfolioRow[] }>({
    queryKey: ["workspace-cycles"],
    queryFn: () => fetch("/api/workspace/cycles").then((r) => r.json()),
    staleTime: 30_000,
  });

  useEffect(() => {
    function closeMenu(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-cycle-menu]")) setMenuOpen(null);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const patchMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/okr/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar ciclo");
      return res.json();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-cycles"] });
      void queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["pm-dashboard-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okr/cycles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover ciclo");
      return res.json();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace-cycles"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["pm-dashboard-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const cycles = useMemo(() => cyclesRes?.data ?? [], [cyclesRes?.data]);
  const workspaceByCycle = useMemo(
    () => new Map((wsRes?.data ?? []).map((c) => [c.id, c])),
    [wsRes?.data],
  );

  const activeCycle = useMemo(() => cycles.find((c) => c.status === "active"), [cycles]);
  const activeStats = useMemo(
    () => (activeCycle ? resolveCycleStats(activeCycle) : null),
    [activeCycle],
  );
  const activeWsRow = activeCycle ? workspaceByCycle.get(activeCycle.id) : undefined;

  const nextPlanned = useMemo(() => {
    const now = new Date();
    const planned = cycles
      .filter((c) => c.status === "planned")
      .sort((a, b) => {
        const at = parseCivilDateInput(a.startDate)?.getTime() ?? 0;
        const bt = parseCivilDateInput(b.startDate)?.getTime() ?? 0;
        return at - bt;
      });
    return (
      planned.find((c) => {
        const st = parseCivilDateInput(c.startDate);
        return st != null && isAfter(st, now);
      }) ?? planned[0]
    );
  }, [cycles]);

  const qualityIssues = useMemo(
    () =>
      (wsRes?.data ?? []).filter(
        (c) => c.summary.objectiveCount === 0 || c.summary.projectCount === 0,
      ).length,
    [wsRes?.data],
  );

  const filteredSorted = useMemo(() => {
    let list = [...cycles];
    const q = search.trim().toLowerCase();

    if (quickOnlyActive) list = list.filter((c) => c.status === "active");
    else if (quickOnlyPlanned) list = list.filter((c) => c.status === "planned");
    else if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

    list = list.filter((c) => {
      const row = workspaceByCycle.get(c.id);
      if (!row) {
        if (qualityFilter !== "all") return false;
        return !q ? true : c.title.toLowerCase().includes(q);
      }

      if (qualityFilter === "without_objectives" && row.summary.objectiveCount > 0) return false;
      if (qualityFilter === "without_projects" && row.summary.projectCount > 0) return false;
      if (
        qualityFilter === "without_active_projects" &&
        row.projects.some((p) => p.status === "active")
      ) {
        return false;
      }

      if (!q) return true;
      const inCycle = c.title.toLowerCase().includes(q);
      const inObj = row.objectives.some((o) => o.title.toLowerCase().includes(q));
      const inProj = row.projects.some((p) => p.title.toLowerCase().includes(q));
      return inCycle || inObj || inProj;
    });

    const sortFn = (a: OkrCycleWithStats, b: OkrCycleWithStats) => {
      const as = parseCivilDateInput(a.startDate)?.getTime() ?? 0;
      const bs = parseCivilDateInput(b.startDate)?.getTime() ?? 0;
      const ae = parseCivilDateInput(a.endDate)?.getTime() ?? 0;
      const be = parseCivilDateInput(b.endDate)?.getTime() ?? 0;
      switch (sortKey) {
        case "start_asc":
          return as - bs;
        case "start_desc":
          return bs - as;
        case "end_asc":
          return ae - be;
        case "end_desc":
          return be - ae;
        default:
          return 0;
      }
    };
    list.sort(sortFn);
    return list;
  }, [
    cycles,
    qualityFilter,
    quickOnlyActive,
    quickOnlyPlanned,
    search,
    sortKey,
    statusFilter,
    workspaceByCycle,
  ]);

  function requestActivate(id: string) {
    if (
      activeCycle &&
      activeCycle.id !== id &&
      !confirm(
        `Colocar este ciclo em andamento encerrará o ciclo em andamento atual (“${activeCycle.title}”). Continuar?`,
      )
    ) {
      return;
    }
    patchMutation.mutate({ id, status: "active" });
  }

  function requestClose(id: string, title: string) {
    if (!confirm(`Encerrar o ciclo “${title}”?`)) return;
    patchMutation.mutate({ id, status: "closed" });
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="bg-primary/12 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-primary/20">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Ciclos do workspace
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Visão única dos períodos estratégicos com objetivos (OKRs) e projetos vinculados.
                Explore, filtre ou expanda cada ciclo para ver o que está sendo executado nesta
                janela temporal.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {cycles.length} ciclo{cycles.length !== 1 ? "s" : ""} cadastrado
                  {cycles.length !== 1 ? "s" : ""}
                </span>
                {activeCycle && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle className="h-3 w-3" />
                    Em andamento: {activeCycle.title}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Novo ciclo
          </Button>
        </div>
      </div>

      <PageGuide title="Como usar esta visão consolidada">
        <p>
          Esta tela agrupa informações já disponíveis em{" "}
          <strong className="text-foreground">Ciclos OKR</strong> e{" "}
          <strong className="text-foreground">Ciclos de projetos</strong>, lado a lado.
        </p>
        <GuideSection title="Nesta página:">
          <GuideList
            items={[
              "cards de resumo no topo (ciclo em andamento, totais e portfólio);",
              "busca pelo nome do ciclo, objetivo ou projeto; filtros por status de governança e qualidade da composição;",
              "lista com o mesmo modelo visual das demais telas de ciclos (tempo, estatísticas, ações);",
              "expanda o ciclo para carregar objetivos com KRs detalhados e a lista completa de projetos com situação e saúde.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {!isLoading && cycles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Ciclo em andamento"
            icon={CheckCircle}
            iconClass="text-emerald-600 dark:text-emerald-400"
            empty={!activeCycle}
            emptyLabel="Nenhum ciclo em andamento"
          >
            {activeCycle && (
              <>
                <p className="truncate font-semibold text-foreground">{activeCycle.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatD(activeCycle.startDate)} → {formatD(activeCycle.endDate)}
                </p>
                <div className="mt-2">
                  <CycleGovernanceBadge status={activeCycle.status} />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Tempo: {getTemporalLine(activeCycle).progress}%
                </div>
              </>
            )}
          </SummaryCard>
          <SummaryCard
            title="Total de ciclos"
            icon={CalendarRange}
            iconClass="text-sky-600 dark:text-sky-400"
          >
            <p className="text-2xl font-bold tabular-nums text-foreground">{cycles.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inclui planejados, ativos e encerrados
            </p>
          </SummaryCard>
          <SummaryCard
            title="Próximo planejado"
            icon={Clock}
            iconClass="text-amber-600 dark:text-amber-400"
            empty={!nextPlanned}
            emptyLabel="Nenhum ciclo planejado"
          >
            {nextPlanned && (
              <>
                <p className="truncate font-semibold text-foreground">{nextPlanned.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Início previsto {formatD(nextPlanned.startDate)}
                </p>
              </>
            )}
          </SummaryCard>
          <SummaryCard
            title="Portfólio no ciclo em andamento"
            icon={Target}
            iconClass="text-violet-600 dark:text-violet-400"
            empty={!activeCycle || !activeWsRow || !activeStats}
            emptyLabel="Sem ciclo em andamento ou dados consolidados"
          >
            {activeCycle && activeWsRow && activeStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Objetivos</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeWsRow.summary.objectiveCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Key results</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeStats.keyResultCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Projetos</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeWsRow.summary.projectCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Média KRs</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeStats.avgKrProgress}%
                  </p>
                </div>
              </div>
            )}
          </SummaryCard>
        </div>
      )}

      {!isLoading && cycles.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 bg-background pl-8 text-sm"
              placeholder="Buscar ciclo, objetivo ou projeto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            <select
              className={cn(nativeSelectSmClassName, "h-9")}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setQuickOnlyActive(false);
                setQuickOnlyPlanned(false);
              }}
            >
              <option value="all">Todos os status</option>
              <option value="planned">Planejado</option>
              <option value="active">Em andamento</option>
              <option value="closed">Encerrado</option>
            </select>
            <select
              className={cn(nativeSelectSmClassName, "h-9")}
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value as QualityFilter)}
            >
              <option value="all">Qualidade</option>
              <option value="without_objectives">Sem objetivos</option>
              <option value="without_projects">Sem projetos</option>
              <option value="without_active_projects">Sem projetos ativos</option>
            </select>
            <select
              className={cn(nativeSelectSmClassName, "h-9")}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="start_desc">Início · mais recente</option>
              <option value="start_asc">Início · mais antigo</option>
              <option value="end_desc">Término · mais recente</option>
              <option value="end_asc">Término · mais antigo</option>
            </select>
            <Button
              type="button"
              variant={quickOnlyActive ? "secondary" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setQuickOnlyActive((v) => !v);
                setQuickOnlyPlanned(false);
                setStatusFilter("all");
              }}
            >
              Só em andamento
            </Button>
            <Button
              type="button"
              variant={quickOnlyPlanned ? "secondary" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setQuickOnlyPlanned((v) => !v);
                setQuickOnlyActive(false);
                setStatusFilter("all");
              }}
            >
              Só planejados
            </Button>
          </div>
        </div>
      )}

      {qualityIssues > 0 && !isLoading && (
        <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {qualityIssues} ciclo(s) com lacuna de composição (sem objetivos e/ou sem projetos).
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80">
            <CalendarRange className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">Nenhum ciclo ainda</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Crie o primeiro ciclo para alinhar OKRs e projetos à mesma janela de tempo.
          </p>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar primeiro ciclo
          </Button>
        </div>
      )}

      {!isLoading && cycles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Todos os ciclos</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {filteredSorted.length} exibido{filteredSorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredSorted.length === 0 && (
            <p className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
              Nenhum ciclo corresponde aos filtros.{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setQualityFilter("all");
                  setQuickOnlyActive(false);
                  setQuickOnlyPlanned(false);
                }}
              >
                Limpar filtros
              </button>
            </p>
          )}

          {filteredSorted.map((cycle) => {
            const row = workspaceByCycle.get(cycle.id);
            const s = resolveCycleStats(cycle);
            const riskObj = s.objectivesAtRisk + s.objectivesOffTrack;
            const riskKr = s.krsAtRisk + s.krsOffTrack;
            const temporal = getTemporalLine(cycle);
            const blockedCount =
              row?.summary.projectBlocked ??
              row?.projects?.filter(
                (p) => p.status === "on_hold" || p.workflowStatusInsight?.slug === "blocked",
              ).length ??
              0;
            const gap =
              row != null && (row.summary.objectiveCount === 0 || row.summary.projectCount === 0);
            const isPatchingThis =
              patchMutation.isPending &&
              (patchMutation.variables as { id: string } | undefined)?.id === cycle.id;

            return (
              <div
                key={cycle.id}
                className={cn(
                  "overflow-visible rounded-2xl border transition-all",
                  cycleCardTone(cycle.status),
                  gap && "ring-1 ring-amber-400/35",
                )}
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-stretch lg:gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <button
                        type="button"
                        aria-expanded={expandedCycleId === cycle.id}
                        aria-label={
                          expandedCycleId === cycle.id
                            ? "Recolher objetivos e projetos"
                            : "Ver objetivos e projetos"
                        }
                        onClick={() =>
                          setExpandedCycleId((id) => (id === cycle.id ? null : cycle.id))
                        }
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                          expandedCycleId === cycle.id &&
                            "border-primary/40 bg-primary/5 text-primary",
                        )}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            expandedCycleId === cycle.id && "rotate-90",
                          )}
                        />
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/okr/cycles/${cycle.id}`}
                            className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {cycle.title}
                          </Link>
                          <CycleGovernanceBadge status={cycle.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="tabular-nums">{formatD(cycle.startDate)}</span>
                          <span className="mx-1.5 text-muted-foreground/60">→</span>
                          <span className="tabular-nums">{formatD(cycle.endDate)}</span>
                        </p>
                        {cycle.description && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {cycle.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs">
                          <Link
                            href={`/okr/cycles/${cycle.id}`}
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            OKR
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                          <Link
                            href="/projects/cycles"
                            className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary hover:underline"
                          >
                            Projetos
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full shrink-0 space-y-2 lg:w-[220px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Tempo do período</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {temporal.progress}%
                      </span>
                    </div>
                    <OkrProgressBar
                      percent={temporal.progress}
                      size="sm"
                      status={cycle.status === "active" ? "on_track" : undefined}
                      className={cycle.status === "closed" ? "opacity-85" : undefined}
                    />
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {temporal.caption}
                    </p>
                  </div>

                  <div className="w-full shrink-0 lg:w-[252px]">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resumo consolidado
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs xl:grid-cols-4">
                      <StatChip
                        label="Objetivos"
                        value={row?.summary.objectiveCount ?? s.objectiveCount}
                      />
                      <StatChip label="Key results" value={s.keyResultCount} />
                      <StatChip label="Projetos" value={row?.summary.projectCount ?? "—"} />
                      <StatChip label="Bloqueados" value={blockedCount} warn={blockedCount > 0} />
                      <StatChip
                        label="Objs. conc."
                        value={row?.summary.objectiveCompleted ?? "—"}
                        muted
                      />
                      <StatChip
                        label="Em risco OKR"
                        value={riskObj + riskKr > 0 ? `${riskObj} obj · ${riskKr} KR` : "—"}
                        warn={riskObj + riskKr > 0}
                      />
                      <StatChip label="Média KRs" value={`${s.avgKrProgress}%`} />
                      <StatChip
                        label="Projetos ativos"
                        value={row?.projects?.filter((p) => p.status === "active").length ?? "—"}
                      />
                    </div>
                  </div>

                  <div
                    className="flex shrink-0 flex-col items-stretch justify-center gap-2 border-t border-border/60 pt-4 lg:w-[176px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
                    data-cycle-menu
                  >
                    {cycle.status === "planned" && (
                      <Button
                        size="sm"
                        className="h-auto min-h-9 w-full justify-center gap-1.5 py-2.5"
                        disabled={isPatchingThis}
                        onClick={() => requestActivate(cycle.id)}
                      >
                        {isPatchingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Colocar em andamento
                      </Button>
                    )}
                    {cycle.status === "active" && (
                      <>
                        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          Em andamento
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={isPatchingThis}
                          onClick={() => requestClose(cycle.id, cycle.title)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Encerrar
                        </Button>
                      </>
                    )}

                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setMenuOpen(menuOpen === cycle.id ? null : cycle.id)}
                      >
                        <MoreHorizontal className="mr-1 h-4 w-4" />
                        Mais ações
                      </Button>
                      {menuOpen === cycle.id && (
                        <div className="absolute right-0 top-full z-[100] mt-1 w-52 rounded-lg border border-border bg-popover py-1 shadow-lg">
                          <Link
                            href={`/okr/cycles/${cycle.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                            onClick={() => setMenuOpen(null)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            Ver detalhes
                          </Link>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                            onClick={() => {
                              setCycleToEdit(cycle);
                              setMenuOpen(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar ciclo
                          </button>
                          <div className="my-1 border-t border-border" />
                          <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                            Status
                          </p>
                          {cycle.status !== "planned" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                patchMutation.mutate({ id: cycle.id, status: "planned" });
                                setMenuOpen(null);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Planejado
                            </button>
                          )}
                          {cycle.status !== "active" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                requestActivate(cycle.id);
                                setMenuOpen(null);
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Colocar em andamento
                            </button>
                          )}
                          {cycle.status !== "closed" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                requestClose(cycle.id, cycle.title);
                                setMenuOpen(null);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Encerrar
                            </button>
                          )}
                          {cycle.status === "closed" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Reabrir “${cycle.title}” como planejado? Revise as datas se o período já passou.`,
                                  )
                                ) {
                                  patchMutation.mutate({ id: cycle.id, status: "planned" });
                                }
                                setMenuOpen(null);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reabrir (planejado)
                            </button>
                          )}
                          <div className="my-1 border-t border-border" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted/50"
                            onClick={() => {
                              if (
                                confirm(
                                  "Remover este ciclo? Objetivos vinculados podem ficar sem ciclo.",
                                )
                              )
                                deleteMutation.mutate(cycle.id);
                              setMenuOpen(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <WorkspaceCycleExpandedPortfolio
                  cycleId={cycle.id}
                  open={expandedCycleId === cycle.id}
                  objectiveCount={s.objectiveCount}
                  projects={row?.projects ?? []}
                />
              </div>
            );
          })}
        </div>
      )}

      <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UpdateCycleDialog
        open={Boolean(cycleToEdit)}
        onOpenChange={(o) => {
          if (!o) setCycleToEdit(null);
        }}
        cycle={cycleToEdit}
      />
    </div>
  );
}

/** Objetivos (lazy) + projetos já no payload workspace. */
function WorkspaceCycleExpandedPortfolio({
  cycleId,
  open,
  objectiveCount,
  projects,
}: {
  cycleId: string;
  open: boolean;
  objectiveCount: number;
  projects: WorkspacePortfolioRow["projects"];
}) {
  const CYCLE_PORTFOLIO_STATUS_CHIP_WIDTH_PX = 116;
  const objectivesQuery = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives", "by-cycle", cycleId],
    queryFn: () =>
      fetch(`/api/okr/objectives?cycleId=${encodeURIComponent(cycleId)}`).then((r) => r.json()),
    enabled: open,
    staleTime: 30_000,
  });

  if (!open) return null;

  const objs = objectivesQuery.data?.data ?? [];

  return (
    <div className="border-t border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
      <div className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
            Objetivos neste ciclo
          </p>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {objectiveCount} cadastrado{objectiveCount !== 1 ? "s" : ""}
          </span>
        </div>
        {objectivesQuery.isLoading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/80" />
            ))}
          </div>
        )}
        {objectivesQuery.isError && (
          <p className="text-xs text-destructive">
            Não foi possível carregar os objetivos. Tente novamente.
          </p>
        )}
        {!objectivesQuery.isLoading && !objectivesQuery.isError && objs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum objetivo neste ciclo.{" "}
            <Link href="/okr/okrs" className="font-medium text-primary hover:underline">
              Criar na lista de OKRs
            </Link>
          </p>
        )}
        {!objectivesQuery.isLoading && !objectivesQuery.isError && objs.length > 0 && (
          <ul className="space-y-2">
            {objs.map((obj) => (
              <li key={obj.id}>
                <Link
                  href={`/okr/objectives/${obj.id}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {obj.title}
                  </span>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 sm:justify-end">
                    <OkrEntityStatusRow
                      status={obj.status}
                      workflowStatusInsight={obj.workflowStatusInsight}
                      healthInsight={obj.healthInsight}
                      startDate={obj.startDate}
                      targetDate={obj.targetDate}
                      progressPercent={obj.progressPercent}
                      workflowChipWidthPx={CYCLE_PORTFOLIO_STATUS_CHIP_WIDTH_PX}
                      healthChipWidthPx={CYCLE_PORTFOLIO_STATUS_CHIP_WIDTH_PX}
                    />
                    <span className="inline-block w-[7.25rem] text-right text-xs tabular-nums tracking-tight text-muted-foreground">
                      {Math.round(obj.progressPercent)}% · {obj.keyResults.length} KR
                      {obj.keyResults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border/60 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FolderKanban className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
            Projetos neste ciclo
          </p>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {projects.length} cadastrado{projects.length !== 1 ? "s" : ""}
          </span>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum projeto vinculado.{" "}
            <Link href="/projects/list" className="font-medium text-primary hover:underline">
              Abrir projetos
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={`${cycleId}:${p.id}`}>
                <Link
                  href={`/projects/${encodeURIComponent(p.slug || p.id)}`}
                  className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {p.title}
                  </span>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {p.workflowStatusInsight ? (
                      <WorkflowStatusRow
                        insight={p.workflowStatusInsight}
                        tableChipWidthPx={CYCLE_PORTFOLIO_STATUS_CHIP_WIDTH_PX}
                      />
                    ) : (
                      <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        {p.status}
                      </span>
                    )}
                    <ProjectHealthRow
                      insight={p.healthInsight}
                      tableChipWidthPx={CYCLE_PORTFOLIO_STATUS_CHIP_WIDTH_PX}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  iconClass,
  children,
  empty,
  emptyLabel,
}: {
  title: string;
  icon: ElementType;
  iconClass?: string;
  children?: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="mt-3">
        {empty ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : children}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  muted,
  warn,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className={cn("text-[10px] text-muted-foreground", muted && "opacity-90")}>{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums text-foreground",
          warn && "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}
