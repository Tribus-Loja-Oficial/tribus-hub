"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addDays, isBefore, isWithinInterval, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import { CheckSquare, Kanban, LayoutList, Plus, Search } from "lucide-react";
import type { TaskColumn } from "@/lib/db/schema";
import type { BoardTask } from "@/lib/services/task-board.service";
import { KanbanBoard } from "@/components/board/kanban-board";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "./task-form-dialog";

interface BoardPayload {
  columns: Array<TaskColumn & { tasks: BoardTask[] }>;
}

type MilestoneRow = { id: string; title: string };

type LabelRow = { id: string; name: string };
type MemberRow = { id: string; name: string; email: string };

function matchesDueFilter(task: BoardTask, dueFilter: string): boolean {
  if (!dueFilter) return true;
  const today = startOfDay(new Date());
  if (dueFilter === "none") return !task.dueDate;
  if (!task.dueDate) return dueFilter === "none";
  const d = startOfDay(new Date(task.dueDate));
  if (dueFilter === "overdue") {
    return isBefore(d, today) && !task.completedAt;
  }
  if (dueFilter === "week") {
    return isWithinInterval(d, { start: today, end: addDays(today, 7) });
  }
  return true;
}

export function TaskBoardPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<"board" | "list">("board");
  const [projectFilter, setProjectFilter] = useState("");
  const [milestoneFilter, setMilestoneFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [dueFilter, setDueFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<string | null>(null);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) {
      setProjectFilter(pid);
      setMilestoneFilter("");
    }
    const due = searchParams.get("dueFilter");
    if (due) setDueFilter(due);
  }, [searchParams]);

  const { data, isLoading, error } = useQuery<{ data: BoardPayload }>({
    queryKey: ["board"],
    queryFn: () => fetch("/api/tasks/board").then((r) => r.json()),
  });

  const { data: projectsRes } = useQuery<{ data: { id: string; title: string }[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const { data: labelsRes } = useQuery<{ data: LabelRow[] }>({
    queryKey: ["task-labels"],
    queryFn: () => fetch("/api/task-labels").then((r) => r.json()),
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
  });

  const { data: milestonesRes } = useQuery<{ data: MilestoneRow[] }>({
    queryKey: ["milestones", projectFilter],
    queryFn: () => fetch(`/api/projects/${projectFilter}/milestones`).then((r) => r.json()),
    enabled: !!projectFilter,
  });

  const filteredBoard = useMemo(() => {
    if (!data?.data) return null;
    return {
      columns: data.data.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => {
          if (projectFilter && t.projectId !== projectFilter) return false;
          if (milestoneFilter && t.milestoneId !== milestoneFilter) return false;
          if (priorityFilter && t.priority !== priorityFilter) return false;
          if (labelFilter && !t.labels?.some((l) => l.id === labelFilter)) return false;
          if (assigneeFilter && t.assigneeUserId !== assigneeFilter) return false;
          if (!matchesDueFilter(t, dueFilter)) return false;
          if (searchQuery) {
            const q = searchQuery.trim().toLowerCase();
            const hay = [t.title, col.name, col.slug, t.priority].filter(Boolean).join("\n").toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        }),
      })),
    };
  }, [
    data,
    projectFilter,
    milestoneFilter,
    priorityFilter,
    labelFilter,
    assigneeFilter,
    dueFilter,
    searchQuery,
  ]);

  const flatRows = useMemo(() => {
    if (!filteredBoard) return [];
    const rows: Array<{ task: BoardTask; columnName: string }> = [];
    for (const col of filteredBoard.columns) {
      for (const task of col.tasks) {
        rows.push({ task, columnName: col.name });
      }
    }
    return rows;
  }, [filteredBoard]);

  const projects = projectsRes?.data ?? [];
  const milestones = milestonesRes?.data ?? [];
  const labels = labelsRes?.data ?? [];
  const members = membersRes?.data ?? [];
  const columns = filteredBoard?.columns ?? [];

  const openCreate = (columnId?: string | null) => {
    setFormMode("create");
    setEditingTaskId(null);
    setDefaultColumnId(columnId ?? columns[0]?.id ?? null);
    setFormOpen(true);
  };

  const openEdit = (task: BoardTask) => {
    setFormMode("edit");
    setEditingTaskId(task.id);
    setDefaultColumnId(null);
    setFormOpen(true);
  };

  const hasAdvancedFilters =
    !!priorityFilter || !!labelFilter || !!assigneeFilter || !!dueFilter;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Board, lista, filtros por projeto, milestone, prioridade, etiqueta, responsável e
              vencimento.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>
          <Button size="sm" onClick={() => openCreate(null)}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

