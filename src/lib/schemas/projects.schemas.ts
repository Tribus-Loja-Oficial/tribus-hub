import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().max(1000).optional(),
  status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]).optional(),
  healthStatus: z.enum(["on_track", "at_risk", "blocked", "off_track"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  ownerUserId: z.string().optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  status: z.enum(["pending", "in_progress", "completed", "missed"]).optional(),
  dueDate: z.string().date().optional(),
  ownerUserId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const linkOkrObjectiveSchema = z.object({
  okrObjectiveId: z.string().min(1),
});

export const linkOkrKrSchema = z.object({
  okrKrId: z.string().min(1),
  relationType: z.enum(["contributes_to", "supports", "indirect"]).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type LinkOkrObjectiveInput = z.infer<typeof linkOkrObjectiveSchema>;
export type LinkOkrKrInput = z.infer<typeof linkOkrKrSchema>;
