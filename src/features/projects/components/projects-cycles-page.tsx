"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  FolderKanban,
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
import { Input } from "@/components/ui/input";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { OkrProgressBar } from "@/features/okr/components/okr-progress-bar";
import { CreateCycleDialog } from "@/features/okr/components/create-cycle-dialog";
import { UpdateCycleDialog } from "@/features/okr/components/update-cycle-dialog";
import { CycleGovernanceBadge } from "@/components/cycles/cycle-governance-badge";
import { ProjectHealthRow } from "./project-badges";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { cn } from "@/lib/utils/cn";
import { formatCivilDate, parseCivilDateInput } from "@/lib/date/civil-date";
import { differenceInDays, isAfter, isBefore } from "date-fns";
import type { OkrCycle, Project, ProjectStatus } from "@/lib/types/domain";

type SortKey = "start_desc" | "start_asc" | "end_desc" | "end_asc";
type StatusFilter = "all" | OkrCycle["status"];

type WorkspaceCycleRow = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  summary: {
    objectiveCount: number;
    projectCount: number;
    /** Alinhado ao GET /workspace/cycles (on_hold ou health_status bloqueado). */
    projectBlocked?: number;
  };
  projects: Array<{
    id: string;
    title: string;
    slug?: string | null;
    status: ProjectStatus;
    progressPercent?: number;
    healthInsight?: Project["healthInsight"];
    workflowStatusInsight?: Project["workflowStatusInsight"];
  }>;
};

function formatD(d: string | null | undefined) {
  if (!d) return "—";
  return formatCivilDate(d, "dd MMM yyyy") || "—";
}

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

