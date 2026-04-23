"use client";

import {
  useState,
  useMemo,
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  FolderKanban,
  Flag,
  CheckSquare,
  Square,
  Plus,
  Loader2,
  AlertTriangle,
  Calendar,
  User,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProjectStatusBadge,
  ProjectHealthBadge,
  PriorityBadge,
  MilestoneStatusBadge,
} from "./project-badges";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { EntityQuickViewEyeButton } from "@/components/entity-quick-view-dialog";
import type { TaskColumn } from "@/lib/types/domain";
import type {
  ProjectHierarchyItem,
  HierarchyMilestone,
  HierarchyTask,
} from "@/lib/types/pm-hierarchy";
import { projectMatchesSearch } from "@/features/projects/lib/project-hierarchy-search";
import { useResizableGridColumns, GridColResizeHandle } from "@/hooks/use-resizable-grid-columns";

type MemberRow = { id: string; name: string; email: string };

/** 9 colunas: chevron | pasta | título | status | health | prioridade | prazo | progresso | ações */
const HIERARCHY_GRID_ROW_CLASS = "hidden w-full min-w-0 items-center gap-x-2 md:grid";

function hierarchyGridColumnsStyle(gridTpl: string): CSSProperties {
  return { gridTemplateColumns: gridTpl };
}

const HIERARCHY_COL_DEFAULTS = [20, 36, 280, 90, 64, 72, 72, 96, 120] as const;
const HIERARCHY_COL_STORAGE_KEY = "hub:project-hierarchy-cols";

function HierarchyHeaderCell({
  children,
  className,
  resizeIndex,
  startResize,
}: {
  children?: ReactNode;
  className?: string;
  resizeIndex: number;
  startResize: (leftIndex: number, e: ReactMouseEvent) => void;
}) {
  return (
    <div className={cn("relative flex min-w-0 items-center justify-center", className)}>
      {children}
      <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2">
        <GridColResizeHandle onMouseDown={(e) => startResize(resizeIndex, e)} />
      </div>
    </div>
  );
}

function projectPath(project: { id: string; slug: string }) {
  return `/projects/${encodeURIComponent(project.slug || project.id)}`;
}