<div className="space-y-3 mb-5">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, coluna, prioridade…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Projeto
            </span>
            <select
              className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setMilestoneFilter("");
              }}
            >
              <option value="">Todos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Milestone
            </span>
            <select
              className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              disabled={!projectFilter}
            >
              <option value="">Todas</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Prioridade
            </span>
            <select
              className="h-9 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">Todas</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Etiqueta
            </span>
            <select
              className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Responsável
            </span>
            <select
              className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Vencimento
            </span>
            <select
              className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 text-sm"
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
            >
              <option value="">Qualquer</option>
              <option value="week">Próximos 7 dias</option>
              <option value="overdue">Atrasadas</option>
              <option value="none">Sem data</option>
            </select>
          </div>
        </div>
        {hasAdvancedFilters && (
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("");
              setLabelFilter("");
              setAssigneeFilter("");
              setDueFilter("");
            }}
            className="text-xs text-primary hover:underline w-fit"
          >
            Limpar filtros avançados
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0">
              <div className="h-6 bg-muted rounded w-24 mb-3 animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-destructive text-sm">Erro ao carregar o board.</div>}

      {filteredBoard && view === "board" && (
        <KanbanBoard
          data={filteredBoard}
          onTaskOpen={openEdit}
          onQuickAdd={(columnId) => openCreate(columnId)}
        />
      )}

      {filteredBoard && view === "list" && (
        <div className="rounded-xl border border-border overflow-hidden bg-card/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Projeto</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Milestone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Responsável</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Etiquetas</th>
                <th className="px-4 py-3 font-medium">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {flatRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Nenhuma tarefa com estes filtros.
                  </td>
                </tr>
              )}
              {flatRows.map(({ task, columnName }) => {
                const taskProject = projects.find((p) => p.id === task.projectId);
                const overdue = task.dueDate && !task.completedAt
                  ? isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date()))
                  : false;
                return (
                  <tr
                    key={task.id}
                    className="border-b border-border/60 hover:bg-accent/40 cursor-pointer transition-colors"
                    onClick={() => openEdit(task)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          task.completedAt ? "bg-emerald-500" : overdue ? "bg-red-400" : "bg-muted-foreground/30",
                        )} />
                        <span className={cn(
                          "font-medium truncate",
                          task.completedAt ? "text-muted-foreground line-through" : "text-foreground",
                        )}>
                          {task.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell truncate max-w-[140px]">
                      {taskProject?.title ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      {task.milestoneId ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate max-w-[100px]">Milestone</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                        {columnName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "text-[11px] font-medium rounded px-1.5 py-0.5",
                        task.priority === "urgent" ? "bg-red-50 text-red-700 border border-red-200" :
                        task.priority === "high" ? "bg-orange-50 text-orange-700 border border-orange-200" :
                        task.priority === "medium" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        "bg-muted text-muted-foreground border border-border",
                      )}>
                        {task.priority === "urgent" ? "Urgente" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {task.assigneeUserId
                        ? members.find((m) => m.id === task.assigneeUserId)?.name?.split(" ")[0] ?? "—"
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      {task.labels?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {task.labels.slice(0, 2).map((l) => (
                            <span key={l.id} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{l.name}</span>
                          ))}
                          {task.labels.length > 2 && (
                            <span className="text-[10px] text-muted-foreground/60">+{task.labels.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className={cn(
                      "px-4 py-2.5 text-xs tabular-nums",
                      overdue ? "text-red-500 font-medium" : "text-muted-foreground",
                    )}>
                      {task.dueDate
                        ? format(new Date(task.dueDate), "dd MMM yy", { locale: ptBR })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        taskId={editingTaskId}
        columns={data?.data?.columns ?? []}
        defaultColumnId={defaultColumnId}
        initialProjectId={formMode === "create" ? projectFilter || undefined : undefined}
      />
    </div>
  );
}
