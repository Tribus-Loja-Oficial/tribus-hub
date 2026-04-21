import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { ValidationError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";
import type {
  IngestionPayload,
  IngestionObject,
  IngestionObjectType,
} from "@/lib/schemas/ingestion.schemas";

// ─── Result types ─────────────────────────────────────────────────────────────

export type ValidationIssue = {
  objectIndex?: number;
  objectType?: IngestionObjectType;
  clientRef?: string;
  field?: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    total: number;
    byType: Record<string, number>;
  };
};

export type IngestionItemResult = {
  index: number;
  type: IngestionObjectType;
  clientRef?: string;
  status: "created" | "failed";
  id?: string;
  error?: string;
};

export type IngestionResult = {
  total: number;
  created: number;
  failed: number;
  items: IngestionItemResult[];
  refMap: Record<string, string>;
};

// ─── Semantic validation ──────────────────────────────────────────────────────

export function validateIngestionPayload(payload: IngestionPayload): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const objects = payload.objects;
  const clientRefs = new Map<string, { index: number; type: IngestionObjectType }>();

  // Pass 1: collect client_refs, check for duplicates
  objects.forEach((obj, i) => {
    if (obj.client_ref) {
      if (clientRefs.has(obj.client_ref)) {
        errors.push({
          objectIndex: i,
          objectType: obj.type,
          clientRef: obj.client_ref,
          message: `client_ref "${obj.client_ref}" duplicado. Cada client_ref deve ser único no payload.`,
        });
      } else {
        clientRefs.set(obj.client_ref, { index: i, type: obj.type });
      }
    }
  });

  // Pass 2: validate semantic references
  objects.forEach((obj, i) => {
    const ctx = { objectIndex: i, objectType: obj.type, clientRef: obj.client_ref };

    if (obj.type === "okr_key_result") {
      const d = obj.data;
      if (d.objective_ref && !d.objective_id) {
        const target = clientRefs.get(d.objective_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.objective_ref",
            message: `objective_ref "${d.objective_ref}" não encontrado no payload. Adicione um objeto okr_objective com esse client_ref ou use objective_id com um ID real.`,
          });
        } else if (target.type !== "okr_objective") {
          errors.push({
            ...ctx,
            field: "data.objective_ref",
            message: `objective_ref "${d.objective_ref}" aponta para um objeto do tipo "${target.type}", mas deve ser "okr_objective".`,
          });
        }
      }

      if (d.cycle_ref && !d.cycle_id) {
        const target = clientRefs.get(d.cycle_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.cycle_ref",
            message: `cycle_ref "${d.cycle_ref}" não encontrado no payload. Adicione um objeto okr_cycle com esse client_ref ou use cycle_id com um ID real.`,
          });
        } else if (target.type !== "okr_cycle") {
          errors.push({
            ...ctx,
            field: "data.cycle_ref",
            message: `cycle_ref "${d.cycle_ref}" aponta para "${target.type}", mas deve ser "okr_cycle".`,
          });
        }
      }
    }

    if (obj.type === "okr_objective") {
      const d = obj.data;
      if (d.cycle_ref && !d.cycle_id) {
        const target = clientRefs.get(d.cycle_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.cycle_ref",
            message: `cycle_ref "${d.cycle_ref}" não encontrado no payload. Adicione um objeto okr_cycle com esse client_ref ou use cycle_id com um ID real.`,
          });
        } else if (target.type !== "okr_cycle") {
          errors.push({
            ...ctx,
            field: "data.cycle_ref",
            message: `cycle_ref "${d.cycle_ref}" aponta para "${target.type}", mas deve ser "okr_cycle".`,
          });
        }
      }
    }

    if (obj.type === "milestone") {
      const d = obj.data;
      if (d.project_ref && !d.project_id) {
        const target = clientRefs.get(d.project_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.project_ref",
            message: `project_ref "${d.project_ref}" não encontrado no payload. Adicione um objeto project com esse client_ref ou use project_id com um ID real.`,
          });
        } else if (target.type !== "project") {
          errors.push({
            ...ctx,
            field: "data.project_ref",
            message: `project_ref "${d.project_ref}" aponta para "${target.type}", mas deve ser "project".`,
          });
        }
      }
    }

    if (obj.type === "task") {
      const d = obj.data;
      if (d.project_ref && !d.project_id) {
        const target = clientRefs.get(d.project_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.project_ref",
            message: `project_ref "${d.project_ref}" não encontrado no payload. Adicione um objeto project com esse client_ref ou use project_id com um ID real.`,
          });
        } else if (target.type !== "project") {
          errors.push({
            ...ctx,
            field: "data.project_ref",
            message: `project_ref "${d.project_ref}" aponta para "${target.type}", mas deve ser "project".`,
          });
        }
      }

      if (d.milestone_ref && !d.milestone_id) {
        const target = clientRefs.get(d.milestone_ref);
        if (!target) {
          errors.push({
            ...ctx,
            field: "data.milestone_ref",
            message: `milestone_ref "${d.milestone_ref}" não encontrado no payload. Adicione um objeto milestone com esse client_ref ou use milestone_id com um ID real.`,
          });
        } else if (target.type !== "milestone") {
          errors.push({
            ...ctx,
            field: "data.milestone_ref",
            message: `milestone_ref "${d.milestone_ref}" aponta para "${target.type}", mas deve ser "milestone".`,
          });
        }
      }
    }
  });

  const byType: Record<string, number> = {};
  for (const obj of objects) {
    byType[obj.type] = (byType[obj.type] ?? 0) + 1;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: { total: objects.length, byType },
  };
}

