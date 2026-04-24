"use client";

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
  LayoutGrid,
  List,
  TrendingUp,
  Flag,
  Clock,
  GitBranch,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectHealthRow, PriorityBadge, MilestoneStatusBadge } from "./project-badges";
import type { Project, WorkflowStatusInsight } from "@/lib/types/domain";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { cn } from "@/lib/utils/cn";

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

  const stats = statsData?.data;
  const projects = projectsData?.data ?? [];

  const activeProjects = projects
    .filter((p) => p.status === "active")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const attentionProjects = projects.filter((p) => {
    const h = p.healthInsight?.slug ?? p.healthStatus;
    return h === "at_risk" || h === "blocked" || h === "off_track";
  });

  const recentProjects = projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">Projetos</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Visão executiva do portfólio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects/list">
              <GitBranch className="h-3.5 w-3.5" />
              Hierarquia
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/projects/list">
              <List className="h-3.5 w-3.5" />
              Todos os projetos
            </Link>
          </Button>
        </div>
      </div>

      <PageGuide title="O que é o Project Manager?">
        <p>
          Visão executiva do portfólio de projetos. Acompanhe o status, saúde e progresso de todos
          os projetos em um só lugar.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cartões de saúde mostram projetos em risco, bloqueados e no prazo;",
              "milestones próximas do vencimento são destacadas com alertas;",
              "clique em qualquer card para filtrar a lista de projetos correspondente;",
              "acesse 'Todos os projetos' para ver a hierarquia completa com milestones e tasks.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : stats ? (
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
                      <ProjectHealthRow insight={project.healthInsight} healthStatus={project.healthStatus} />
                      <PriorityBadge priority={project.priority} />
                      {project.targetDate && (
                        <span className="hidden text-[11px] text-muted-foreground md:block">
                          {format(new Date(project.targetDate), "dd MMM", { locale: ptBR })}
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
                Próximos marcos{" "}
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
                      <p className="truncate text-[11px] text-muted-foreground">{m.projectTitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {m.workflowStatusInsight ? (
                        <WorkflowStatusRow insight={m.workflowStatusInsight} />
                      ) : (
                        <MilestoneStatusBadge status={m.status} />
                      )}
                      {m.dueDate && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {format(new Date(m.dueDate), "dd MMM", { locale: ptBR })}
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
                      <ProjectHealthRow insight={project.healthInsight} healthStatus={project.healthStatus} />
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
                        {stats.overdueMilestones} marco{stats.overdueMilestones !== 1 ? "s" : ""}{" "}
                        atrasado{stats.overdueMilestones !== 1 ? "s" : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-orange-600/80">Clique para ver projetos</p>
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
                    <span className="flex-1 truncate text-xs text-foreground">{project.title}</span>
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
    </div>
  );
}
