"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CheckSquare2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task, TaskColumn } from "@/lib/types/domain";
import { TaskFormDialog } from "./task-form-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PriorityBadge } from "@/features/projects/components/project-badges";

type TaskWithLabels = Task & { labels?: Array<{ id: string; name: string }> };

type BoardPayload = {
  columns: TaskColumn[];
};

interface TaskDetailViewProps {
  paramsPromise: Promise<{ taskId: string }>;
  /** Full width inside quick-view dialog (no max-w-2xl cap). */
  embedded?: boolean;
}

export function TaskDetailView({ paramsPromise, embedded }: TaskDetailViewProps) {
  const { taskId } = use(paramsPromise);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery<{ data: TaskWithLabels }>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erro ao carregar task");
      return json;
    },
    enabled: !!taskId,
  });

  const { data: boardRes, isLoading: boardLoading } = useQuery<{ data: BoardPayload }>({
    queryKey: ["tasks-board"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/board");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erro ao carregar board");
      return json;
    },
    enabled: !!taskId,
  });

  const columns = boardRes?.data?.columns ?? [];
  const boardReady = !boardLoading && columns.length > 0;
  const task = data?.data;

  const projectHref = useMemo(() => {
    if (!task?.projectId) return null;
    return `/projects/${task.projectId}`;
  }, [task?.projectId]);

  if (isLoading) {
    return (
      <div className={embedded ? "w-full max-w-none space-y-4" : "max-w-2xl space-y-4"}>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Task não encontrada."}
        </p>
        <Link href="/tasks">
          <Button variant="outline" className="mt-4">
            Voltar para tasks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full max-w-none space-y-6" : "max-w-2xl space-y-6"}>
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tasks
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CheckSquare2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{task.title}</h1>
              {task.externalRef && (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Ref: {task.externalRef}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                {task.completedAt ? (
                  <span className="text-xs text-emerald-600">Concluída</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Aberta</span>
                )}
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Prazo: {format(new Date(task.dueDate), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              {task.descriptionText && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {task.descriptionText}
                </p>
              )}
              {projectHref && (
                <Link
                  href={projectHref}
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  Ver projeto
                </Link>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!boardReady}
            className="gap-1.5"
            title={!boardReady ? "Carregando colunas do board…" : undefined}
          >
            {boardLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            Editar
          </Button>
        </div>
      </div>

      {boardReady && (
        <TaskFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          taskId={taskId}
          columns={columns}
        />
      )}
    </div>
  );
}