// ─── Creation order ───────────────────────────────────────────────────────────

const TYPE_ORDER: Record<IngestionObjectType, number> = {
  okr_cycle: 0,
  okr_objective: 1,
  okr_key_result: 2,
  project: 3,
  milestone: 4,
  task: 5,
};

function sortByDependency(objects: IngestionObject[]): IngestionObject[] {
  return [...objects].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
}

// ─── Column resolution for tasks ─────────────────────────────────────────────

type TaskColumn = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean | null;
  sortOrder: number;
};

async function fetchTaskColumns(user: AuthenticatedUser): Promise<TaskColumn[]> {
  try {
    return await hubApiFetch<TaskColumn[]>({
      path: "/v1/task-columns",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
  } catch {
    return [];
  }
}

function resolveColumnId(
  taskData: { column_id?: string; column_name?: string },
  columns: TaskColumn[],
): string | null {
  if (taskData.column_id) return taskData.column_id;
  if (taskData.column_name) {
    const name = taskData.column_name.toLowerCase();
    const match = columns.find(
      (c) => c.name.toLowerCase() === name || c.slug.toLowerCase() === name,
    );
    if (match) return match.id;
  }
  const defaultCol =
    columns.find((c) => c.isDefault) ?? columns.sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return defaultCol?.id ?? null;
}

// ─── Execution engine ─────────────────────────────────────────────────────────

export async function executeIngestion(
  user: AuthenticatedUser,
  payload: IngestionPayload,
): Promise<IngestionResult> {
  const validation = validateIngestionPayload(payload);
  if (!validation.valid) {
    throw new ValidationError("Payload de ingestão inválido", validation.errors);
  }

  const sortedObjects = sortByDependency(payload.objects);
  const hasTasks = sortedObjects.some((o) => o.type === "task");
  const taskColumns: TaskColumn[] = hasTasks ? await fetchTaskColumns(user) : [];

  const refMap: Record<string, string> = {};
  const items: IngestionItemResult[] = [];
  let created = 0;
  let failed = 0;

  const originalIndexMap = new Map<IngestionObject, number>(
    payload.objects.map((obj, i) => [obj, i]),
  );

  for (const obj of sortedObjects) {
    const originalIndex = originalIndexMap.get(obj) ?? -1;
    const itemBase: Omit<IngestionItemResult, "status" | "id" | "error"> = {
      index: originalIndex,
      type: obj.type,
      clientRef: obj.client_ref,
    };

    try {
      const id = await createIngestionObject(obj, user, refMap, taskColumns);

      if (obj.client_ref) {
        refMap[obj.client_ref] = id;
      }

      items.push({ ...itemBase, status: "created", id });
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      items.push({ ...itemBase, status: "failed", error: message });
      failed++;
    }
  }

  items.sort((a, b) => a.index - b.index);

  return { total: payload.objects.length, created, failed, items, refMap };
}

// ─── Per-type creation ────────────────────────────────────────────────────────

async function createIngestionObject(
  obj: IngestionObject,
  user: AuthenticatedUser,
  refMap: Record<string, string>,
  taskColumns: TaskColumn[],
): Promise<string> {
  switch (obj.type) {
    case "okr_cycle":
      return createCycle(user, obj.data);

    case "okr_objective":
      return createObjective(user, obj.data, refMap);

    case "okr_key_result":
      return createKeyResult(user, obj.data, refMap);

    case "project":
      return createProject(user, obj.data);

    case "milestone":
      return createMilestone(user, obj.data, refMap);

    case "task":
      return createTask(user, obj.data, refMap, taskColumns);
  }
}

async function createCycle(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "okr_cycle" }>["data"],
): Promise<string> {
  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: "/v1/okr/cycles",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      description: data.description ?? null,
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status ?? "planned",
    },
  });
  return result.id;
}

