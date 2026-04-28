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
  Eye,
} from "lucide-react";
import { isBefore } from "date-fns";
import { formatCivilDate, parseCivilDateInput, startOfLocalDay } from "@/lib/date/civil-date";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectHealthRow, PriorityBadge, MilestoneHealthRow } from "./project-badges";
import { paceHealthBadgeToneSlug } from "@/lib/pace-health-display";
import { healthRowAccentClass } from "@/components/pace-health-badge";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { projectWorkflowSlug } from "@/features/projects/lib/project-workflow-slug";
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
import {
  TABLE_HEALTH_CHIP_PX,
  TABLE_HEALTH_CHIP_WIDTH_CLASS,
  TABLE_PRIORITY_CHIP_PX,
  TABLE_PRIORITY_CHIP_WIDTH_CLASS,
  TABLE_STATUS_CHIP_PX,
  TABLE_STATUS_CHIP_WIDTH_CLASS,
} from "@/lib/ui/chip-width-tokens";

type MemberRow = { id: string; name: string; email: string };

function projectStatusCell(project: ProjectHierarchyItem) {
  return (
    <WorkflowStatusRow
      insight={project.workflowStatusInsight}
      tableCellLayout
      badgeWidthClass={TABLE_STATUS_CHIP_WIDTH_CLASS}
      tableChipWidthPx={TABLE_STATUS_CHIP_PX}
    />
  );
}

function milestoneStatusCell(milestone: HierarchyMilestone) {
  return (
    <WorkflowStatusRow
      insight={milestone.workflowStatusInsight}
      tableCellLayout
      badgeWidthClass={TABLE_STATUS_CHIP_WIDTH_CLASS}
      tableChipWidthPx={TABLE_STATUS_CHIP_PX}
    />
  );
}

/**
 * 10 colunas: chevron | ícone | título | status | health | prioridade | progresso | ciclo | prazo | ações.
 * Cada célula define o próprio flex; não forçar flex global para evitar desalinhamento entre níveis.
 */
const HIERARCHY_GRID_ROW_CLASS =
  "grid w-full min-w-0 items-stretch gap-x-0 overflow-hidden [&>div]:min-h-0 [&>div]:min-w-0 [&>div]:border-r [&>div]:border-border/60 [&>div]:px-2 [&>div]:py-2 [&>div:last-child]:border-r-0";

function hierarchyGridColumnsStyle(gridTpl: string): CSSProperties {
  return { gridTemplateColumns: gridTpl };
}

/** Larguras default (px); coluna de ações maior para evitar corte de contadores e botões. */
const HIERARCHY_COL_DEFAULTS = [24, 44, 300, 176, 176, 116, 116, 148, 108, 210] as const;
const HIERARCHY_COL_STORAGE_KEY = "hub:project-hierarchy-cols-v8";

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
  const d = parseCivilDateInput(dateStr);
  if (!d) return false;
  return isBefore(startOfLocalDay(d), startOfLocalDay(new Date()));
}

