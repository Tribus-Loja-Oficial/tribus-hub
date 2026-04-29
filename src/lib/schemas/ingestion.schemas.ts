import { z } from "zod";

// ─── Per-type data schemas ────────────────────────────────────────────────────

const okrCycleDataSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  external_ref: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  start_date: z.string().date("Formato de data inválido (esperado YYYY-MM-DD)"),
  end_date: z.string().date("Formato de data inválido (esperado YYYY-MM-DD)"),
  status: z.enum(["planned", "active", "closed"]).optional(),
});

const okrObjectiveDataSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(500),
  description: z.string().max(5000).optional(),
  external_ref: z.string().max(100).optional(),
  cycle_id: z.string().optional(),
  cycle_ref: z.string().optional(),
  cycle_external_ref: z.string().max(100).optional(),
  owner_user_id: z.string().optional(),
  owner_user_external_ref: z.string().max(100).optional(),
  status: z.enum(["draft", "on_track", "at_risk", "off_track", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  start_date: z.string().date().optional(),
  target_date: z.string().date().optional(),
});

const okrKeyResultDataSchema = z
  .object({
    title: z.string().min(1, "Título é obrigatório").max(500),
    description: z.string().max(5000).optional(),
    external_ref: z.string().max(100).optional(),
    objective_id: z.string().optional(),
    objective_ref: z.string().optional(),
    objective_external_ref: z.string().max(100).optional(),
    cycle_id: z.string().optional(),
    cycle_ref: z.string().optional(),
    cycle_external_ref: z.string().max(100).optional(),
    owner_user_id: z.string().optional(),
    owner_user_external_ref: z.string().max(100).optional(),
    metric_type: z.enum(["percentage", "number", "currency", "boolean", "custom"]).optional(),
    unit: z.string().max(50).optional(),
    start_value: z.number().optional(),
    current_value: z.number().optional(),
    target_value: z.number({ required_error: "target_value é obrigatório" }),
    status: z.enum(["draft", "on_track", "at_risk", "off_track", "completed"]).optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    start_date: z.string().date().optional(),
    target_date: z.string().date().optional(),
  })
  .refine((d) => d.objective_id || d.objective_ref || d.objective_external_ref, {
    message: "objective_id, objective_ref ou objective_external_ref é obrigatório",
  });

const projectDataSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(500),
  external_ref: z.string().max(100).optional(),
  summary: z.string().max(1000).optional(),
  status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]).optional(),
  health_status: z.enum(["on_track", "at_risk", "blocked", "off_track"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  owner_user_id: z.string().optional(),
  owner_user_external_ref: z.string().max(100).optional(),
  start_date: z.string().date().optional(),
  target_date: z.string().date().optional(),
});

const milestoneDataSchema = z
  .object({
    title: z.string().min(1, "Título é obrigatório").max(500),
    external_ref: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    project_id: z.string().optional(),
    project_ref: z.string().optional(),
    project_external_ref: z.string().max(100).optional(),
    status: z.enum(["pending", "in_progress", "completed", "missed"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    owner_user_id: z.string().optional(),
    owner_user_external_ref: z.string().max(100).optional(),
    due_date: z.string().date().optional(),
  })
  .refine((d) => d.project_id || d.project_ref || d.project_external_ref, {
    message: "project_id, project_ref ou project_external_ref é obrigatório",
  });

const taskDataSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(500),
  external_ref: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  project_id: z.string().optional(),
  project_ref: z.string().optional(),
  project_external_ref: z.string().max(100).optional(),
  milestone_id: z.string().optional(),
  milestone_ref: z.string().optional(),
  milestone_external_ref: z.string().max(100).optional(),
  column_id: z.string().optional(),
  column_name: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee_user_id: z.string().optional(),
  assignee_user_external_ref: z.string().max(100).optional(),
  due_date: z.string().date().optional(),
  label_ids: z.array(z.string()).optional(),
});

// ─── Discriminated union for ingestion objects ────────────────────────────────

export const ingestionObjectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("okr_cycle"),
    client_ref: z.string().optional(),
    data: okrCycleDataSchema,
  }),
  z.object({
    type: z.literal("okr_objective"),
    client_ref: z.string().optional(),
    data: okrObjectiveDataSchema,
  }),
  z.object({
    type: z.literal("okr_key_result"),
    client_ref: z.string().optional(),
    data: okrKeyResultDataSchema,
  }),
  z.object({
    type: z.literal("project"),
    client_ref: z.string().optional(),
    data: projectDataSchema,
  }),
  z.object({
    type: z.literal("milestone"),
    client_ref: z.string().optional(),
    data: milestoneDataSchema,
  }),
  z.object({
    type: z.literal("task"),
    client_ref: z.string().optional(),
    data: taskDataSchema,
  }),
]);

// ─── Ingestion envelope ───────────────────────────────────────────────────────

export const ingestionPayloadSchema = z.object({
  version: z.literal("1.0"),
  mode: z.enum(["create"]),
  objects: z
    .array(ingestionObjectSchema)
    .min(1, "O payload deve conter ao menos um objeto")
    .max(200, "O payload não pode conter mais de 200 objetos"),
});

export type IngestionPayload = z.infer<typeof ingestionPayloadSchema>;
export type IngestionObject = z.infer<typeof ingestionObjectSchema>;
export type IngestionObjectType = IngestionObject["type"];

export const INGESTION_OBJECT_TYPES: IngestionObjectType[] = [
  "okr_cycle",
  "okr_objective",
  "okr_key_result",
  "project",
  "milestone",
  "task",
];

export const INGESTION_TYPE_LABELS: Record<IngestionObjectType, string> = {
  okr_cycle: "Ciclo OKR",
  okr_objective: "Objetivo OKR",
  okr_key_result: "Key Result OKR",
  project: "Projeto",
  milestone: "Milestone",
  task: "Tarefa",
};