async function createObjective(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "okr_objective" }>["data"],
  refMap: Record<string, string>,
): Promise<string> {
  const cycleId = data.cycle_ref ? (refMap[data.cycle_ref] ?? data.cycle_id) : data.cycle_id;
  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: "/v1/okr/objectives",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      descriptionText: data.description ?? null,
      cycleId: cycleId ?? null,
      ownerUserId: data.owner_user_id ?? null,
      status: data.status ?? "draft",
      priority: data.priority ?? null,
      startDate: data.start_date ?? null,
      targetDate: data.target_date ?? null,
    },
  });
  return result.id;
}

async function createKeyResult(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "okr_key_result" }>["data"],
  refMap: Record<string, string>,
): Promise<string> {
  const objectiveId = data.objective_ref
    ? (refMap[data.objective_ref] ?? data.objective_id)
    : data.objective_id;

  if (!objectiveId) throw new Error("objective_id não pôde ser resolvido");

  const cycleId = data.cycle_ref ? (refMap[data.cycle_ref] ?? data.cycle_id) : data.cycle_id;

  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: "/v1/okr/key-results",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      descriptionText: data.description ?? null,
      objectiveId,
      cycleId: cycleId ?? null,
      ownerUserId: data.owner_user_id ?? null,
      metricType: data.metric_type ?? "number",
      unit: data.unit ?? null,
      startValue: data.start_value ?? 0,
      currentValue: data.current_value ?? data.start_value ?? 0,
      targetValue: data.target_value,
      status: data.status ?? "draft",
      confidence: data.confidence ?? null,
      startDate: data.start_date ?? null,
      targetDate: data.target_date ?? null,
    },
  });
  return result.id;
}

async function createProject(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "project" }>["data"],
): Promise<string> {
  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: "/v1/projects",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      summary: data.summary ?? null,
      status: data.status ?? "planned",
      healthStatus: data.health_status ?? null,
      priority: data.priority ?? null,
      ownerUserId: data.owner_user_id ?? null,
      startDate: data.start_date ?? null,
      targetDate: data.target_date ?? null,
    },
  });
  return result.id;
}

async function createMilestone(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "milestone" }>["data"],
  refMap: Record<string, string>,
): Promise<string> {
  const projectId = data.project_ref
    ? (refMap[data.project_ref] ?? data.project_id)
    : data.project_id;

  if (!projectId) throw new Error("project_id não pôde ser resolvido");

  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: `/v1/projects/${projectId}/milestones`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "pending",
      priority: data.priority ?? null,
      dueDate: data.due_date ?? null,
      ownerUserId: data.owner_user_id ?? null,
      sortOrder: 0,
    },
  });
  return result.id;
}

async function createTask(
  user: AuthenticatedUser,
  data: Extract<IngestionObject, { type: "task" }>["data"],
  refMap: Record<string, string>,
  taskColumns: TaskColumn[],
): Promise<string> {
  const columnId = resolveColumnId(data, taskColumns);
  if (!columnId) throw new Error("Nenhuma coluna disponível para criar a tarefa");

  const projectId = data.project_ref
    ? (refMap[data.project_ref] ?? data.project_id)
    : data.project_id;

  const milestoneId = data.milestone_ref
    ? (refMap[data.milestone_ref] ?? data.milestone_id)
    : data.milestone_id;

  const result = await hubApiFetch<{ id: string }>({
    method: "POST",
    path: "/v1/tasks",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: data.title,
      columnId,
      projectId: projectId ?? null,
      milestoneId: milestoneId ?? null,
      priority: data.priority ?? null,
      assigneeUserId: data.assignee_user_id ?? null,
      dueDate: data.due_date ?? null,
      descriptionText: data.description ?? null,
      labelIds: data.label_ids ?? [],
    },
  });
  return result.id;
}
