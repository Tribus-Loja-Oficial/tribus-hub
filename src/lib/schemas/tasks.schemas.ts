import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  columnId: z.string().min(1),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeUserId: z.string().optional(),
  dueDate: z.string().date().optional(),
  descriptionText: z.string().optional(),
  descriptionJson: z.record(z.unknown()).optional(),
  labelIds: z.array(z.string()).optional(),
  estimatedHours: z.number().nonnegative().optional(),
  estimatedPoints: z.number().nonnegative().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  columnId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeUserId: z.string().optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
  descriptionText: z.string().optional().nullable(),
  descriptionJson: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  labelIds: z.array(z.string()).optional(),
  estimatedHours: z.number().nonnegative().optional().nullable(),
  estimatedPoints: z.number().nonnegative().optional().nullable(),
});

export const createTaskLabelSchema = z.object({
  name: z.string().min(1).max(80),
  colorToken: z.string().max(32).optional(),
});

export const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  targetColumnId: z.string().min(1),
  sortOrder: z.number().int().min(0),
});

export const reorderColumnsSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
