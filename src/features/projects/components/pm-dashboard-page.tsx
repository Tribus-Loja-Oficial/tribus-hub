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
  Plus,
  ChevronRight,
  List,
  TrendingUp,
  Flag,
  Clock,
  Activity,
  Layers3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCivilDate } from "@/lib/date/civil-date";
import { ProjectHealthRow, PriorityBadge } from "./project-badges";
import type { Project, WorkflowStatusInsight } from "@/lib/types/domain";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { cn } from "@/lib/utils/cn";
import { cyclePhaseLabel, getCyclePhase, type CyclePhase } from "@/lib/cycles/cycle-phase";

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

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  atRisk: number;
  blocked: number;
  overdueMilestones: number;
  completedProjects: number;
  upcomingMilestones: UpcomingMilestone[];
  overdueTasksCount: number;
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

const CYCLE_PHASE_OPTIONS: Array<{ value: "all" | CyclePhase; label: string }> = [
  { value: "all", label: "Todas as fases" },
  { value: "upcoming", label: "Por vir" },
  { value: "running", label: "Em andamento" },
  { value: "ended", label: "Encerrado" },
];

const CYCLE_GOVERNANCE_OPTIONS = [
  { value: "all", label: "Todos administrativos" },
  { value: "planned", label: "Planejado" },
  { value: "active", label: "Ativo" },
  { value: "closed", label: "Fechado" },
  { value: "archived", label: "Arquivado" },
] as const;

function cycleAdminLabel(status: string): string {
  switch (status) {
    case "planned":
      return "Planejado";
    case "active":
      return "Ativo";
    case "closed":
      return "Fechado";
    case "archived":
      return "Arquivado";
    default:
      return status;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  href,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  sub?: string;
  href?: string;
  alert?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card p-4 transition-shadow",
        href && "cursor-pointer hover:shadow-sm",
        alert && value > 0 && "border-red-200 bg-red-50/50",
      )}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            alert && value > 0 ? "text-red-700" : "text-foreground",
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

