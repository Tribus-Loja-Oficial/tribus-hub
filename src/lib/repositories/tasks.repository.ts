// @ts-nocheck
import { db } from "@/lib/db/client";
import { tasks, taskColumns, taskLabels, taskLabelLinks } from "@/lib/db/schema";
import { eq, and, isNull, asc, desc, like, sql, inArray } from "drizzle-orm";
import type {
  NewTask,
  Task,
  NewTaskColumn,
  TaskColumn,
  TaskLabel,
  NewTaskLabel,
  TaskPriority,
} from "@/lib/db/schema";

// --- Columns ---

export async function findColumnsByWorkspace(workspaceId: string): Promise<TaskColumn[]> {
  return db.query.taskColumns.findMany({
    where: eq(taskColumns.workspaceId, workspaceId),
    orderBy: [asc(taskColumns.sortOrder)],
  });
}

export async function findColumnById(id: string): Promise<TaskColumn | undefined> {
  return db.query.taskColumns.findFirst({
    where: eq(taskColumns.id, id),
  });
}

export async function createColumn(data: NewTaskColumn): Promise<TaskColumn> {
  const [col] = await db.insert(taskColumns).values(data).returning();
  if (!col) throw new Error("Failed to create column");
  return col;
}

export async function reorderColumns(
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of updates) {
      await tx
        .update(taskColumns)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(taskColumns.id, id));
    }
  });
}

// --- Tasks ---

export async function findTaskById(id: string): Promise<Task | undefined> {
  return db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), isNull(tasks.deletedAt)),
  });
}

export async function findTasksByWorkspace(
  workspaceId: string,
  options?: {
    projectId?: string;
    columnId?: string;
    milestoneId?: string;
    assigneeUserId?: string;
    priority?: TaskPriority;
    labelId?: string;
  },
): Promise<Task[]> {
  const conditions = [eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)];

  if (options?.projectId) {
    conditions.push(eq(tasks.projectId, options.projectId));
  }
  if (options?.columnId) {
    conditions.push(eq(tasks.columnId, options.columnId));
  }
  if (options?.milestoneId) {
    conditions.push(eq(tasks.milestoneId, options.milestoneId));
  }
  if (options?.assigneeUserId) {
    conditions.push(eq(tasks.assigneeUserId, options.assigneeUserId));
  }
  if (options?.priority) {
    conditions.push(eq(tasks.priority, options.priority));
  }
  if (options?.labelId) {
    const linked = await db
      .select({ taskId: taskLabelLinks.taskId })
      .from(taskLabelLinks)
      .where(eq(taskLabelLinks.labelId, options.labelId));
    const ids = [...new Set(linked.map((l) => l.taskId))];
    if (ids.length === 0) {
      return [];
    }
    conditions.push(inArray(tasks.id, ids));
  }

  return db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [asc(tasks.sortOrder)],
  });
}

export async function findTasksByColumn(columnId: string): Promise<Task[]> {
  return db.query.tasks.findMany({
    where: and(eq(tasks.columnId, columnId), isNull(tasks.deletedAt)),
    orderBy: [asc(tasks.sortOrder)],
  });
}

export async function createTask(data: NewTask): Promise<Task> {
  const [task] = await db.insert(tasks).values(data).returning();
  if (!task) throw new Error("Failed to create task");
  return task;
}

export async function updateTask(id: string, data: Partial<NewTask>): Promise<Task> {
  const [updated] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update task");
  return updated;
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  newSortOrder: number,
): Promise<Task> {
  const [updated] = await db
    .update(tasks)
    .set({ columnId: targetColumnId, sortOrder: newSortOrder, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!updated) throw new Error("Failed to move task");
  return updated;
}

export async function reorderTasksInColumn(
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of updates) {
      await tx.update(tasks).set({ sortOrder, updatedAt: new Date() }).where(eq(tasks.id, id));
    }
  });
}

export async function softDeleteTask(id: string): Promise<void> {
  await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id));
}

export async function searchTasks(workspaceId: string, query: string): Promise<Task[]> {
  return db.query.tasks.findMany({
    where: and(
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt),
      like(tasks.title, `%${query}%`),
    ),
    limit: 20,
  });
}

export async function getMaxSortOrderInColumn(columnId: string): Promise<number> {
  const result = await db
    .select({ max: sql<number>`max(${tasks.sortOrder})` })
    .from(tasks)
    .where(and(eq(tasks.columnId, columnId), isNull(tasks.deletedAt)));
  return result[0]?.max ?? 0;
}

// --- Labels ---

export async function findTaskLabelsByWorkspace(workspaceId: string): Promise<TaskLabel[]> {
  return db.query.taskLabels.findMany({
    where: eq(taskLabels.workspaceId, workspaceId),
    orderBy: [asc(taskLabels.name)],
  });
}

export async function createTaskLabel(data: NewTaskLabel): Promise<TaskLabel> {
  const [row] = await db.insert(taskLabels).values(data).returning();
  if (!row) throw new Error("Failed to create label");
  return row;
}

export type TaskLabelSummary = Pick<TaskLabel, "id" | "name" | "slug" | "colorToken">;

export async function findLabelsForTaskIds(
  workspaceId: string,
  taskIds: string[],
): Promise<Map<string, TaskLabelSummary[]>> {
  const map = new Map<string, TaskLabelSummary[]>();
  if (taskIds.length === 0) return map;

  const rows = await db
    .select({
      taskId: taskLabelLinks.taskId,
      id: taskLabels.id,
      name: taskLabels.name,
      slug: taskLabels.slug,
      colorToken: taskLabels.colorToken,
    })
    .from(taskLabelLinks)
    .innerJoin(taskLabels, eq(taskLabelLinks.labelId, taskLabels.id))
    .where(and(eq(taskLabels.workspaceId, workspaceId), inArray(taskLabelLinks.taskId, taskIds)));

  for (const r of rows) {
    const list = map.get(r.taskId) ?? [];
    list.push({
      id: r.id,
      name: r.name,
      slug: r.slug,
      colorToken: r.colorToken,
    });
    map.set(r.taskId, list);
  }
  return map;
}

export async function replaceTaskLabels(
  taskId: string,
  workspaceId: string,
  labelIds: string[],
): Promise<void> {
  if (labelIds.length > 0) {
    const found = await db.query.taskLabels.findMany({
      where: and(eq(taskLabels.workspaceId, workspaceId), inArray(taskLabels.id, labelIds)),
    });
    if (found.length !== labelIds.length) {
      throw new Error("One or more labels are invalid for this workspace");
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(taskLabelLinks).where(eq(taskLabelLinks.taskId, taskId));
    for (const labelId of labelIds) {
      await tx.insert(taskLabelLinks).values({ taskId, labelId });
    }
  });
}
