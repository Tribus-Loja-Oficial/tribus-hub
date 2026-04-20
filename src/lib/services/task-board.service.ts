import type { Task } from "@/lib/db/schema";

/** Label summary attached to board tasks (matches hub-api /v1/tasks/board). */
export type TaskLabelSummary = {
  id: string;
  name: string;
  slug: string;
  colorToken: string | null;
};

export type BoardTask = Task & { labels: TaskLabelSummary[] };

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

export interface MoveTaskInput {
  taskId: string;
  targetColumnId: string;
  sortOrder: number;
}