export function PmDashboardPage() {
  const pathname = usePathname();
  const view: "overview" | "cycles" = pathname.startsWith("/projects/cycles")
    ? "cycles"
    : "overview";
  const [cycleSearch, setCycleSearch] = useState("");
  const [cyclePhaseFilter, setCyclePhaseFilter] = useState<"all" | CyclePhase>("all");
  const [cycleGovernanceFilter, setCycleGovernanceFilter] = useState<
    "all" | "planned" | "active" | "closed" | "archived"
  >("all");
  const [cycleQualityFilter, setCycleQualityFilter] = useState<
    "all" | "without_objectives" | "without_projects" | "without_active_projects"
  >("all");
  const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "active" | "blocked">(
    "all",
  );
  const [projectHealthFilter, setProjectHealthFilter] = useState<
    "all" | "at_risk" | "off_track" | "on_track"
  >("all");
  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ["pm-dashboard-stats"],
    queryFn: () => fetch("/api/pm/dashboard").then((r) => r.json()),
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

  const activeProjects = projects
    .filter((p) => p.status === "active")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const attentionProjects = projects.filter((p) => {
    const slug = p.healthInsight?.slug;
    return slug === "at_risk" || slug === "off_track";
  });

  const recentProjects = projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const cyclesWithProjects = useMemo(() => {
    const cycles = cyclesRes?.data ?? [];
    return [
      ...cycles.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        phase: getCyclePhase(c.startDate, c.endDate),
        startDate: c.startDate,
        endDate: c.endDate,
        objectiveCount: Number(c.summary?.objectiveCount ?? 0),
        projects: c.projects ?? [],
      })),
      {
        id: "__without_cycle__",
        title: "Sem ciclo",
        status: "planned",
        phase: "undated" as const,
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
      if (cyclePhaseFilter !== "all" && c.phase !== cyclePhaseFilter) return false;
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
    cyclePhaseFilter,
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              {view === "cycles" ? "Ciclos de projetos" : "Projetos"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {view === "cycles"
                ? "Organização temporal do portfólio por ciclos"
                : "Visão executiva do portfólio"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <PageGuide title="O que é o Project Manager?">
        <p>
          Visão executiva do portfólio de projetos. Acompanhe o status, saúde e progresso de todos
          os projetos em um só lugar, organizados por ciclos.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cartões de saúde mostram projetos em risco, bloqueados e no prazo;",
              "milestones próximas do vencimento são destacadas com alertas;",
              "clique em qualquer card para filtrar a lista de projetos correspondente;",
              "ciclos possuem duas leituras: status administrativo (planejado, ativo, fechado, arquivado) e fase temporal (por vir, em andamento, encerrado);",
              "a fase temporal é calculada automaticamente pelas datas de início/fim e aplicada nas telas de ciclos do hub.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {/* Stats */}
      {view === "overview" && statsLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : view === "overview" && stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
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
            icon={AlertTriangle}
            label="Em risco"
            value={stats.atRisk}
            color="bg-yellow-50 text-yellow-600"
            alert
            href="/projects/list?health=at_risk"
          />
          <StatCard
            icon={Ban}
            label="Bloqueados"
            value={stats.blocked}
            color="bg-red-50 text-red-600"
            alert
            href="/projects/list?health=blocked"
          />
          <StatCard
            icon={CalendarX}
            label="Tasks atrasadas"
            value={stats.overdueTasksCount}
            color="bg-orange-50 text-orange-600"
            alert
            href="/tasks?dueFilter=overdue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Concluídos"
            value={stats.completedProjects}
            color="bg-slate-100 text-slate-600"
            href="/projects/list?status=completed"
          />
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

            {/* Overdue alerts */}
            {!statsLoading && stats && (
              <div className="space-y-2">
                {stats.overdueMilestones > 0 && (
                  <Link
                    href="/projects/list"
                    className="block rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 transition-colors hover:bg-orange-100/60"
                  >
                    <div className="flex items-center gap-3">
                      <Flag className="h-4 w-4 shrink-0 text-orange-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-orange-700">
                          {stats.overdueMilestones} milestone
                          {stats.overdueMilestones !== 1 ? "s" : ""} atrasado
                          {stats.overdueMilestones !== 1 ? "s" : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-orange-600/80">
                          Clique para ver projetos
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
                {stats.overdueTasksCount > 0 && (
                  <Link
                    href="/tasks"
                    className="block rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarX className="h-4 w-4 shrink-0 text-red-500" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-700">
                          {stats.overdueTasksCount} task{stats.overdueTasksCount !== 1 ? "s" : ""}{" "}
                          atrasada{stats.overdueTasksCount !== 1 ? "s" : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-red-600/80">Clique para ver no board</p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}

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
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value={cyclePhaseFilter}
                    onChange={(e) => setCyclePhaseFilter(e.target.value as typeof cyclePhaseFilter)}
                  >
                    {CYCLE_PHASE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
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
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
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
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
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
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value={projectHealthFilter}
                    onChange={(e) =>
                      setProjectHealthFilter(e.target.value as typeof projectHealthFilter)
                    }
                  >
                    <option value="all">Qualquer saúde de projeto</option>
                    <option value="on_track">No rumo</option>
                    <option value="at_risk">Em risco</option>
                    <option value="off_track">Fora do rumo</option>
                  </select>
                </div>
              </div>
            </div>
            {(cycleSearch ||
              cyclePhaseFilter !== "all" ||
              cycleGovernanceFilter !== "all" ||
              cycleQualityFilter !== "all" ||
              projectStatusFilter !== "all" ||
              projectHealthFilter !== "all") && (
              <button
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCycleSearch("");
                  setCyclePhaseFilter("all");
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
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          c.phase === "running" &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                          c.phase === "upcoming" &&
                            "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200",
                          c.phase === "ended" &&
                            "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
                          c.phase === "undated" &&
                            "border-border bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {cyclePhaseLabel(c.phase)}
                      </span>
                      {c.id !== "__without_cycle__" && (
                        <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {cycleAdminLabel(c.status)}
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
