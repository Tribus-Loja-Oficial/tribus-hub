"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TaskColumn } from "@/lib/db/schema";
import type { BoardTask } from "@/lib/services/task-board.service";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";

interface BoardData {
  columns: Array<TaskColumn & { tasks: BoardTask[] }>;
}

interface KanbanBoardProps {
  data: BoardData;
  onTaskOpen?: (task: BoardTask) => void;
  onQuickAdd?: (columnId: string) => void;
}

export function KanbanBoard({ data, onTaskOpen, onQuickAdd }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [boardData, setBoardData] = useState<BoardData>(data);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBoardData(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const moveMutation = useMutation({
    mutationFn: async (payload: {
      taskId: string;
      targetColumnId: string;
      sortOrder: number;
    }) => {
      const res = await fetch("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to move task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["project-hub"] });
    },
    onError: () => {
      setBoardData(data);
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const findColumn = useCallback(
    (id: string) => {
      return boardData.columns.find(
        (col) => col.id === id || col.tasks.some((t) => t.id === id),
      );
    },
    [boardData.columns],
  );

  function handleDragStart(event: DragStartEvent) {
    const task = boardData.columns
      .flatMap((c) => c.tasks)
      .find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeColumn = boardData.columns.find((c) =>
      c.tasks.some((t) => t.id === active.id),
    );
    const overColumn =
      boardData.columns.find((c) => c.id === over.id) ||
      boardData.columns.find((c) => c.tasks.some((t) => t.id === over.id));

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    setBoardData((prev) => {
      const activeTask = activeColumn.tasks.find((t) => t.id === active.id)!;
      return {
        columns: prev.columns.map((col) => {
          if (col.id === activeColumn.id) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
          }
          if (col.id === overColumn.id) {
            return { ...col, tasks: [...col.tasks, activeTask] };
          }
          return col;
        }),
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const targetColumn =
      boardData.columns.find((c) => c.id === over.id) ||
      boardData.columns.find((c) => c.tasks.some((t) => t.id === over.id));

    if (!targetColumn) return;

    const taskInColumn = targetColumn.tasks.find((t) => t.id === active.id);
    if (!taskInColumn) return;

    const sortOrder = targetColumn.tasks.indexOf(taskInColumn) * 1000;

    moveMutation.mutate({
      taskId: active.id as string,
      targetColumnId: targetColumn.id,
      sortOrder,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <SortableContext
          items={boardData.columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {boardData.columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={col.tasks}
              onTaskOpen={onTaskOpen}
              onQuickAdd={onQuickAdd}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
