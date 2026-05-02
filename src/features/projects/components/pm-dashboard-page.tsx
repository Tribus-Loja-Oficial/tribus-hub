"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  FolderKanban,
  AlertTriangle,
  Ban,
  CalendarX,
  CheckCircle2,
  Gauge,
  Plus,
  ChevronRight,
  List,
  TrendingUp,
  Flag,
  Clock,
  Activity,
  Layers3,
  Search,
  Eye,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeSelectSmClassName } from "@/components/ui/form-control-classes";
import { Input } from "@/components/ui/input";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCivilDate } from "@/lib/date/civil-date";
import { ProjectHealthRow, PriorityBadge } from "./project-badges";
import type { OkrCycle, Project, WorkflowStatusInsight } from "@/lib/types/domain";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { cn } from "@/lib/utils/cn";
import { CycleGovernanceBadge } from "@/components/cycles/cycle-governance-badge";

interface UpcomingMilestone {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  status: string;
  dueDate: string | null;
  priority: string;
  workflowStatusInsight?: WorkflowStatusInsight | null;
}

interface OverdueTaskRow {
  id: string;
  title: string;
  projectId: string | null;
  projectTitle: string | null;
  dueDate: string | null;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  atRisk: number;
  /** Projetos ativos com health por ritmo no rumo ou adiantado (mesmo motor da hierarquia). */
  paceOnTrackActive?: number;
  blocked: number;
  overdueMilestones: number;
  completedProjects: number;
  upcomingMilestones: UpcomingMilestone[];
  overdueTasksCount: number;
  overdueMilestonesList?: UpcomingMilestone[];
  overdueTasksList?: OverdueTaskRow[];
}

type WorkspaceCycleRow = {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  summary: { objectiveCount: number; projectCount: number };
  projects: Array<{
    id: string;
    title: string;
    slug?: string | null;
    status: string;
    healthInsight?: Project["healthInsight"];
    workflowStatusInsight?: Project["workflowStatusInsight"];
  }>;
};

const CYCLE_GOVERNANCE_OPTIONS: Array<{
  value: "all" | OkrCycle["status"];
  label: string;
}> = [
  { value: "all", label: "Todos os status" },
  { value: "planned", label: "Planejado" },
  { value: "active", label: "Em andamento" },
  { value: "closed", label: "Encerrado" },
];

/** Mesmo contrato do dashboard OKR: padrão = ciclo em andamento no backend; opção explícita para todos os ciclos. */
const PM_DASHBOARD_FILTER_ACTIVE = "__pm_dashboard_active_cycle__";
const PM_DASHBOARD_FILTER_ALL = "__pm_dashboard_all_cycles__";