function milestonePath(project: { id: string; slug: string }, milestoneId: string) {
  return `${projectPath(project)}/milestones/${encodeURIComponent(milestoneId)}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOverdue(
  dateStr: string | null | undefined,
  completedAt: string | Date | null | undefined,
) {
  if (!dateStr || completedAt) return false;
  return isBefore(startOfDay(new Date(dateStr)), startOfDay(new Date()));
}

function ProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary/60")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, members }: { task: HierarchyTask; members: Map<string, MemberRow> }) {
  const done = !!task.completedAt;
  const overdue = isOverdue(task.dueDate, task.completedAt);
  const assignee = task.assigneeUserId ? members.get(task.assigneeUserId) : null;

  return (
    <div className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/30">
      {/* indent connector */}
      <div className="flex w-5 shrink-0 justify-center">
        <div className="h-full w-px bg-border/40" />
      </div>
      {done ? (
        <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      )}
      <EntityQuickViewEyeButton entity={{ kind: "task", id: task.id }} className="h-6 w-6" />
      <Link
        href={`/tasks/${encodeURIComponent(task.id)}`}
        className={cn(
          "min-w-0 flex-1 truncate text-sm transition-colors hover:text-primary",
          done ? "text-muted-foreground/60 line-through" : "text-foreground",
        )}
      >
        {task.title}
      </Link>
      {task.externalRef && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          Ref: {task.externalRef}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-2 opacity-70 transition-opacity group-hover:opacity-100">
        <div className="flex w-[72px] justify-center">
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="flex w-[80px] justify-center">
          <span className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {task.columnName}
          </span>
        </div>
        <div className="flex w-[80px] justify-center">
          {assignee ? (
            <span className="flex max-w-full items-center gap-0.5 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{assignee.name.split(" ")[0]}</span>
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/25">—</span>
          )}
        </div>
        <div className="flex w-[72px] justify-center">
          {task.dueDate ? (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                overdue ? "font-medium text-red-500" : "text-muted-foreground",
              )}
            >
              {overdue && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}
              {format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/25">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Milestone Row ────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  projectId,
  projectSlug,
  members,
  onTaskCreated,
  onCreateTask,
  hierarchyGridTpl,
  columnWidths,
}: {
  milestone: HierarchyMilestone;
  projectId: string;
  projectSlug: string;
  members: Map<string, MemberRow>;
  onTaskCreated: () => void;
  onCreateTask: (projectId: string, milestoneId: string) => void;
  hierarchyGridTpl: string;
  columnWidths: number[];
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(milestone.dueDate, milestone.completedAt);
  const owner = milestone.ownerUserId ? members.get(milestone.ownerUserId) : null;

  const projectForPath = { id: projectId, slug: projectSlug };

  const w = columnWidths;

  return (
    <div>
      {/* Milestone header */}
      <div
        className="group cursor-pointer rounded-lg px-3 py-2 transition-colors hover:bg-muted/20"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          setExpanded((v) => !v);
        }}
      >
        <div className="flex items-center gap-2.5 md:hidden">
          <div className="ml-1 h-5 w-4 shrink-0 border-l border-border/40" />
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform",
              expanded && "rotate-90",
            )}
          />
          <Flag className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
          <EntityQuickViewEyeButton
            entity={{
              kind: "milestone",
              projectId: projectSlug || projectId,
              milestoneId: milestone.id,
            }}
            className="h-6 w-6 shrink-0"
          />
          <Link
            href={milestonePath(projectForPath, milestone.id)}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {milestone.title}
          </Link>
          {milestone.externalRef && (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              Ref: {milestone.externalRef}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateTask(projectId, milestone.id);
            }}
            className="ml-2 flex shrink-0 items-center gap-0.5 text-[11px] text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
          >
            <Plus className="h-3 w-3" /> task
          </button>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-2 opacity-75 transition-opacity group-hover:opacity-100">
            <div className="flex justify-center" style={{ width: w[3] }}>
              <MilestoneStatusBadge status={milestone.status} />
            </div>
            <div className="flex justify-center" style={{ width: w[5] }}>
              <PriorityBadge priority={milestone.priority} />
            </div>
            <div className="flex justify-center" style={{ width: w[6] }}>
              {milestone.dueDate ? (
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    overdue ? "font-medium text-red-500" : "text-muted-foreground",
                  )}
                >
                  {overdue && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}
                  {format(new Date(milestone.dueDate), "dd MMM", { locale: ptBR })}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/25">—</span>
              )}
            </div>
            <div className="flex items-center justify-center" style={{ width: w[7] }}>
              <ProgressBar
                done={milestone.taskStats.done}
                total={milestone.taskStats.total}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div
          className={HIERARCHY_GRID_ROW_CLASS}
          style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
        >
          <div className="min-w-0" style={{ gridColumn: "1 / 4" }}>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="ml-1 h-5 w-4 shrink-0 border-l border-border/40" />
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform",
                  expanded && "rotate-90",
                )}
              />
              <Flag className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
              <EntityQuickViewEyeButton
                entity={{
                  kind: "milestone",
                  projectId: projectSlug || projectId,
                  milestoneId: milestone.id,
                }}
                className="h-6 w-6 shrink-0"
              />
              <Link
                href={milestonePath(projectForPath, milestone.id)}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {milestone.title}
              </Link>
              {milestone.externalRef && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  Ref: {milestone.externalRef}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateTask(projectId, milestone.id);
                }}
                className="ml-1 flex shrink-0 items-center gap-0.5 text-[11px] text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" /> task
              </button>
            </div>
          </div>
          <div className="flex min-w-0 justify-center opacity-75 transition-opacity group-hover:opacity-100">
            <MilestoneStatusBadge status={milestone.status} />
          </div>
          <div className="min-w-0" aria-hidden />
          <div className="flex min-w-0 justify-center opacity-75 transition-opacity group-hover:opacity-100">
            <PriorityBadge priority={milestone.priority} />
          </div>
          <div className="flex min-w-0 justify-center opacity-75 transition-opacity group-hover:opacity-100">
            {milestone.dueDate ? (
              <span
                className={cn(
                  "text-[10px] tabular-nums",
                  overdue ? "font-medium text-red-500" : "text-muted-foreground",
                )}
              >
                {overdue && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}
                {format(new Date(milestone.dueDate), "dd MMM", { locale: ptBR })}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/25">—</span>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-center opacity-75 transition-opacity group-hover:opacity-100">
            <ProgressBar
              done={milestone.taskStats.done}
              total={milestone.taskStats.total}
              className="w-full min-w-0"
            />
          </div>
          <div className="min-w-0" aria-hidden />
        </div>
      </div>

      {/* Tasks — visually grouped under the milestone */}
      {expanded && (
        <div className="mb-2 ml-9 mr-1 overflow-hidden rounded-r-lg border-l-2 border-blue-300/50 bg-blue-50/20 dark:bg-blue-950/10">
          {milestone.tasks.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground/50">
              <span>Sem tasks neste milestone.</span>
              <button
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateTask(projectId, milestone.id);
                }}
              >
                Criar task
              </button>
            </div>
          ) : (
            <>
              {/* Task column sub-header */}
              <div className="flex select-none items-center gap-2 px-3 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/30">
                <div className="w-5 shrink-0" />
                <div className="w-3.5 shrink-0" />
                <span className="flex-1">Tasks</span>
                <div className="w-[72px] text-center">Prioridade</div>
                <div className="w-[80px] text-center">Coluna</div>
                <div className="w-[80px] text-center">Responsável</div>
                <div className="w-[72px] text-center">Prazo</div>
              </div>
              <div className="space-y-0.5 py-1">
                {milestone.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} members={members} />
                ))}
              </div>
              {/* Footer: always-visible add task */}
              <div className="border-t border-blue-200/30 px-4 py-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(projectId, milestone.id);
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> Adicionar task
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  members,
  onMilestoneCreated,
  onCreateTask,
  onEditProject,
  expandSignal,
  hierarchyGridTpl,
  columnWidths,
}: {
  project: ProjectHierarchyItem;
  members: Map<string, MemberRow>;
  onMilestoneCreated: () => void;
  onCreateTask: (projectId: string, milestoneId: string) => void;
  onEditProject?: (p: ProjectHierarchyItem) => void;
  expandSignal: boolean;
  hierarchyGridTpl: string;
  columnWidths: number[];
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(expandSignal);
  }, [expandSignal]);
  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const queryClient = useQueryClient();

  const owner = project.ownerUserId ? members.get(project.ownerUserId) : null;
  const today = new Date().toISOString().split("T")[0]!;
  const projectOverdue =
    project.targetDate && project.targetDate < today && project.status !== "completed";

  const createMilestoneMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${project.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      setCreateMilestoneOpen(false);
      onMilestoneCreated();
    },
  });

  const [msTitle, setMsTitle] = useState("");
  const [msDueDate, setMsDueDate] = useState("");

  const cw = columnWidths;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Project header */}
      <div
        className="group cursor-pointer px-4 py-3 transition-colors hover:bg-muted/10"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 md:hidden">
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform",
              expanded && "rotate-90",
            )}
          />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={projectPath(project)}
                onClick={(e) => e.stopPropagation()}
                className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                {project.title}
              </Link>
              {project.externalRef && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  Ref: {project.externalRef}
                </span>
              )}
            </div>
            {project.summary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.summary}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
            <EntityQuickViewEyeButton
              entity={{ kind: "project", id: project.slug || project.id }}
              className="h-7 w-7"
            />
            <Link
              href={projectPath(project)}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1 text-muted-foreground opacity-60 transition-all hover:bg-muted hover:opacity-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div
          className={HIERARCHY_GRID_ROW_CLASS}
          style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
        >
          <div className="flex justify-center">
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </div>
          <div className="flex justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link
                href={projectPath(project)}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                {project.title}
              </Link>
              {project.externalRef && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  Ref: {project.externalRef}
                </span>
              )}
              {project.projectStats.overdueMilestones > 0 && (
                <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  {project.projectStats.overdueMilestones} atrasado
                  {project.projectStats.overdueMilestones > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {project.summary && (
              <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                {project.summary}
              </p>
            )}
          </div>
          <div className="flex min-w-0 justify-center">
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex min-w-0 justify-center">
            {project.healthStatus ? (
              <ProjectHealthBadge health={project.healthStatus} />
            ) : (
              <span className="text-[10px] text-muted-foreground/25">—</span>
            )}
          </div>
          <div className="flex min-w-0 justify-center">
            <PriorityBadge priority={project.priority} />
          </div>
          <div className="flex min-w-0 justify-center">
            {project.targetDate ? (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] tabular-nums",
                  projectOverdue ? "font-medium text-red-500" : "text-muted-foreground",
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {format(new Date(project.targetDate), "dd MMM yy", { locale: ptBR })}
                </span>
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/25">—</span>
            )}
          </div>
          <div className="flex min-w-0 items-center">
            <ProgressBar
              done={project.projectStats.doneTasks}
              total={project.projectStats.totalTasks}
              className="w-full min-w-0"
            />
          </div>
          <div className="flex min-w-0 items-center justify-end gap-0.5">
            {owner && (
              <span className="mr-0.5 flex min-w-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{owner.name.split(" ")[0]}</span>
              </span>
            )}
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {project.projectStats.totalMilestones}m · {project.projectStats.totalTasks}t
            </span>
            <EntityQuickViewEyeButton
              entity={{ kind: "project", id: project.slug || project.id }}
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreateMilestoneOpen(true);
              }}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
              title="Novo milestone"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {onEditProject && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProject(project);
                }}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                title="Editar projeto"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <Link
              href={projectPath(project)}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-60 transition-all hover:bg-muted hover:opacity-100"
              title="Abrir projeto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Milestones */}
      {expanded && (
        <div className="space-y-0.5 border-t border-border/60 bg-muted/5 px-2 py-1.5">
          {project.milestones.length === 0 ? (
            <div className="flex items-center justify-between px-3 py-3 text-sm text-muted-foreground/60">
              <span>Nenhum milestone neste projeto.</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateMilestoneOpen(true);
                }}
                className="text-xs text-primary hover:underline"
              >
                + Criar milestone
              </button>
            </div>
          ) : (
            <>
              {/* Milestone column sub-header */}
              <div className="ml-6 flex select-none items-center gap-2 px-3 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/30">
                <span className="min-w-0 flex-1">Milestones</span>
                <div className="shrink-0 text-center" style={{ width: cw[3] }}>
                  Status
                </div>
                <div className="shrink-0" style={{ width: cw[4] }} aria-hidden />
                <div className="shrink-0 text-center" style={{ width: cw[5] }}>
                  Prioridade
                </div>
                <div className="shrink-0 text-center" style={{ width: cw[6] }}>
                  Prazo
                </div>
                <div className="shrink-0 text-center" style={{ width: cw[7] }}>
                  Progresso
                </div>
              </div>
              {project.milestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  projectId={project.id}
                  projectSlug={project.slug || project.id}
                  members={members}
                  onTaskCreated={() =>
                    queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] })
                  }
                  onCreateTask={onCreateTask}
                  hierarchyGridTpl={hierarchyGridTpl}
                  columnWidths={columnWidths}
                />
              ))}
              <div className="ml-6 flex items-center gap-2 px-3 py-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateMilestoneOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/50 transition-colors hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> Novo milestone
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create milestone dialog */}
      <Dialog open={createMilestoneOpen} onOpenChange={setCreateMilestoneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo milestone — {project.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!msTitle.trim()) return;
              createMilestoneMutation.mutate({
                title: msTitle.trim(),
                status: "pending",
                dueDate: msDueDate || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                autoFocus
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                placeholder="Ex: Landing page publicada"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <DateField value={msDueDate} onChange={(e) => setMsDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setCreateMilestoneOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!msTitle.trim() || createMilestoneMutation.isPending}>
                {createMilestoneMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando…
                  </>
                ) : (
                  "Criar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectHierarchyViewProps {
  searchQuery: string;
  filterStatus: string;
  filterPriority: string;
  filterHealth: string;
  allExpanded: boolean;
  onEditProject?: (p: ProjectHierarchyItem) => void;
}

export function ProjectHierarchyView({
  searchQuery,
  filterStatus,
  filterPriority,
  filterHealth,
  allExpanded,
  onEditProject,
}: ProjectHierarchyViewProps) {
  const queryClient = useQueryClient();
  const { widths, startResize } = useResizableGridColumns(HIERARCHY_COL_STORAGE_KEY, [
    ...HIERARCHY_COL_DEFAULTS,
  ]);
  const hierarchyGridTpl = widths.map((w) => `${w}px`).join(" ");

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState("");
  const [createTaskMilestoneId, setCreateTaskMilestoneId] = useState("");

  const { data, isLoading } = useQuery<{ data: ProjectHierarchyItem[] }>({
    queryKey: ["project-hierarchy"],
    queryFn: () => fetch("/api/projects/hierarchy").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: boardRes } = useQuery<{ data: { columns: TaskColumn[] } }>({
    queryKey: ["board"],
    queryFn: () => fetch("/api/tasks/board").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const columns = boardRes?.data?.columns ?? [];

  const membersMap = useMemo(() => {
    const map = new Map<string, MemberRow>();
    for (const m of membersRes?.data ?? []) map.set(m.id, m);
    return map;
  }, [membersRes]);

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((p) => {
      if (searchQuery && !projectMatchesSearch(p, searchQuery)) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterPriority && p.priority !== filterPriority) return false;
      if (filterHealth && p.healthStatus !== filterHealth) return false;
      return true;
    });
  }, [data, searchQuery, filterStatus, filterPriority, filterHealth]);

  const handleCreateTask = (projectId: string, milestoneId: string) => {
    setCreateTaskProjectId(projectId);
    setCreateTaskMilestoneId(milestoneId);
    setCreateTaskOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FolderKanban className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">Nenhum projeto encontrado</p>
        <p className="text-xs text-muted-foreground">Ajuste os filtros ou crie um novo projeto.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="min-w-0 space-y-2">
          {/* Legend */}
          <div className="flex select-none items-center gap-2 px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            <span className="min-w-0 flex-1 truncate md:hidden">Projeto / Milestone / Task</span>
            <div
              className="hidden min-w-0 items-center gap-x-2 md:grid md:flex-1"
              style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
            >
              <HierarchyHeaderCell resizeIndex={0} startResize={startResize} />
              <HierarchyHeaderCell resizeIndex={1} startResize={startResize} />
              <HierarchyHeaderCell
                resizeIndex={2}
                startResize={startResize}
                className="justify-start"
              >
                <span className="min-w-0 truncate">Projeto / Milestone / Task</span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell resizeIndex={3} startResize={startResize}>
                <span>Status</span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell resizeIndex={4} startResize={startResize}>
                <span>Health</span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell resizeIndex={5} startResize={startResize}>
                <span>Prioridade</span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell resizeIndex={6} startResize={startResize}>
                <span>Prazo</span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell resizeIndex={7} startResize={startResize}>
                <span>Progresso</span>
              </HierarchyHeaderCell>
              <div className="min-w-0" aria-hidden />
            </div>
          </div>
          {filtered.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              members={membersMap}
              onMilestoneCreated={() =>
                queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] })
              }
              onCreateTask={handleCreateTask}
              onEditProject={onEditProject}
              expandSignal={allExpanded}
              hierarchyGridTpl={hierarchyGridTpl}
              columnWidths={widths}
            />
          ))}
        </div>
      </div>

      <TaskFormDialog
        open={createTaskOpen}
        onOpenChange={(v) => {
          setCreateTaskOpen(v);
          if (!v) {
            queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
            queryClient.invalidateQueries({ queryKey: ["board"] });
          }
        }}
        mode="create"
        columns={columns}
        initialProjectId={createTaskProjectId}
        initialMilestoneId={createTaskMilestoneId}
      />
    </>
  );
}
