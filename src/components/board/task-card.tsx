"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardTask } from "@/lib/services/task-board.service";
import { cn } from "@/lib/utils/cn";
import { CalendarDays, Eye, GripVertical, Tags, User } from "lucide-react";
import { formatCivilDate } from "@/lib/date/civil-date";
import { Button } from "@/components/ui/button";

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
      <div className="flex items-start gap-1.5">
        <span
          className="pointer-events-none mt-0.5 shrink-0 select-none text-muted-foreground/40"
          aria-hidden
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onOpen?.(task)}
        >
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {task.title}
          </p>
          {task.externalRef && (
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              Ref: {task.externalRef}
            </p>
          )}

          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span>{formatCivilDate(task.dueDate, "dd MMM")}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <User className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 break-words leading-snug">
                <span className="sr-only">Responsável: </span>
                {task.assigneeName?.trim() ? task.assigneeName : "Sem responsável"}
              </span>
            </div>

            {task.labels && task.labels.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Tags className="h-3 w-3 shrink-0" aria-hidden />
                  Etiquetas
                </div>
                <div className="flex flex-wrap gap-1">
                  {task.labels.map((lab) => (
                    <span
                      key={lab.id}
                      className="rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
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
              </div>
            )}
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          title="Editar tarefa"
          aria-label="Editar tarefa"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen?.(task);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
