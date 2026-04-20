"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardTask } from "@/lib/services/task-board.service";
import { cn } from "@/lib/utils/cn";
import { CalendarDays, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600",
};

interface TaskCardProps {
  task: BoardTask;
  isDragging?: boolean;
  onOpen?: (task: BoardTask) => void;
}

export function TaskCard({ task, isDragging, onOpen }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-grab touch-none rounded-md border border-border bg-card p-2.5 shadow-sm transition-all hover:border-border/80 hover:shadow-md active:cursor-grabbing",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
        <button
          type="button"
          className="min-w-0 flex-1 cursor-grab rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          onClick={() => onOpen?.(task)}
        >
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {task.title}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {task.priority && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs font-medium",
                  priorityColors[task.priority] ?? "",
                )}
              >
                {task.priority}
              </span>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{format(new Date(task.dueDate), "dd MMM", { locale: ptBR })}</span>
              </div>
            )}
            {task.labels && task.labels.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {task.labels.map((lab) => (
                  <span
                    key={lab.id}
                    className="rounded border border-border/80 bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
                    style={
                      lab.colorToken
                        ? { borderColor: lab.colorToken, color: lab.colorToken }
                        : undefined
                    }
                  >
                    {lab.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
