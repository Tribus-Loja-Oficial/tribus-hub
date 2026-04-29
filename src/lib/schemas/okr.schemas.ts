import { z } from "zod";

// ─── Cycle ───────────────────────────────────────────────────────────────────

export const createCycleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  status: z.enum(["planned", "active", "closed"]).optional(),
});

export const updateCycleSchema = createCycleSchema.partial();

export type CreateCycleInput = z.infer<typeof createCycleSchema>;
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>;

// ─── Objective ───────────────────────────────────────────────────────────────

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(500),
  descriptionText: z.string().max(5000).optional(),
  cycleId: z.string().optional(),
  ownerUserId: z.string().optional(),
  status: z.enum(["draft", "on_track", "at_risk", "off_track", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateObjectiveSchema = createObjectiveSchema.partial();

export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;
export type UpdateObjectiveInput = z.infer<typeof updateObjectiveSchema>;

// ─── Key Result ──────────────────────────────────────────────────────────────

export const createKeyResultSchema = z.object({
  title: z.string().min(1).max(500),
  descriptionText: z.string().max(5000).optional(),
  objectiveId: z.string().min(1),
  cycleId: z.string().optional(),
  ownerUserId: z.string().optional(),
  metricType: z.enum(["percentage", "number", "currency", "boolean", "custom"]).optional(),
  unit: z.string().max(50).optional(),
  startValue: z.number().optional(),
  currentValue: z.number().optional(),
  targetValue: z.number(),
  status: z.enum(["draft", "on_track", "at_risk", "off_track", "completed"]).optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  startDate: z.string().date().optional(),
  targetDate: z.string().date().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateKeyResultSchema = createKeyResultSchema.omit({ objectiveId: true }).partial();

export type CreateKeyResultInput = z.infer<typeof createKeyResultSchema>;
export type UpdateKeyResultInput = z.infer<typeof updateKeyResultSchema>;

// ─── Key Result Update ───────────────────────────────────────────────────────

export const createKeyResultUpdateSchema = z.object({
  newValue: z.number(),
  comment: z.string().max(2000).optional(),
});

export type CreateKeyResultUpdateInput = z.infer<typeof createKeyResultUpdateSchema>;

// ─── Group ───────────────────────────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  colorToken: z.string().optional(),
  description: z.string().max(1000).optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
