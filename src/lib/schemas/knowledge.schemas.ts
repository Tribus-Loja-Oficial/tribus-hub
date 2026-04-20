import { z } from "zod";

export const createPageSchema = z.object({
  title: z.string().min(1).max(500),
  parentPageId: z.string().optional(),
  icon: z.string().max(10).optional(),
  isFolder: z.boolean().optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  contentJson: z.record(z.unknown()).optional(),
  icon: z.string().max(10).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  parentPageId: z.string().optional().nullable(),
  createRevision: z.boolean().optional(),
  changeReason: z.string().max(500).optional(),
});

export const pageIdSchema = z.object({
  id: z.string().min(1),
});

export const reorderKnowledgePagesSchema = z.object({
  parentPageId: z.string().nullable(),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