function OverdueExpandablePanel({
  icon: Icon,
  title,
  count,
  variant,
  defaultOpen = false,
  emptyLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  variant: "warn" | "risk";
  defaultOpen?: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone =
    variant === "warn"
      ? "border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/25"
      : "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/25";

  return (
    <div className={cn("overflow-hidden rounded-xl border", tone)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background/40"
        aria-expanded={open}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            variant === "warn" ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {count} {title}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {open ? "Clique para recolher" : "Clique para ver a lista"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/60 bg-card/30 px-2 py-2">
          {count === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  href,
  highlight = "none",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  sub?: string;
  href?: string;
  /** Destaque quando o indicador precisa de atenção (cores alinhadas aos alertas antigos). */
  highlight?: "none" | "risk" | "warn";
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full min-h-[118px] gap-3 rounded-xl border bg-card p-4 transition-shadow",
        href && "group-hover:shadow-sm",
        highlight === "risk" && value > 0 && "border-red-200 bg-red-50/50",
        highlight === "warn" && value > 0 && "border-orange-200 bg-orange-50/50",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl",
          color,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn(
            "text-2xl font-bold tabular-nums leading-none text-foreground",
            highlight === "risk" && value > 0 && "text-red-700",
            highlight === "warn" && value > 0 && "text-orange-800 dark:text-orange-100",
          )}
        >
          {value}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{label}</p>
        <div className="mt-auto min-h-[2.25rem] pt-1 text-[10px] leading-snug text-muted-foreground/65">
          {sub ? (
            sub
          ) : (
            <span className="inline-block select-none opacity-0" aria-hidden>
              .
            </span>
          )}
        </div>
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="group block h-full min-h-[118px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  ) : (
    <div className="h-full min-h-[118px]">{inner}</div>
  );
}

export function PmDashboardPage() {
  const pathname = usePathname();
  const view: "overview" | "cycles" = pathname.startsWith("/projects/cycles")
    ? "cycles"
    : "overview";
  const [cycleSearch, setCycleSearch] = useState("");
  const [cycleGovernanceFilter, setCycleGovernanceFilter] = useState<"all" | OkrCycle["status"]>(
    "all",
  );
  const [cycleQualityFilter, setCycleQualityFilter] = useState<
    "all" | "without_objectives" | "without_projects" | "without_active_projects"
  >("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "active" | "blocked">(
    "all",
  );
  const [projectHealthFilter, setProjectHealthFilter] = useState<
    "all" | "at_risk" | "off_track" | "on_track"
  >("all");
  const [overviewCycleFilter, setOverviewCycleFilter] = useState<string>(
    PM_DASHBOARD_FILTER_ACTIVE,
  );

  const pmDashboardQueryParams = useMemo(() => {
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ALL) return "?allCycles=1";
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ACTIVE) return "";
    return `?cycleId=${encodeURIComponent(overviewCycleFilter)}`;
  }, [overviewCycleFilter]);

  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ["pm-dashboard-stats", overviewCycleFilter],
    queryFn: async () => {
      const r = await fetch(`/api/pm/dashboard${pmDashboardQueryParams}`);
      const body = (await r.json()) as { data?: DashboardStats; error?: { message?: string } };
      if (!r.ok) throw new Error(body?.error?.message ?? "Falha ao carregar o dashboard");
      return body as { data: DashboardStats };
    },
    staleTime: 30_000,
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery<{ data: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    staleTime: 30_000,
  });
  const { data: cyclesRes, isLoading: cyclesLoading } = useQuery<{ data: WorkspaceCycleRow[] }>({
    queryKey: ["workspace-cycles"],
    queryFn: () => fetch("/api/workspace/cycles").then((r) => r.json()),
    staleTime: 60_000,
  });

  const stats = statsData?.data;
  const projects = projectsData?.data ?? [];
  const workspaceCycles = cyclesRes?.data ?? [];

  const activeCycleForOverview = useMemo(
    () => workspaceCycles.find((c) => c.status === "active") ?? null,
    [workspaceCycles],
  );

  const scopedOverviewProjects = useMemo(() => {
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ALL) return projects;
    const resolvedCycleId =
      overviewCycleFilter === PM_DASHBOARD_FILTER_ACTIVE
        ? (activeCycleForOverview?.id ?? null)
        : overviewCycleFilter;
    if (!resolvedCycleId) return projects;
    return projects.filter((p) => p.cycleId === resolvedCycleId);
  }, [projects, overviewCycleFilter, activeCycleForOverview?.id]);

  const overviewScopeBadge = useMemo(() => {
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ALL) return "Todos os ciclos";
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ACTIVE) {
      return activeCycleForOverview?.title ?? null;
    }
    return workspaceCycles.find((c) => c.id === overviewCycleFilter)?.title ?? null;
  }, [overviewCycleFilter, activeCycleForOverview?.title, workspaceCycles]);

  const overviewScopeDescription = useMemo(() => {
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ALL) {
      return "Métricas e listas consideram projetos de todos os ciclos do workspace.";
    }
    if (overviewCycleFilter === PM_DASHBOARD_FILTER_ACTIVE) {
      return activeCycleForOverview
        ? "Métricas e listas limitadas ao ciclo em andamento."
        : "Sem ciclo em andamento: métricas e listas consideram o portfólio inteiro.";
    }
    return "Métricas e listas limitadas ao ciclo selecionado.";
  }, [overviewCycleFilter, activeCycleForOverview]);

  const activeProjects = scopedOverviewProjects
    .filter((p) => p.status === "active")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const attentionProjects = scopedOverviewProjects.filter((p) => {
    const slug = p.healthInsight?.slug;
    return slug === "at_risk" || slug === "off_track";
  });

  const recentProjects = scopedOverviewProjects
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const cyclesWithProjects = useMemo(() => {
    const cycles = cyclesRes?.data ?? [];
    return [
      ...cycles.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status as OkrCycle["status"],
        startDate: c.startDate,
        endDate: c.endDate,
        objectiveCount: Number(c.summary?.objectiveCount ?? 0),
        projects: c.projects ?? [],
      })),
      {
        id: "__without_cycle__",
        title: "Sem ciclo",
        status: "planned" as const,
        startDate: null,
        endDate: null,
        objectiveCount: 0,
        projects: projects.filter((p) => !p.cycleId),
      },
    ];
  }, [cyclesRes?.data, projects]);
  const filteredCycles = useMemo(() => {
    const q = cycleSearch.trim().toLowerCase();
    return cyclesWithProjects.filter((c) => {
      if (cycleGovernanceFilter !== "all" && c.status !== cycleGovernanceFilter) return false;
      if (cycleQualityFilter === "without_projects" && c.projects.length > 0) return false;
      if (cycleQualityFilter === "without_objectives" && c.objectiveCount > 0) return false;
      if (
        cycleQualityFilter === "without_active_projects" &&
        c.projects.some((p) => p.status === "active")
      ) {
        return false;
      }
      if (projectStatusFilter !== "all") {
        const hasProjectByStatus =
          projectStatusFilter === "active"
            ? c.projects.some((p) => p.status === "active")
            : c.projects.some((p) => p.status === "on_hold" || p.status === "blocked");
        if (!hasProjectByStatus) return false;
      }
      if (projectHealthFilter !== "all") {
        const hasProjectByHealth = c.projects.some(
          (p) => p.healthInsight?.slug === projectHealthFilter,
        );
        if (!hasProjectByHealth) return false;
      }
      if (!q) return true;
      if (c.title.toLowerCase().includes(q)) return true;
      return c.projects.some((p) => p.title.toLowerCase().includes(q));
    });
  }, [
    cycleGovernanceFilter,
    cycleQualityFilter,
    cycleSearch,
    cyclesWithProjects,
    projectHealthFilter,
    projectStatusFilter,
  ]);
  const cycleIssuesCount = useMemo(
    () =>
      cyclesWithProjects.filter((c) => c.projects.length === 0 || c.objectiveCount === 0).length,
    [cyclesWithProjects],
  );

  return (
    <div className="max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold leading-tight text-foreground">
                {view === "cycles" ? "Ciclos de projetos" : "Projetos"}
              </h1>
              {view === "overview" && overviewScopeBadge && (
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  {overviewScopeBadge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {view === "cycles"
                ? "Organização temporal do portfólio por ciclos"
                : view === "overview"
                  ? overviewScopeDescription
                  : "Visão executiva do portfólio"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {view === "overview" && workspaceCycles.length > 0 && (
            <select
              className={cn(nativeSelectSmClassName, "h-9 min-w-[12rem]")}
              value={overviewCycleFilter}
              onChange={(e) => setOverviewCycleFilter(e.target.value)}
              aria-label="Filtrar dashboard por ciclo"
            >
              <option value={PM_DASHBOARD_FILTER_ACTIVE}>
                {activeCycleForOverview
                  ? `Ciclo em andamento (${activeCycleForOverview.title})`
                  : "Ciclo em andamento"}
              </option>
              <option value={PM_DASHBOARD_FILTER_ALL}>Todos os ciclos</option>
              {workspaceCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.status === "active" ? " (em andamento)" : ""}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant={view === "overview" ? "default" : "outline"} size="sm" asChild>
              <Link href="/projects">
                <Activity className="h-3.5 w-3.5" />
                Visão geral
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/projects/list">
                <List className="h-3.5 w-3.5" />
                Todos os projetos
              </Link>
            </Button>
            <Button variant={view === "cycles" ? "default" : "outline"} size="sm" asChild>
              <Link href="/projects/cycles">
                <Layers3 className="h-3.5 w-3.5" />
                Ciclos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <PageGuide title="O que é o Project Manager?">
        <p>
          Visão executiva do portfólio de projetos. Acompanhe o status, health e progresso de todos
          os projetos em um só lugar, organizados por ciclos.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cards de health mostram projetos em risco, bloqueados e no prazo;",
              "milestones e tasks em atraso aparecem em painéis expansíveis abaixo dos próximos milestones, com atalho para o detalhe;",
              'o filtro por ciclo (visão geral) segue o mesmo padrão do dashboard OKR: começa no ciclo em andamento; use "Todos os ciclos" para o portfólio inteiro;',
              "clique em qualquer card para abrir a lista ou vista relacionada;",
              "cada ciclo tem um único status de governança (planejado, em andamento ou encerrado), alinhado às demais telas de ciclos do hub.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {/* Stats — mesma altura por card; agrupado por Projetos / Milestones / Tasks */}
      {view === "overview" && statsLoading ? (
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="min-h-[118px] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      ) : view === "overview" && stats ? (
        <div className="space-y-8">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Projetos
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 [&>*]:min-h-0">
              <StatCard
                icon={FolderKanban}
                label="Total"
                value={stats.totalProjects}
                color="bg-blue-50 text-blue-600"
                href="/projects/list"
              />
              <StatCard
                icon={TrendingUp}
                label="Ativos"
                value={stats.activeProjects}
                color="bg-emerald-50 text-emerald-600"
                href="/projects/list?status=in_progress"
              />
              <StatCard
                icon={Gauge}
                label="No rumo (ritmo)"
                value={stats.paceOnTrackActive ?? 0}
                color="bg-teal-50 text-teal-600"
                sub="Ativos · health por datas + progresso"
                href="/projects/list?status=in_progress"
              />
              <StatCard
                icon={AlertTriangle}
                label="Em risco"
                value={stats.atRisk}
                color="bg-yellow-50 text-yellow-600"
                highlight="risk"
                href="/projects/list?health=at_risk"
              />
              <StatCard
                icon={Ban}
                label="Bloqueados"
                value={stats.blocked}
                color="bg-red-50 text-red-600"
                highlight="risk"
                href="/projects/list?health=blocked"
              />
              <StatCard
                icon={CheckCircle2}
                label="Concluídos"
                value={stats.completedProjects}
                color="bg-slate-100 text-slate-600"
                href="/projects/list?status=completed"
              />
            </div>
          </section>
        </div>
      ) : null}

      {/* Main grid */}
      {view === "overview" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Active projects — 2/3 width */}
          <div className="space-y-4 lg:col-span-2">
            {/* Active projects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-primary/70" />
                  Projetos ativos
                </h2>
                <Link
                  href="/projects/list?status=in_progress"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {projectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : activeProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                  <FolderKanban className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link href="/projects/list">
                      <Plus className="h-3.5 w-3.5" />
                      Criar projeto
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {activeProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {project.title}
                        </p>
                        {project.summary && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {project.summary}
                          </p>
                        )}
                        {(project.progressPercent ?? 0) > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{ width: `${Math.min(100, project.progressPercent ?? 0)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                              {Math.round(project.progressPercent ?? 0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ProjectHealthRow insight={project.healthInsight} />
                        <PriorityBadge priority={project.priority} />
                        {project.targetDate && (
                          <span className="hidden text-[11px] text-muted-foreground md:block">
                            {formatCivilDate(project.targetDate, "dd MMM")}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming milestones */}
            {!statsLoading && stats && stats.upcomingMilestones.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Flag className="h-4 w-4 text-amber-500/80" />
                  Próximos milestones{" "}
                  <span className="text-xs font-normal text-muted-foreground">(14 dias)</span>
                </h2>
                <div className="overflow-hidden rounded-xl border border-border">
                  {stats.upcomingMilestones.map((m) => (
                    <Link
                      key={m.id}
                      href={`/projects/${m.projectId}`}
                      className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/20"
                    >
                      <Flag className="h-3.5 w-3.5 shrink-0 text-amber-500/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {m.projectTitle}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <WorkflowStatusRow insight={m.workflowStatusInsight} />
                        {m.dueDate && (
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatCivilDate(m.dueDate, "dd MMM")}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!statsLoading && stats && (
              <div
                className={cn(
                  "space-y-4",
                  stats.upcomingMilestones.length > 0 &&
                    "mt-8 border-t-2 border-dashed border-border/80 pt-8",
                )}
              >
                <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarX className="h-4 w-4 text-orange-600/80" />
                  Prazos em atraso
                  <span className="text-xs font-normal text-muted-foreground">
                    (mesmo escopo do filtro de ciclo do topo)
                  </span>
                </h2>

                <OverdueExpandablePanel
                  icon={Flag}
                  title="milestones atrasados"
                  count={stats.overdueMilestones}
                  variant="warn"
                  emptyLabel="Nenhum milestone atrasado neste escopo."
                >
                  <ul className="divide-y divide-border/60">
                    {(stats.overdueMilestonesList ?? []).map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 px-2 py-2.5 first:pt-1 last:pb-1"
                      >
                        <Flag className="h-3.5 w-3.5 shrink-0 text-orange-500/70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {m.projectTitle}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <WorkflowStatusRow insight={m.workflowStatusInsight} />
                          {m.dueDate && (
                            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                              {formatCivilDate(m.dueDate, "dd MMM")}
                            </span>
                          )}
                          <Link
                            href={`/projects/${encodeURIComponent(m.projectId)}/milestones/${encodeURIComponent(m.id)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            aria-label={`Ver detalhes do milestone ${m.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {stats.overdueMilestones > (stats.overdueMilestonesList ?? []).length ? (
                    <p className="px-2 pb-1 text-[10px] text-muted-foreground">
                      Lista limitada aos {(stats.overdueMilestonesList ?? []).length} com prazo mais
                      antigo; o total no escopo é {stats.overdueMilestones}.
                    </p>
                  ) : null}
                </OverdueExpandablePanel>

                <OverdueExpandablePanel
                  icon={CalendarX}
                  title="tasks atrasadas"
                  count={stats.overdueTasksCount}
                  variant="risk"
                  emptyLabel="Nenhuma task atrasada neste escopo."
                >
                  <ul className="divide-y divide-border/60">
                    {(stats.overdueTasksList ?? []).map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 px-2 py-2.5 first:pt-1 last:pb-1"
                      >
                        <CalendarX className="h-3.5 w-3.5 shrink-0 text-red-500/70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {t.projectTitle ?? "Sem projeto"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {t.dueDate && (
                            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                              {formatCivilDate(t.dueDate, "dd MMM")}
                            </span>
                          )}
                          <Link
                            href={`/tasks/${encodeURIComponent(t.id)}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            aria-label={`Ver detalhes da task ${t.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {stats.overdueTasksCount > (stats.overdueTasksList ?? []).length ? (
                    <p className="px-2 pb-1 text-[10px] text-muted-foreground">
                      Lista limitada às {(stats.overdueTasksList ?? []).length} com prazo mais
                      antigo; o total no escopo é {stats.overdueTasksCount}.
                    </p>
                  ) : null}
                </OverdueExpandablePanel>
              </div>
            )}
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-5">
            {/* Attention needed */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Precisam de atenção
              </h2>
              {projectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : attentionProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center">
                  <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-emerald-500/60" />
                  <p className="text-xs text-muted-foreground">Tudo no rumo!</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border">
                  {attentionProjects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {project.title}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <ProjectHealthRow insight={project.healthInsight} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
                Atualizados recentemente
              </h2>
              {projectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                      <span className="flex-1 truncate text-xs text-foreground">
                        {project.title}
                      </span>
                      <span className="hidden shrink-0 text-[10px] text-muted-foreground/60 sm:block">
                        {formatDistanceToNow(new Date(project.updatedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={cycleSearch}
                onChange={(e) => setCycleSearch(e.target.value)}
                placeholder="Buscar ciclo ou projeto"
                className="h-9 pl-8"
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Filtros de ciclo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={cn(nativeSelectSmClassName, "h-9 text-xs")}
                    value={cycleGovernanceFilter}
                    onChange={(e) =>
                      setCycleGovernanceFilter(e.target.value as typeof cycleGovernanceFilter)
                    }
                  >
                    {CYCLE_GOVERNANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className={cn(nativeSelectSmClassName, "h-9 text-xs")}
                    value={cycleQualityFilter}
                    onChange={(e) =>
                      setCycleQualityFilter(e.target.value as typeof cycleQualityFilter)
                    }
                  >
                    <option value="all">Qualidade</option>
                    <option value="without_objectives">Sem objetivos</option>
                    <option value="without_projects">Sem projetos</option>
                    <option value="without_active_projects">Sem ativos</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Filtros de projeto (dentro dos ciclos)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={cn(nativeSelectSmClassName, "h-9 text-xs")}
                    value={projectStatusFilter}
                    onChange={(e) =>
                      setProjectStatusFilter(e.target.value as typeof projectStatusFilter)
                    }
                  >
                    <option value="all">Qualquer status de projeto</option>
                    <option value="active">Com projeto ativo</option>
                    <option value="blocked">Com projeto bloqueado</option>
                  </select>
                  <select
                    className={cn(nativeSelectSmClassName, "h-9 text-xs")}
                    value={projectHealthFilter}
                    onChange={(e) =>
                      setProjectHealthFilter(e.target.value as typeof projectHealthFilter)
                    }
                  >
                    <option value="all">Qualquer health de projeto</option>
                    <option value="on_track">No rumo</option>
                    <option value="at_risk">Em risco</option>
                    <option value="off_track">Fora do rumo</option>
                  </select>
                </div>
              </div>
            </div>
            {(cycleSearch ||
              cycleGovernanceFilter !== "all" ||
              cycleQualityFilter !== "all" ||
              projectStatusFilter !== "all" ||
              projectHealthFilter !== "all") && (
              <button
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCycleSearch("");
                  setCycleGovernanceFilter("all");
                  setCycleQualityFilter("all");
                  setProjectStatusFilter("all");
                  setProjectHealthFilter("all");
                }}
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
          {cycleIssuesCount > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              {cycleIssuesCount} ciclo(s) com lacuna (sem projetos e/ou sem objetivos).
            </div>
          )}
          {(projectsLoading || cyclesLoading) && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}
          {!projectsLoading &&
            !cyclesLoading &&
            filteredCycles.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                      {c.id !== "__without_cycle__" ? (
                        <CycleGovernanceBadge status={c.status} />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Portfólio avulso
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.startDate && c.endDate
                        ? `${formatCivilDate(c.startDate, "dd MMM yyyy")} → ${formatCivilDate(c.endDate, "dd MMM yyyy")}`
                        : "Sem janela definida"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.projects.length} projeto{c.projects.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {c.projects.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-muted-foreground">
                    Sem projetos neste ciclo.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {c.projects.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        href={`/projects/${encodeURIComponent(p.slug || p.id)}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {p.title}
                        </span>
                        {p.workflowStatusInsight ? (
                          <WorkflowStatusRow insight={p.workflowStatusInsight} />
                        ) : (
                          <span className="text-xs text-muted-foreground">{p.status}</span>
                        )}
                        <ProjectHealthRow insight={p.healthInsight} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          {!projectsLoading && !cyclesLoading && filteredCycles.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum ciclo encontrado com os filtros atuais.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