function ProgressBar({
  done,
  total,
  className,
  showFraction = true,
}: {
  done: number;
  total: number;
  className?: string;
  showFraction?: boolean;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary/60")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showFraction && (
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      )}
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  onEditTask,
  hierarchyGridTpl,
}: {
  task: HierarchyTask;
  members: Map<string, MemberRow>;
  onEditTask: (taskId: string) => void;
  hierarchyGridTpl: string;
}) {
  const done = !!task.completedAt;
  const overdue = isOverdue(task.dueDate, task.completedAt);
  const assignee = task.assigneeUserId ? members.get(task.assigneeUserId) : null;

  return (
    <div
      className={cn(
        HIERARCHY_GRID_ROW_CLASS,
        "group rounded-md transition-colors hover:bg-muted/25",
      )}
      style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
    >
      <div className="flex items-center justify-center border-l-2 border-border/40 pl-1">
        <div className="h-6 w-px shrink-0 bg-border/50" aria-hidden />
      </div>
      <div className="flex items-center justify-center gap-0.5">
        {done ? (
          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
        ) : (
          <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" aria-hidden />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="Editar tarefa"
          aria-label="Editar tarefa"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditTask(task.id);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col justify-center gap-0.5 overflow-hidden">
        <Link
          href={`/tasks/${encodeURIComponent(task.id)}`}
          className={cn(
            "line-clamp-2 min-w-0 break-words text-sm leading-snug transition-colors hover:text-primary",
            done ? "text-muted-foreground/70 line-through" : "text-foreground",
          )}
        >
          {task.title}
        </Link>
        {task.externalRef ? (
          <span className="font-mono text-[10px] leading-tight text-muted-foreground">
            Ref: {task.externalRef}
          </span>
        ) : null}
      </div>
      <div
        className="flex min-w-0 items-center justify-start overflow-hidden"
        title="Coluna do board"
      >
        <span className="line-clamp-2 min-w-0 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-left text-[10px] leading-tight text-muted-foreground">
          {task.columnName || "—"}
        </span>
      </div>
      <div className="flex min-w-0 items-center justify-start overflow-hidden" title="Responsável">
        {assignee ? (
          <span className="flex min-w-0 items-center gap-0.5 text-[10px] text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{assignee.name}</span>
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="flex min-w-0 items-center justify-start overflow-hidden">
        <PriorityBadge
          priority={task.priority}
          className={cn("justify-center", TABLE_PRIORITY_CHIP_WIDTH_CLASS)}
          tableChipWidthPx={TABLE_PRIORITY_CHIP_PX}
        />
      </div>
      <div className="flex min-w-0 items-center justify-start overflow-hidden">
        <span
          className={cn(
            "text-[10px] font-medium tabular-nums",
            done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50",
          )}
        >
          {done ? "Concluída" : "—"}
        </span>
      </div>
      <div className="flex min-w-0 items-center justify-start overflow-hidden">
        <span className="text-[10px] text-muted-foreground/40">—</span>
      </div>
      <div className="flex min-w-0 items-center justify-start overflow-hidden">
        {task.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] tabular-nums",
              overdue ? "font-medium text-red-500" : "text-muted-foreground",
            )}
          >
            {overdue ? <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden /> : null}
            {formatCivilDate(task.dueDate, "dd MMM")}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-0.5">
        <Link
          href={`/tasks/${encodeURIComponent(task.id)}`}
          className="rounded p-1 text-muted-foreground opacity-60 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
          title="Abrir tarefa"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
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
  onCreateTask,
  onEditTask,
  hierarchyGridTpl,
}: {
  milestone: HierarchyMilestone;
  projectId: string;
  projectSlug: string;
  members: Map<string, MemberRow>;
  onCreateTask: (projectId: string, milestoneId: string) => void;
  onEditTask: (taskId: string) => void;
  hierarchyGridTpl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isOverdue(milestone.dueDate, milestone.completedAt);

  const projectForPath = { id: projectId, slug: projectSlug };

  return (
    <div>
      {/* Milestone header — mesma grelha 9 colunas que projeto / cabeçalho */}
      <div
        className="group cursor-pointer rounded-lg px-2 py-0.5 transition-colors hover:bg-muted/20 md:px-0"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          setExpanded((v) => !v);
        }}
      >
        <div
          className={HIERARCHY_GRID_ROW_CLASS}
          style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
        >
          <div
            className="flex min-h-0 min-w-0 items-stretch overflow-hidden"
            style={{ gridColumn: "1 / 4" }}
          >
            <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden py-0.5">
              <div className="ml-0.5 h-5 w-3 shrink-0 self-center border-l-2 border-border/45" />
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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                <Link
                  href={milestonePath(projectForPath, milestone.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary"
                >
                  {milestone.title}
                </Link>
                {milestone.externalRef ? (
                  <span className="font-mono text-[10px] leading-tight text-muted-foreground">
                    Ref: {milestone.externalRef}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateTask(projectId, milestone.id);
                }}
                className="flex shrink-0 items-center gap-0.5 self-center text-[11px] text-primary opacity-0 transition-opacity hover:underline group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" /> task
              </button>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            <div className="w-full min-w-0">{milestoneStatusCell(milestone)}</div>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            <div className="w-full min-w-0">
              <MilestoneHealthRow
                insight={milestone.healthInsight}
                tableCellLayout
                badgeWidthClass={TABLE_HEALTH_CHIP_WIDTH_CLASS}
                tableChipWidthPx={TABLE_HEALTH_CHIP_PX}
              />
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            <PriorityBadge
              priority={milestone.priority}
              className={cn("justify-center", TABLE_PRIORITY_CHIP_WIDTH_CLASS)}
              tableChipWidthPx={TABLE_PRIORITY_CHIP_PX}
            />
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            <ProgressBar
              done={milestone.taskStats.done}
              total={milestone.taskStats.total}
              className="w-full min-w-0"
              showFraction={false}
            />
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            <span className="text-[10px] text-muted-foreground/40">—</span>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden opacity-90 transition-opacity group-hover:opacity-100">
            {milestone.dueDate ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] tabular-nums",
                  overdue ? "font-medium text-red-500" : "text-muted-foreground",
                )}
              >
                {overdue ? <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden /> : null}
                {formatCivilDate(milestone.dueDate, "dd MMM")}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="min-w-0" aria-hidden />
        </div>
      </div>

      {expanded && (
        <div className="mb-1.5 mt-0.5 overflow-hidden rounded-md border border-border/50 bg-muted/10">
          {milestone.tasks.length === 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-xs text-muted-foreground/70">
              <span>Sem tasks neste milestone.</span>
              <button
                type="button"
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
              <div className="divide-y divide-border/40">
                {milestone.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    onEditTask={onEditTask}
                    hierarchyGridTpl={hierarchyGridTpl}
                  />
                ))}
              </div>
              <div className="border-t border-border/50 px-2 py-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask(projectId, milestone.id);
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-primary"
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
  onEditTask,
  onEditProject,
  expandSignal,
  hierarchyGridTpl,
  cycleTitle,
}: {
  project: ProjectHierarchyItem;
  members: Map<string, MemberRow>;
  onMilestoneCreated: () => void;
  onCreateTask: (projectId: string, milestoneId: string) => void;
  onEditTask: (taskId: string) => void;
  onEditProject?: (p: ProjectHierarchyItem) => void;
  expandSignal: boolean;
  hierarchyGridTpl: string;
  cycleTitle: string | null;
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

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-l-[3px] border-border bg-card",
        healthRowAccentClass(project.healthInsight?.slug),
      )}
    >
      {/* Project header */}
      <div
        className="group cursor-pointer px-4 py-3 transition-colors hover:bg-muted/10"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className={HIERARCHY_GRID_ROW_CLASS}
          style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
        >
          <div className="flex items-center justify-center">
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </div>
          <div className="flex items-center justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex min-h-0 w-full min-w-0 flex-col justify-center gap-1 overflow-hidden">
            <div className="flex min-w-0 items-start gap-2 overflow-hidden">
              <div className="min-w-0 flex-1 overflow-hidden">
                <Link
                  href={projectPath(project)}
                  onClick={(e) => e.stopPropagation()}
                  className="line-clamp-2 min-w-0 break-words text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
                >
                  {project.title}
                </Link>
              </div>
              {project.projectStats.overdueMilestones > 0 ? (
                <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-medium text-red-500">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {project.projectStats.overdueMilestones} atrasado
                  {project.projectStats.overdueMilestones > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            {project.externalRef ? (
              <span className="block min-w-0 break-all font-mono text-[10px] leading-tight text-muted-foreground">
                Ref: {project.externalRef}
              </span>
            ) : null}
            {project.summary ? (
              <p className="line-clamp-2 min-h-0 min-w-0 break-words text-xs leading-snug text-muted-foreground">
                {project.summary}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            <div className="w-full min-w-0">{projectStatusCell(project)}</div>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            <div className="w-full min-w-0">
              <ProjectHealthRow
                insight={project.healthInsight}
                tableCellLayout
                badgeWidthClass={TABLE_HEALTH_CHIP_WIDTH_CLASS}
                tableChipWidthPx={TABLE_HEALTH_CHIP_PX}
              />
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            <PriorityBadge
              priority={project.priority}
              className={cn("justify-center", TABLE_PRIORITY_CHIP_WIDTH_CLASS)}
              tableChipWidthPx={TABLE_PRIORITY_CHIP_PX}
            />
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            <ProgressBar
              done={project.projectStats.doneTasks}
              total={project.projectStats.totalTasks}
              className="w-full min-w-0"
              showFraction={false}
            />
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            {cycleTitle ? (
              <span className="truncate text-[11px] text-muted-foreground">{cycleTitle}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-start overflow-hidden">
            {project.targetDate ? (
              <span
                className={cn(
                  "inline-flex min-w-0 items-center gap-0.5 text-[11px] tabular-nums",
                  projectOverdue ? "font-medium text-red-500" : "text-muted-foreground",
                )}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatCivilDate(project.targetDate, "dd MMM yy")}</span>
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            {owner && (
              <span className="mr-0.5 flex min-w-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{owner.name.split(" ")[0]}</span>
              </span>
            )}
            <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
              {project.projectStats.totalMilestones}m · {project.projectStats.totalTasks}t
            </span>
            <EntityQuickViewEyeButton
              entity={{ kind: "project", id: project.slug || project.id }}
              className="h-6 w-6 shrink-0"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCreateMilestoneOpen(true);
              }}
              className="shrink-0 rounded p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
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
                className="shrink-0 rounded p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
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
        <div className="space-y-0.5 border-t border-border/60 bg-muted/5 px-4 py-2">
          {project.milestones.length === 0 ? (
            <div className="flex items-center justify-between px-1 py-3 text-sm text-muted-foreground/60">
              <span>Nenhum milestone neste projeto.</span>
              <button
                type="button"
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
              <div
                className={cn(
                  HIERARCHY_GRID_ROW_CLASS,
                  "select-none border-b border-border/50 bg-muted/25 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground [&>div]:py-1.5",
                )}
                style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
              >
                <div
                  className="flex items-center border-l border-transparent pl-1"
                  style={{ gridColumn: "1 / 4" }}
                >
                  Milestones
                </div>
                <div className="flex items-center justify-start">Status</div>
                <div className="flex items-center justify-start">Health</div>
                <div className="flex items-center justify-start">Prioridade</div>
                <div className="flex items-center justify-start">Progresso</div>
                <div className="flex items-center justify-start">Ciclo</div>
                <div className="flex items-center justify-start">Prazo</div>
                <div className="min-w-0" aria-hidden />
              </div>
              {project.milestones.map((milestone) => (
                <MilestoneRow
                  key={milestone.id}
                  milestone={milestone}
                  projectId={project.id}
                  projectSlug={project.slug || project.id}
                  members={members}
                  onCreateTask={onCreateTask}
                  onEditTask={onEditTask}
                  hierarchyGridTpl={hierarchyGridTpl}
                />
              ))}
              <div className="flex items-center gap-2 px-1 py-1.5">
                <button
                  type="button"
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
  filterCycle: string;
  allExpanded: boolean;
  onEditProject?: (p: ProjectHierarchyItem) => void;
}

export function ProjectHierarchyView({
  searchQuery,
  filterStatus,
  filterPriority,
  filterHealth,
  filterCycle,
  allExpanded,
  onEditProject,
}: ProjectHierarchyViewProps) {
  const queryClient = useQueryClient();
  const { widths, startResize } = useResizableGridColumns(
    HIERARCHY_COL_STORAGE_KEY,
    [...HIERARCHY_COL_DEFAULTS],
    { mode: "push" },
  );
  const hierarchyGridTpl = widths.map((w) => `${w}px`).join(" ");
  const hierarchyTableMinWidth = useMemo(
    () => Math.max(720, widths.reduce((a, b) => a + b, 0) + 32),
    [widths],
  );

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState("");
  const [createTaskMilestoneId, setCreateTaskMilestoneId] = useState("");
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

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

  const { data: cyclesRes } = useQuery<{ data: Array<{ id: string; title: string }> }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    staleTime: 60_000,
  });
  const cycleTitleById = useMemo(
    () => new Map((cyclesRes?.data ?? []).map((c) => [c.id, c.title] as const)),
    [cyclesRes],
  );

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((p) => {
      if (searchQuery && !projectMatchesSearch(p, searchQuery)) return false;
      if (filterStatus && projectWorkflowSlug(p) !== filterStatus) return false;
      if (filterPriority && p.priority !== filterPriority) return false;
      if (filterCycle && p.cycleId !== filterCycle) return false;
      if (filterHealth) {
        const slug = p.healthInsight?.slug;
        if (!slug) return false;
        if (paceHealthBadgeToneSlug(slug) !== filterHealth) return false;
      }
      return true;
    });
  }, [data, searchQuery, filterStatus, filterPriority, filterHealth, filterCycle]);

  const handleCreateTask = (projectId: string, milestoneId: string) => {
    setCreateTaskProjectId(projectId);
    setCreateTaskMilestoneId(milestoneId);
    setCreateTaskOpen(true);
  };

  const handleEditTask = (taskId: string) => {
    setEditTaskId(taskId);
    setEditTaskOpen(true);
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
        <div className="min-w-0 space-y-2" style={{ minWidth: hierarchyTableMinWidth }}>
          {/* Legend — mesmo grid e padding horizontal que cada cartão de projeto (md+). */}
          <div className="select-none border-b border-border bg-muted/30 px-4 py-2.5">
            <span className="mb-1.5 block truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground md:hidden">
              Projeto / Milestone / Task
            </span>
            <div
              className={HIERARCHY_GRID_ROW_CLASS}
              style={hierarchyGridColumnsStyle(hierarchyGridTpl)}
            >
              <HierarchyHeaderCell resizeIndex={0} startResize={startResize} />
              <HierarchyHeaderCell resizeIndex={1} startResize={startResize} />
              <HierarchyHeaderCell
                resizeIndex={2}
                startResize={startResize}
                className="justify-start"
              >
                <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Projeto / Milestone / Task
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={3}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={4}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Health
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={5}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prioridade
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={6}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Progresso
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={7}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ciclo
                </span>
              </HierarchyHeaderCell>
              <HierarchyHeaderCell
                resizeIndex={8}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prazo
                </span>
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
              onEditTask={handleEditTask}
              onEditProject={onEditProject}
              expandSignal={allExpanded}
              hierarchyGridTpl={hierarchyGridTpl}
              cycleTitle={project.cycleId ? (cycleTitleById.get(project.cycleId) ?? null) : null}
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
      <TaskFormDialog
        open={editTaskOpen}
        onOpenChange={(v) => {
          setEditTaskOpen(v);
          if (!v) {
            setEditTaskId(null);
            queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
            queryClient.invalidateQueries({ queryKey: ["board"] });
          }
        }}
        mode="edit"
        taskId={editTaskId}
        columns={columns}
      />
    </>
  );
}
