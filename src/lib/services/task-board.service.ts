import * as tasksRepo from "@/lib/repositories/tasks.repository";
import type { Task } from "@/lib/db/schema";
import { recordAudit } from "./audit.service";
import { NotFoundError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";

export type BoardTask = Task & { labels: tasksRepo.TaskLabelSummary[] };

export interface BoardData {
  columns: Array<{
    id: string;
    name: string;
    slug: string;
    colorToken: string | null;
    sortOrder: number;
    tasks: BoardTask[];
  }>;
}

export async function getBoardData(user: AuthenticatedUser): Promise<BoardData> {
  const columns = await tasksRepo.findColumnsByWorkspace(user.workspaceId);

  const columnsWithTasks = await Promise.all(
    columns.map(async (col) => ({
      ...col,
      tasks: await tasksRepo.findTasksByColumn(col.id),
    })),
  );

  const allTaskIds = columnsWithTasks.flatMap((c) => c.tasks.map((t) => t.id));
  const labelMap = await tasksRepo.findLabelsForTaskIds(user.workspaceId, allTaskIds);

  return {
    columns: columnsWithTasks.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => ({
        ...t,
        labels: labelMap.get(t.id) ?? [],
      })),
    })),
  };
}

export interface MoveTaskInput {
  taskId: string;
  targetColumnId: string;
  sortOrder: number;
}

export async function moveTask(user: AuthenticatedUser, input: MoveTaskInput): Promise<void> {
  const task = await tasksRepo.findTaskById(input.taskId);
  if (!task || task.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Task", input.taskId);
  }

  const column = await tasksRepo.findColumnById(input.targetColumnId);
  if (!column || column.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Column", input.targetColumnId);
  }

  const previousColumnId = task.columnId;

  const isDoneColumn = column.slug === "done";
  const completedAt = isDoneColumn ? new Date() : null;

  await tasksRepo.updateTask(input.taskId, {
    columnId: input.targetColumnId,
    sortOrder: input.sortOrder,
    completedAt,
    updatedBy: user.id,
  });

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "task",
    entityId: input.taskId,
    action: "task.moved",
    metadata: {
      from: previousColumnId,
      to: input.targetColumnId,
      columnName: column.name,
    },
  });
}

export async function reorderColumnsInBoard(
  user: AuthenticatedUser,
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  // Validate all columns belong to the workspace
  const columns = await tasksRepo.findColumnsByWorkspace(user.workspaceId);
  const columnIds = new Set(columns.map((c) => c.id));

  for (const { id } of updates) {
    if (!columnIds.has(id)) {
      throw new NotFoundError("Column", id);
    }
  }

  await tasksRepo.reorderColumns(updates);
}