export function ProjectsCyclesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [cycleToEdit, setCycleToEdit] = useState<OkrCycle | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("start_desc");
  const [quickOnlyActive, setQuickOnlyActive] = useState(false);
  const [quickOnlyPlanned, setQuickOnlyPlanned] = useState(false);

  const { data: cyclesRes, isLoading } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
  });
  const { data: workspaceCyclesRes } = useQuery<{ data: WorkspaceCycleRow[] }>({
    queryKey: ["workspace-cycles"],
    queryFn: () => fetch("/api/workspace/cycles").then((r) => r.json()),
    staleTime: 60_000,
  });
  const { data: projectsRes } = useQuery<{ data: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
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
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      void queryClient.invalidateQueries({ queryKey: ["pm-dashboard-stats"] });
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
      void queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      void queryClient.invalidateQueries({ queryKey: ["pm-dashboard-stats"] });
    },
  });

  const cycles = cyclesRes?.data ?? [];
  const workspaceByCycle = useMemo(
    () => new Map((workspaceCyclesRes?.data ?? []).map((c) => [c.id, c])),
    [workspaceCyclesRes?.data],
  );
  const projectCountByCycleId = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projectsRes?.data ?? []) {
      if (!p.cycleId) continue;
      m.set(p.cycleId, (m.get(p.cycleId) ?? 0) + 1);
    }
    return m;
  }, [projectsRes?.data]);
  const activeCycle = useMemo(() => cycles.find((c) => c.status === "active"), [cycles]);
  /** Mesma base do card “Execução no ciclo ativo”: prioriza workspace-cycles, depois lista de projetos. */
  const activeCycleExecutionStats = useMemo(() => {
    if (!activeCycle) return null;
    type ExecProject = {
      status: ProjectStatus;
      progressPercent?: number;
      healthInsight?: Project["healthInsight"];
    };
    const metrics = (projects: ExecProject[], declaredTotal?: number) => {
      const total = declaredTotal ?? projects.length;
      const activeCount = projects.filter((p) => p.status === "active").length;
      const atRiskCount = projects.filter((p) => {
        const slug = p.healthInsight?.slug;
        return slug === "at_risk" || slug === "off_track";
      }).length;
      const progresses = projects.map((p) => Number(p.progressPercent ?? 0));
      const avgProgress =
        progresses.length > 0
          ? Math.round((progresses.reduce((a, b) => a + b, 0) / progresses.length) * 10) / 10
          : 0;
      return { total, activeCount, atRiskCount, avgProgress };
    };
    const row = workspaceByCycle.get(activeCycle.id);
    if (row) {
      const projects = row.projects ?? [];
      return metrics(projects, row.summary.projectCount ?? projects.length);
    }
    const list = (projectsRes?.data ?? []).filter((p) => p.cycleId === activeCycle.id);
    if (list.length === 0) {
      return {
        total: projectCountByCycleId.get(activeCycle.id) ?? 0,
        activeCount: 0,
        atRiskCount: 0,
        avgProgress: 0,
      };
    }
    return metrics(list, list.length);
  }, [activeCycle, projectCountByCycleId, projectsRes?.data, workspaceByCycle]);
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

  const filteredSorted = useMemo(() => {
    let list = [...cycles];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q));
    if (quickOnlyActive) list = list.filter((c) => c.status === "active");
    else if (quickOnlyPlanned) list = list.filter((c) => c.status === "planned");
    else if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

    list.sort((a, b) => {
      const as = parseCivilDateInput(a.startDate)?.getTime() ?? 0;
      const bs = parseCivilDateInput(b.startDate)?.getTime() ?? 0;
      const ae = parseCivilDateInput(a.endDate)?.getTime() ?? 0;
      const be = parseCivilDateInput(b.endDate)?.getTime() ?? 0;
      if (sortKey === "start_asc") return as - bs;
      if (sortKey === "start_desc") return bs - as;
      if (sortKey === "end_asc") return ae - be;
      return be - ae;
    });
    return list;
  }, [cycles, quickOnlyActive, quickOnlyPlanned, search, sortKey, statusFilter]);

  function requestActivate(id: string) {
    if (
      activeCycle &&
      activeCycle.id !== id &&
      !confirm(
        `Colocar este ciclo em andamento encerrará o ciclo em andamento atual (“${activeCycle.title}”). Continuar?`,
      )
    )
      return;
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
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Ciclos de projetos
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Gerencie os períodos estratégicos que organizam o portfólio de projetos. O ciclo em
                andamento define o foco temporal e os filtros desta área.
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

      <PageGuide title="Como funcionam os ciclos de projetos?">
        <p>Cada ciclo organiza grupos de projetos em uma janela temporal e administrativa comum.</p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "busca, filtro de status e ordenacao por datas de inicio e fim;",
              "cada card mostra o status de governança do ciclo e o resumo de execução;",
              "expanda o ciclo para ver os projetos vinculados;",
              "ações de ciclo: colocar em andamento, encerrar, reabrir como planejado, editar e remover.",
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
            title="Execução no ciclo em andamento"
            icon={Target}
            iconClass="text-violet-600 dark:text-violet-400"
            empty={!activeCycle}
            emptyLabel="Sem ciclo em andamento"
          >
            {activeCycle && activeCycleExecutionStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Projetos</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeCycleExecutionStats.total}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ativos</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeCycleExecutionStats.activeCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Em risco</p>
                  <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                    {activeCycleExecutionStats.atRiskCount > 0
                      ? `${activeCycleExecutionStats.atRiskCount} proj.`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Média progresso</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {`${activeCycleExecutionStats.avgProgress}%`}
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
              placeholder="Buscar por nome do ciclo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
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
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="start_desc">Inicio · mais recente</option>
              <option value="start_asc">Inicio · mais antigo</option>
              <option value="end_desc">Termino · mais recente</option>
              <option value="end_asc">Termino · mais antigo</option>
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

      {!isLoading && cycles.length > 0 && (
        <div className="space-y-4">
          {filteredSorted.map((cycle) => {
            const row = workspaceByCycle.get(cycle.id);
            const projectCount = row?.projects?.length ?? projectCountByCycleId.get(cycle.id) ?? 0;
            const blockedCount =
              row?.summary.projectBlocked ??
              row?.projects?.filter(
                (p) => p.status === "on_hold" || p.workflowStatusInsight?.slug === "blocked",
              ).length ??
              0;
            const temporal = getTemporalLine(cycle);
            const isPatchingThis =
              patchMutation.isPending &&
              (patchMutation.variables as { id: string } | undefined)?.id === cycle.id;
            return (
              <div
                key={cycle.id}
                className={cn(
                  "overflow-visible rounded-2xl border transition-all",
                  cycleCardTone(cycle.status),
                )}
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-stretch lg:gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <button
                        type="button"
                        aria-expanded={expandedCycleId === cycle.id}
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
                        <Link
                          href={`/okr/cycles/${cycle.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Ver detalhes do ciclo
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="w-full shrink-0 space-y-2 lg:w-[220px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Tempo do periodo</span>
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

                  <div className="w-full shrink-0 lg:w-[240px]">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resumo no ciclo
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <StatChip label="Projetos" value={projectCount} />
                      <StatChip label="Objetivos" value={row?.summary?.objectiveCount ?? 0} />
                      <StatChip label="Bloqueados" value={blockedCount} warn={blockedCount > 0} />
                      <StatChip
                        label="Ativos"
                        value={row?.projects?.filter((p) => p.status === "active").length ?? 0}
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
                        className="w-full justify-center gap-1.5"
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
                              if (confirm("Remover este ciclo?")) deleteMutation.mutate(cycle.id);
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

                <CycleExpandedProjects
                  cycleId={cycle.id}
                  open={expandedCycleId === cycle.id}
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

function CycleExpandedProjects({
  cycleId,
  open,
  projects,
}: {
  cycleId: string;
  open: boolean;
  projects: WorkspaceCycleRow["projects"];
}) {
  if (!open) return null;
  const CYCLE_PROJECT_STATUS_CHIP_WIDTH_PX = 116;
  return (
    <div className="border-t border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Projetos neste ciclo
        </p>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {projects.length} cadastrado{projects.length !== 1 ? "s" : ""}
        </span>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum projeto vinculado a este ciclo.{" "}
          <Link href="/projects/list" className="font-medium text-primary hover:underline">
            Vincular projeto na lista
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
                      tableChipWidthPx={CYCLE_PROJECT_STATUS_CHIP_WIDTH_PX}
                    />
                  ) : (
                    <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                      {p.status}
                    </span>
                  )}
                  <ProjectHealthRow
                    insight={p.healthInsight}
                    tableChipWidthPx={CYCLE_PROJECT_STATUS_CHIP_WIDTH_PX}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
  icon: React.ElementType;
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
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
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
