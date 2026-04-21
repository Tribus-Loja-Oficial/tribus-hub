"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskColumn } from "@/lib/types/domain";
import type { BoardTask } from "@/lib/services/task-board.service";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils/cn";

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: BoardTask[];
  onTaskOpen?: (task: BoardTask) => void;
  onQuickAdd?: (columnId: string) => void;
}

export function KanbanColumn({ column, tasks, onTaskOpen, onQuickAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center gap-2">
          {column.colorToken && (
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: column.colorToken }}
            />
          )}
          <span className="truncate text-sm font-semibold text-foreground">{column.name}</span>
          <span className="shrink-0 rounded-md bg-muted/80 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {onQuickAdd && (
          <button
            type="button"
            onClick={() => onQuickAdd(column.id)}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            + Tarefa
          </button>
        )}
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl border border-transparent p-2 transition-colors",
          isOver ? "border-primary/20 bg-accent/50" : "bg-muted/25",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onTaskOpen} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-8 text-center">
            <p className="text-xs text-muted-foreground">Nada nesta coluna ainda.</p>
            {onQuickAdd && (
              <button
                type="button"
                onClick={() => onQuickAdd(column.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Criar tarefa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
