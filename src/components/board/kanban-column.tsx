"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskColumn } from "@/lib/db/schema";
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
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {column.colorToken && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: column.colorToken }}
            />
          )}
          <span className="text-sm font-semibold text-foreground truncate">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-muted/80 rounded-md px-2 py-0.5 tabular-nums shrink-0">
            {tasks.length}
          </span>
        </div>
        {onQuickAdd && (
          <button
            type="button"
            onClick={() => onQuickAdd(column.id)}
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            + Tarefa
          </button>
        )}
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 min-h-[200px] rounded-xl p-2 border border-transparent transition-colors",
          isOver ? "bg-accent/50 border-primary/20" : "bg-muted/25",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onTaskOpen} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 px-2 text-center">
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
