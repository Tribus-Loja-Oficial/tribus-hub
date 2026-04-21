import { handleV1ExtraRoutes } from "./v1-extra-routes";
import { handleV1OkrWriteRoutes } from "./v1-okr-write";

type D1StatementResult<T> = {
  results?: T[];
  success: boolean;
  error?: string;
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<D1StatementResult<T>>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

type Env = {
  TRIBUS_HUB_DB: D1DatabaseLike;
  HUB_API_INTERNAL_SECRET: string;
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ProjectRow = {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  summary: string | null;
  description_json: string | null;
  description_text: string | null;
  status: "planned" | "active" | "on_hold" | "completed" | "cancelled";
  health_status: "on_track" | "at_risk" | "blocked" | "off_track" | null;
  priority: "low" | "medium" | "high" | "urgent";
  progress_percent: number;
  owner_user_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type TaskColumnRow = {
  id: string;
  name: string;
  slug: string;
  color_token: string | null;
  sort_order: number;
};

type TaskRow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  milestone_id: string | null;
  column_id: string;
  title: string;
  slug: string;
  description_json: string | null;
  description_text: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  assignee_user_id: string | null;
  reporter_user_id: string | null;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  project_title?: string | null;
  milestone_title?: string | null;
};

type TaskLabelSummaryRow = {
  task_id: string;
  id: string;
  name: string;
  slug: string;
  color_token: string | null;
};

type TaskLabelRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  color_token: string | null;
  created_at: string;
};

type CreateTaskInput = {
  title: string;
  columnId: string;
  projectId?: string;
  milestoneId?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeUserId?: string;
  dueDate?: string;
  descriptionText?: string;
  descriptionJson?: Record<string, unknown>;
  labelIds?: string[];
};

type CreateProjectInput = {
  title: string;
  summary?: string | null;
  status?: "planned" | "active" | "on_hold" | "completed" | "cancelled";
  healthStatus?: "on_track" | "at_risk" | "blocked" | "off_track" | null;
  priority?: "low" | "medium" | "high" | "urgent";
  ownerUserId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
};

type CreateTaskLabelInput = {
  name: string;
  colorToken?: string;
};

type UpdateTaskInput = {
  title?: string;
  columnId?: string;
  projectId?: string | null;
  milestoneId?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeUserId?: string | null;
  dueDate?: string | null;
  descriptionText?: string | null;
  descriptionJson?: Record<string, unknown> | null;
  sortOrder?: number;
  labelIds?: string[];
};

type MoveTaskInput = {
  taskId: string;
  targetColumnId: string;
  sortOrder: number;
};

type PageRow = {
  id: string;
  workspace_id: string;
  parent_page_id: string | null;
  is_folder: number;
  sort_order: number;
  title: string;
  slug: string;
  icon: string | null;
  cover_image_asset_id: string | null;
  excerpt: string | null;
  content_json: string | null;
  content_text: string | null;
  status: "draft" | "published" | "archived";
  is_deleted: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type PageRevisionRow = {
  id: string;
  page_id: string;
  version: number;
  title: string;
  content_json: string | null;
  content_text: string | null;
  created_by: string;
  change_reason: string | null;
  created_at: string;
};

type CreatePageInput = {
  title: string;
  parentPageId?: string;
  icon?: string;
  isFolder?: boolean;
};

type UpdatePageInput = {
  title?: string;
  contentJson?: Record<string, unknown>;
  icon?: string | null;
  status?: "draft" | "published" | "archived";
  parentPageId?: string | null;
  createRevision?: boolean;
  changeReason?: string;
};

type OkrCycleRow = {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: "planned" | "active" | "closed" | "archived";
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type OkrObjectiveRow = {
  id: string;
  workspace_id: string;
  cycle_id: string | null;
  title: string;
  slug: string;
  description_json: string | null;
  description_text: string | null;
  owner_user_id: string | null;
  status: "draft" | "on_track" | "at_risk" | "off_track" | "completed";
  progress_percent: number;
  priority: "low" | "medium" | "high" | "critical";
  sort_order: number;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type OkrKeyResultRow = {
  id: string;
  workspace_id: string;
  cycle_id: string | null;
  objective_id: string;
  title: string;
  slug: string;
  description_json: string | null;
  description_text: string | null;
  owner_user_id: string | null;
  metric_type: "percentage" | "number" | "currency" | "boolean" | "custom";
  unit: string | null;
  start_value: number;
  current_value: number;
  target_value: number;
  progress_percent: number;
  status: "draft" | "on_track" | "at_risk" | "off_track" | "completed";
  confidence: number | null;
  sort_order: number;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type AuthUserRow = {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "owner" | "admin" | "member";
  is_active: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(secret: string, canonical: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical));
  return toHex(signature);
}

async function verifyRequest(request: Request, env: Env, body: string): Promise<boolean> {
  const signature = request.headers.get("x-hub-signature");
  const timestamp = request.headers.get("x-hub-ts");
  const nonce = request.headers.get("x-hub-nonce");
  if (!signature || !timestamp || !nonce) return false;

  const requestDate = new Date(timestamp);
  if (Number.isNaN(requestDate.getTime())) return false;

  const now = Date.now();
  const driftMs = Math.abs(now - requestDate.getTime());
  if (driftMs > 5 * 60 * 1000) return false;

  const pathname = new URL(request.url).pathname;
  const canonical = [request.method.toUpperCase(), pathname, timestamp, nonce, body].join("\n");
  const expected = await sign(env.HUB_API_INTERNAL_SECRET, canonical);
  return expected === signature;
}

async function getWorkspaceMembers(db: D1DatabaseLike, workspaceId: string) {
  const stmt = db
    .prepare(
      `
      SELECT id, name, email, role
      FROM users
      WHERE workspace_id = ?
        AND is_active = 1
      ORDER BY name ASC
    `,
    )
    .bind(workspaceId);

  const result = await stmt.all<MemberRow>();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to query workspace members");
  }
  return result.results ?? [];
}

async function getProjectsByWorkspace(db: D1DatabaseLike, workspaceId: string) {
  const stmt = db
    .prepare(
      `
      SELECT
        id,
        workspace_id,
        title,
        slug,
        summary,
        description_json,
        description_text,
        status,
        health_status,
        priority,
        progress_percent,
        owner_user_id,
        start_date,
        target_date,
        completed_at,
        created_by,
        updated_by,
        created_at,
        updated_at,
        archived_at,
        deleted_at
      FROM projects
      WHERE workspace_id = ?
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
    `,
    )
    .bind(workspaceId);

  const result = await stmt.all<ProjectRow>();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to query projects");
  }
  return (result.results ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    descriptionJson: row.description_json ? JSON.parse(row.description_json) : null,
    descriptionText: row.description_text,
    status: row.status,
    healthStatus: row.health_status,
    priority: row.priority,
    progressPercent: Number(row.progress_percent ?? 0),
    ownerUserId: row.owner_user_id,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
  }));
}

function slugifyProjectTitle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function resolveProjectSlug(db: D1DatabaseLike, workspaceId: string, title: string) {
  const base = slugifyProjectTitle(title) || "project";
  const check = await db
    .prepare(
      `SELECT id FROM projects WHERE workspace_id = ? AND slug = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(workspaceId, base)
    .all<{ id: string }>();
  if (!check.success) throw new Error(check.error ?? "Failed to check slug");
  if (check.results?.length) {
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
    return `${base}-${suffix}`;
  }
  return base;
}

function mapProjectRowToDto(row: ProjectRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    descriptionJson: row.description_json ? JSON.parse(row.description_json) : null,
    descriptionText: row.description_text,
    status: row.status,
    healthStatus: row.health_status,
    priority: row.priority,
    progressPercent: Number(row.progress_percent ?? 0),
    ownerUserId: row.owner_user_id,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
  };
}

async function createProject(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  input: CreateProjectInput,
) {
  const title = input.title?.trim();
  if (!title) throw new Error("title is required");

  const status = input.status ?? "planned";
  if (!["planned", "active", "on_hold", "completed", "cancelled"].includes(status)) {
    throw new Error("status is invalid");
  }
  const priority = input.priority ?? "medium";
  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    throw new Error("priority is invalid");
  }
  if (input.healthStatus != null && input.healthStatus !== undefined) {
    if (!["on_track", "at_risk", "blocked", "off_track"].includes(input.healthStatus)) {
      throw new Error("healthStatus is invalid");
    }
  }

  const slug = await resolveProjectSlug(db, workspaceId, title);
  const id = createId();
  const now = new Date().toISOString();
  const healthStatus = input.healthStatus ?? null;

  const insert = await db
    .prepare(
      `
      INSERT INTO projects (
        id, workspace_id, title, slug, summary, description_json, description_text,
        status, health_status, priority, progress_percent, owner_user_id,
        start_date, target_date, completed_at, created_by, updated_by,
        created_at, updated_at, archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      workspaceId,
      title,
      slug,
      input.summary ?? null,
      null,
      null,
      status,
      healthStatus,
      priority,
      0,
      input.ownerUserId ?? null,
      input.startDate ?? null,
      input.targetDate ?? null,
      null,
      actorUserId,
      actorUserId,
      now,
      now,
      null,
      null,
    )
    .all();

  if (!insert.success) throw new Error(insert.error ?? "Failed to create project");

  const row = await db
    .prepare(
      `
      SELECT
        id, workspace_id, title, slug, summary, description_json, description_text,
        status, health_status, priority, progress_percent, owner_user_id,
        start_date, target_date, completed_at, created_by, updated_by,
        created_at, updated_at, archived_at, deleted_at
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    )
    .bind(id)
    .all<ProjectRow>();
  if (!row.success) throw new Error(row.error ?? "Failed to load project");
  const p = row.results?.[0];
  if (!p) throw new Error("Failed to load created project");

  return mapProjectRowToDto(p);
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseJsonBody<T>(body: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function createId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function createSlug(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "item"}-${suffix}`;
}

const DEFAULT_TASK_COLUMNS: Array<{
  name: string;
  slug: string;
  colorToken: string | null;
  sortOrder: number;
  isDefault: number;
}> = [
  { name: "Backlog", slug: "backlog", colorToken: "#94a3b8", sortOrder: 0, isDefault: 0 },
  { name: "To do", slug: "to-do", colorToken: "#60a5fa", sortOrder: 1000, isDefault: 1 },
  { name: "In progress", slug: "in-progress", colorToken: "#f59e0b", sortOrder: 2000, isDefault: 0 },
  { name: "Blocked", slug: "blocked", colorToken: "#f87171", sortOrder: 3000, isDefault: 0 },
  { name: "Done", slug: "done", colorToken: "#34d399", sortOrder: 4000, isDefault: 0 },
];

async function ensureDefaultTaskColumns(db: D1DatabaseLike, workspaceId: string) {
  const countResult = await db
    .prepare(`SELECT COUNT(*) AS c FROM task_columns WHERE workspace_id = ?`)
    .bind(workspaceId)
    .all<{ c: number }>();
  if (!countResult.success) throw new Error(countResult.error ?? "Failed to count task columns");
  const n = Number(countResult.results?.[0]?.c ?? 0);
  if (n > 0) return;

  const now = new Date().toISOString();
  for (const col of DEFAULT_TASK_COLUMNS) {
    const id = createId();
    const ins = await db
      .prepare(
        `
        INSERT INTO task_columns (
          id, workspace_id, name, slug, color_token, sort_order, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        id,
        workspaceId,
        col.name,
        col.slug,
        col.colorToken,
        col.sortOrder,
        col.isDefault,
        now,
        now,
      )
      .all();
    if (!ins.success) throw new Error(ins.error ?? "Failed to insert default task column");
  }
}

async function getTaskBoardData(db: D1DatabaseLike, workspaceId: string) {
  await ensureDefaultTaskColumns(db, workspaceId);

  const columnsResult = await db
    .prepare(
      `
      SELECT id, name, slug, color_token, sort_order
      FROM task_columns
      WHERE workspace_id = ?
      ORDER BY sort_order ASC
    `,
    )
    .bind(workspaceId)
    .all<TaskColumnRow>();

  if (!columnsResult.success) {
    throw new Error(columnsResult.error ?? "Failed to query task columns");
  }

  const tasksResult = await db
    .prepare(
      `
      SELECT
        t.id,
        t.workspace_id,
        t.project_id,
        t.milestone_id,
        t.column_id,
        t.title,
        t.slug,
        t.description_json,
        t.description_text,
        t.priority,
        t.assignee_user_id,
        t.reporter_user_id,
        t.due_date,
        t.start_date,
        t.completed_at,
        t.sort_order,
        t.created_by,
        t.updated_by,
        t.created_at,
        t.updated_at,
        t.archived_at,
        t.deleted_at,
        p.title AS project_title,
        m.title AS milestone_title
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN milestones m ON m.id = t.milestone_id
      WHERE t.workspace_id = ?
        AND t.deleted_at IS NULL
      ORDER BY t.column_id ASC, t.sort_order ASC
    `,
    )
    .bind(workspaceId)
    .all<TaskRow>();

  if (!tasksResult.success) {
    throw new Error(tasksResult.error ?? "Failed to query tasks");
  }

  const taskIds = (tasksResult.results ?? []).map((t) => t.id);
  const labelsByTask = new Map<
    string,
    Array<{ id: string; name: string; slug: string; colorToken: string | null }>
  >();

  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => "?").join(", ");
    const labelsQuery = `
      SELECT
        tll.task_id,
        tl.id,
        tl.name,
        tl.slug,
        tl.color_token
      FROM task_label_links tll
      INNER JOIN task_labels tl ON tl.id = tll.label_id
      WHERE tl.workspace_id = ?
        AND tll.task_id IN (${placeholders})
    `;

    const labelsResult = await db
      .prepare(labelsQuery)
      .bind(workspaceId, ...taskIds)
      .all<TaskLabelSummaryRow>();

    if (!labelsResult.success) {
      throw new Error(labelsResult.error ?? "Failed to query task labels");
    }

    for (const row of labelsResult.results ?? []) {
      const list = labelsByTask.get(row.task_id) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        colorToken: row.color_token,
      });
      labelsByTask.set(row.task_id, list);
    }
  }

  const tasksByColumn = new Map<string, TaskRow[]>();
  for (const task of tasksResult.results ?? []) {
    const list = tasksByColumn.get(task.column_id) ?? [];
    list.push(task);
    tasksByColumn.set(task.column_id, list);
  }

  return {
    columns: (columnsResult.results ?? []).map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      colorToken: col.color_token,
      sortOrder: Number(col.sort_order ?? 0),
      tasks: (tasksByColumn.get(col.id) ?? []).map((task) => ({
        id: task.id,
        workspaceId: task.workspace_id,
        projectId: task.project_id,
        milestoneId: task.milestone_id,
        columnId: task.column_id,
        title: task.title,
        slug: task.slug,
        projectTitle: task.project_title,
        milestoneTitle: task.milestone_title,
        descriptionJson: safeJsonParse(task.description_json),
        descriptionText: task.description_text,
        priority: task.priority,
        assigneeUserId: task.assignee_user_id,
        reporterUserId: task.reporter_user_id,
        dueDate: task.due_date,
        startDate: task.start_date,
        completedAt: task.completed_at,
        sortOrder: Number(task.sort_order ?? 0),
        createdBy: task.created_by,
        updatedBy: task.updated_by,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        archivedAt: task.archived_at,
        deletedAt: task.deleted_at,
        labels: labelsByTask.get(task.id) ?? [],
      })),
    })),
  };
}

async function getTaskColumnsByWorkspace(db: D1DatabaseLike, workspaceId: string) {
  await ensureDefaultTaskColumns(db, workspaceId);

  const result = await db
    .prepare(
      `
      SELECT id, workspace_id, name, slug, color_token, sort_order, is_default, created_at, updated_at
      FROM task_columns
      WHERE workspace_id = ?
      ORDER BY sort_order ASC
    `,
    )
    .bind(workspaceId)
    .all<{
      id: string;
      workspace_id: string;
      name: string;
      slug: string;
      color_token: string | null;
      sort_order: number;
      is_default: number;
      created_at: string;
      updated_at: string;
    }>();

  if (!result.success) throw new Error(result.error ?? "Failed to query task columns");
  return (result.results ?? []).map((c) => ({
    id: c.id,
    workspaceId: c.workspace_id,
    name: c.name,
    slug: c.slug,
    colorToken: c.color_token,
    sortOrder: Number(c.sort_order ?? 0),
    isDefault: Boolean(c.is_default),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

async function getTaskLabelsByWorkspace(db: D1DatabaseLike, workspaceId: string) {
  const result = await db
    .prepare(
      `
      SELECT id, workspace_id, name, slug, color_token, created_at
      FROM task_labels
      WHERE workspace_id = ?
      ORDER BY name ASC
    `,
    )
    .bind(workspaceId)
    .all<TaskLabelRow>();

  if (!result.success) {
    throw new Error(result.error ?? "Failed to query task labels");
  }

  return (result.results ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    colorToken: row.color_token,
    createdAt: row.created_at,
  }));
}

async function getTasksByWorkspace(
  db: D1DatabaseLike,
  workspaceId: string,
  filters: {
    projectId?: string;
    columnId?: string;
    milestoneId?: string;
    assigneeUserId?: string;
    labelId?: string;
    priority?: "low" | "medium" | "high" | "urgent";
  },
) {
  const where: string[] = ["workspace_id = ?", "deleted_at IS NULL"];
  const args: unknown[] = [workspaceId];

  if (filters.projectId) {
    where.push("project_id = ?");
    args.push(filters.projectId);
  }
  if (filters.columnId) {
    where.push("column_id = ?");
    args.push(filters.columnId);
  }
  if (filters.milestoneId) {
    where.push("milestone_id = ?");
    args.push(filters.milestoneId);
  }
  if (filters.assigneeUserId) {
    where.push("assignee_user_id = ?");
    args.push(filters.assigneeUserId);
  }
  if (filters.priority) {
    where.push("priority = ?");
    args.push(filters.priority);
  }
  if (filters.labelId) {
    where.push("id IN (SELECT task_id FROM task_label_links WHERE label_id = ?)");
    args.push(filters.labelId);
  }

  const query = `
    SELECT
      id,
      workspace_id,
      project_id,
      milestone_id,
      column_id,
      title,
      slug,
      description_json,
      description_text,
      priority,
      assignee_user_id,
      reporter_user_id,
      due_date,
      start_date,
      completed_at,
      sort_order,
      created_by,
      updated_by,
      created_at,
      updated_at,
      archived_at,
      deleted_at
    FROM tasks
    WHERE ${where.join(" AND ")}
    ORDER BY sort_order ASC
  `;

  const result = await db.prepare(query).bind(...args).all<TaskRow>();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to query tasks");
  }

  return (result.results ?? []).map((task) => ({
    id: task.id,
    workspaceId: task.workspace_id,
    projectId: task.project_id,
    milestoneId: task.milestone_id,
    columnId: task.column_id,
    title: task.title,
    slug: task.slug,
    descriptionJson: safeJsonParse(task.description_json),
    descriptionText: task.description_text,
    priority: task.priority,
    assigneeUserId: task.assignee_user_id,
    reporterUserId: task.reporter_user_id,
    dueDate: task.due_date,
    startDate: task.start_date,
    completedAt: task.completed_at,
    sortOrder: Number(task.sort_order ?? 0),
    createdBy: task.created_by,
    updatedBy: task.updated_by,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    archivedAt: task.archived_at,
    deletedAt: task.deleted_at,
  }));
}

async function createTaskLabel(
  db: D1DatabaseLike,
  workspaceId: string,
  input: CreateTaskLabelInput,
) {
  const name = input.name?.trim();
  if (!name) throw new Error("name is required");

  const id = createId();
  const slug = createSlug(name);
  const createdAt = new Date().toISOString();

  const insert = await db
    .prepare(
      `
      INSERT INTO task_labels (id, workspace_id, name, slug, color_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(id, workspaceId, name, slug, input.colorToken ?? null, createdAt)
    .all();

  if (!insert.success) throw new Error(insert.error ?? "Failed to create label");

  return {
    id,
    workspaceId,
    name,
    slug,
    colorToken: input.colorToken ?? null,
    createdAt,
  };
}

async function createTask(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  input: CreateTaskInput,
) {
  await ensureDefaultTaskColumns(db, workspaceId);

  if (!input.title?.trim()) throw new Error("title is required");
  if (!input.columnId?.trim()) throw new Error("columnId is required");
  const priority = input.priority ?? "medium";
  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    throw new Error("priority is invalid");
  }

  const orderResult = await db
    .prepare(
      `
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM tasks
      WHERE column_id = ?
        AND deleted_at IS NULL
    `,
    )
    .bind(input.columnId)
    .all<{ max_sort: number | null }>();
  if (!orderResult.success) throw new Error(orderResult.error ?? "Failed to compute sort order");
  const maxSort = Number(orderResult.results?.[0]?.max_sort ?? 0);

  const id = createId();
  const now = new Date().toISOString();
  const slug = createSlug(input.title);
  const descriptionJson = input.descriptionJson ? JSON.stringify(input.descriptionJson) : null;

  const insert = await db
    .prepare(
      `
      INSERT INTO tasks (
        id, workspace_id, project_id, milestone_id, column_id, title, slug,
        description_json, description_text, priority, assignee_user_id, reporter_user_id,
        due_date, start_date, completed_at, sort_order, created_by, updated_by,
        created_at, updated_at, archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      workspaceId,
      input.projectId ?? null,
      input.milestoneId ?? null,
      input.columnId,
      input.title.trim(),
      slug,
      descriptionJson,
      input.descriptionText ?? null,
      priority,
      input.assigneeUserId ?? null,
      actorUserId,
      input.dueDate ?? null,
      null,
      null,
      maxSort + 1000,
      actorUserId,
      actorUserId,
      now,
      now,
      null,
      null,
    )
    .all();
  if (!insert.success) throw new Error(insert.error ?? "Failed to create task");

  const labelIds = input.labelIds ?? [];
  for (const labelId of labelIds) {
    const linkInsert = await db
      .prepare(`INSERT OR IGNORE INTO task_label_links (task_id, label_id) VALUES (?, ?)`)
      .bind(id, labelId)
      .all();
    if (!linkInsert.success) throw new Error(linkInsert.error ?? "Failed to link task labels");
  }

  return {
    id,
    workspaceId,
    projectId: input.projectId ?? null,
    milestoneId: input.milestoneId ?? null,
    columnId: input.columnId,
    title: input.title.trim(),
    slug,
    descriptionJson: input.descriptionJson ?? null,
    descriptionText: input.descriptionText ?? null,
    priority,
    assigneeUserId: input.assigneeUserId ?? null,
    reporterUserId: actorUserId,
    dueDate: input.dueDate ?? null,
    startDate: null,
    completedAt: null,
    sortOrder: maxSort + 1000,
    createdBy: actorUserId,
    updatedBy: actorUserId,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };
}

async function getTaskById(db: D1DatabaseLike, workspaceId: string, taskId: string) {
  const result = await db
    .prepare(
      `
      SELECT
        id, workspace_id, project_id, milestone_id, column_id, title, slug, description_json,
        description_text, priority, assignee_user_id, reporter_user_id, due_date, start_date,
        completed_at, sort_order, created_by, updated_by, created_at, updated_at, archived_at, deleted_at
      FROM tasks
      WHERE id = ?
        AND workspace_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    )
    .bind(taskId, workspaceId)
    .all<TaskRow>();
  if (!result.success) throw new Error(result.error ?? "Failed to query task");
  const task = result.results?.[0];
  if (!task) return null;

  const labelsResult = await db
    .prepare(
      `
      SELECT tl.id, tl.name, tl.slug, tl.color_token
      FROM task_label_links tll
      INNER JOIN task_labels tl ON tl.id = tll.label_id
      WHERE tll.task_id = ?
        AND tl.workspace_id = ?
      ORDER BY tl.name ASC
    `,
    )
    .bind(taskId, workspaceId)
    .all<{ id: string; name: string; slug: string; color_token: string | null }>();
  if (!labelsResult.success) throw new Error(labelsResult.error ?? "Failed to query task labels");

  return {
    id: task.id,
    workspaceId: task.workspace_id,
    projectId: task.project_id,
    milestoneId: task.milestone_id,
    columnId: task.column_id,
    title: task.title,
    slug: task.slug,
    descriptionJson: safeJsonParse(task.description_json),
    descriptionText: task.description_text,
    priority: task.priority,
    assigneeUserId: task.assignee_user_id,
    reporterUserId: task.reporter_user_id,
    dueDate: task.due_date,
    startDate: task.start_date,
    completedAt: task.completed_at,
    sortOrder: Number(task.sort_order ?? 0),
    createdBy: task.created_by,
    updatedBy: task.updated_by,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    archivedAt: task.archived_at,
    deletedAt: task.deleted_at,
    labels: (labelsResult.results ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      colorToken: l.color_token,
    })),
  };
}

async function replaceTaskLabels(
  db: D1DatabaseLike,
  workspaceId: string,
  taskId: string,
  labelIds: string[],
) {
  if (labelIds.length > 0) {
    const placeholders = labelIds.map(() => "?").join(", ");
    const validate = await db
      .prepare(
        `
        SELECT id
        FROM task_labels
        WHERE workspace_id = ?
          AND id IN (${placeholders})
      `,
      )
      .bind(workspaceId, ...labelIds)
      .all<{ id: string }>();
    if (!validate.success) throw new Error(validate.error ?? "Failed to validate labels");
    if ((validate.results ?? []).length !== labelIds.length) {
      throw new Error("One or more labels are invalid for this workspace");
    }
  }

  const clear = await db.prepare(`DELETE FROM task_label_links WHERE task_id = ?`).bind(taskId).all();
  if (!clear.success) throw new Error(clear.error ?? "Failed to clear task labels");

  for (const labelId of labelIds) {
    const insert = await db
      .prepare(`INSERT INTO task_label_links (task_id, label_id) VALUES (?, ?)`)
      .bind(taskId, labelId)
      .all();
    if (!insert.success) throw new Error(insert.error ?? "Failed to set task labels");
  }
}

async function updateTaskById(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const existing = await getTaskById(db, workspaceId, taskId);
  if (!existing) return null;

  const updates: string[] = [];
  const args: unknown[] = [];
  if (input.title !== undefined) {
    updates.push("title = ?");
    args.push(input.title);
  }
  if (input.columnId !== undefined) {
    updates.push("column_id = ?");
    args.push(input.columnId);
  }
  if (input.projectId !== undefined) {
    updates.push("project_id = ?");
    args.push(input.projectId);
  }
  if (input.milestoneId !== undefined) {
    updates.push("milestone_id = ?");
    args.push(input.milestoneId);
  }
  if (input.priority !== undefined) {
    updates.push("priority = ?");
    args.push(input.priority);
  }
  if (input.assigneeUserId !== undefined) {
    updates.push("assignee_user_id = ?");
    args.push(input.assigneeUserId);
  }
  if (input.dueDate !== undefined) {
    updates.push("due_date = ?");
    args.push(input.dueDate);
  }
  if (input.descriptionText !== undefined) {
    updates.push("description_text = ?");
    args.push(input.descriptionText);
  }
  if (input.descriptionJson !== undefined) {
    updates.push("description_json = ?");
    args.push(input.descriptionJson ? JSON.stringify(input.descriptionJson) : null);
  }
  if (input.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    args.push(input.sortOrder);
  }

  updates.push("updated_by = ?");
  args.push(actorUserId);
  updates.push("updated_at = ?");
  args.push(new Date().toISOString());

  const query = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND workspace_id = ?`;
  const update = await db.prepare(query).bind(...args, taskId, workspaceId).all();
  if (!update.success) throw new Error(update.error ?? "Failed to update task");

  if (input.labelIds !== undefined) {
    await replaceTaskLabels(db, workspaceId, taskId, input.labelIds);
  }

  return getTaskById(db, workspaceId, taskId);
}

async function softDeleteTaskById(db: D1DatabaseLike, workspaceId: string, taskId: string) {
  const existing = await getTaskById(db, workspaceId, taskId);
  if (!existing) return false;
  const now = new Date().toISOString();
  const result = await db
    .prepare(`UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`)
    .bind(now, now, taskId, workspaceId)
    .all();
  if (!result.success) throw new Error(result.error ?? "Failed to delete task");
  return true;
}

async function moveTaskInBoard(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  input: MoveTaskInput,
) {
  if (!input.taskId || !input.targetColumnId) throw new Error("taskId and targetColumnId are required");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) throw new Error("sortOrder is invalid");

  const taskResult = await db
    .prepare(`SELECT id FROM tasks WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`)
    .bind(input.taskId, workspaceId)
    .all<{ id: string }>();
  if (!taskResult.success) throw new Error(taskResult.error ?? "Failed to validate task");
  if (!taskResult.results?.length) throw new Error("Task not found");

  const columnResult = await db
    .prepare(`SELECT id FROM task_columns WHERE id = ? AND workspace_id = ?`)
    .bind(input.targetColumnId, workspaceId)
    .all<{ id: string }>();
  if (!columnResult.success) throw new Error(columnResult.error ?? "Failed to validate column");
  if (!columnResult.results?.length) throw new Error("Column not found");

  const updatedAt = new Date().toISOString();
  const result = await db
    .prepare(
      `
      UPDATE tasks
      SET column_id = ?, sort_order = ?, updated_by = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    )
    .bind(input.targetColumnId, input.sortOrder, actorUserId, updatedAt, input.taskId, workspaceId)
    .all();
  if (!result.success) throw new Error(result.error ?? "Failed to move task");
}

async function reorderTaskColumns(
  db: D1DatabaseLike,
  workspaceId: string,
  updates: Array<{ id: string; sortOrder: number }>,
) {
  for (const update of updates) {
    const result = await db
      .prepare(`UPDATE task_columns SET sort_order = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`)
      .bind(update.sortOrder, new Date().toISOString(), update.id, workspaceId)
      .all();
    if (!result.success) throw new Error(result.error ?? "Failed to reorder task columns");
  }
}

function toPageDto(row: PageRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentPageId: row.parent_page_id,
    isFolder: Boolean(row.is_folder),
    sortOrder: Number(row.sort_order ?? 0),
    title: row.title,
    slug: row.slug,
    icon: row.icon,
    coverImageAssetId: row.cover_image_asset_id,
    excerpt: row.excerpt,
    contentJson: safeJsonParse(row.content_json),
    contentText: row.content_text,
    status: row.status,
    isDeleted: Boolean(row.is_deleted),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
  };
}

async function getKnowledgePages(
  db: D1DatabaseLike,
  workspaceId: string,
  options: { parentId?: string | null; includeArchived?: boolean },
) {
  const where: string[] = ["workspace_id = ?", "deleted_at IS NULL"];
  const args: unknown[] = [workspaceId];
  if (!options.includeArchived) {
    where.push("archived_at IS NULL");
  }
  if (options.parentId === undefined) {
    // no parent filter
  } else if (options.parentId === null) {
    where.push("parent_page_id IS NULL");
  } else {
    where.push("parent_page_id = ?");
    args.push(options.parentId);
  }

  const orderBy =
    options.parentId === undefined ? "updated_at DESC" : "sort_order ASC, title ASC";
  const query = `
    SELECT
      id, workspace_id, parent_page_id, is_folder, sort_order, title, slug, icon,
      cover_image_asset_id, excerpt, content_json, content_text, status, is_deleted,
      created_by, updated_by, created_at, updated_at, archived_at, deleted_at
    FROM pages
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
  `;

  const result = await db.prepare(query).bind(...args).all<PageRow>();
  if (!result.success) throw new Error(result.error ?? "Failed to query pages");
  return (result.results ?? []).map(toPageDto);
}

async function getKnowledgePageById(db: D1DatabaseLike, workspaceId: string, pageId: string) {
  const result = await db
    .prepare(
      `
      SELECT
        id, workspace_id, parent_page_id, is_folder, sort_order, title, slug, icon,
        cover_image_asset_id, excerpt, content_json, content_text, status, is_deleted,
        created_by, updated_by, created_at, updated_at, archived_at, deleted_at
      FROM pages
      WHERE id = ?
        AND workspace_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    )
    .bind(pageId, workspaceId)
    .all<PageRow>();
  if (!result.success) throw new Error(result.error ?? "Failed to query page");
  const row = result.results?.[0];
  return row ? toPageDto(row) : null;
}

async function getKnowledgePageRevisions(
  db: D1DatabaseLike,
  workspaceId: string,
  pageId: string,
) {
  const page = await getKnowledgePageById(db, workspaceId, pageId);
  if (!page) return null;
  const result = await db
    .prepare(
      `
      SELECT
        id, page_id, version, title, content_json, content_text, created_by, change_reason, created_at
      FROM page_revisions
      WHERE page_id = ?
      ORDER BY version DESC
    `,
    )
    .bind(pageId)
    .all<PageRevisionRow>();
  if (!result.success) throw new Error(result.error ?? "Failed to query page revisions");
  return (result.results ?? []).map((row) => ({
    id: row.id,
    pageId: row.page_id,
    version: Number(row.version ?? 0),
    title: row.title,
    contentJson: safeJsonParse(row.content_json),
    contentText: row.content_text,
    createdBy: row.created_by,
    changeReason: row.change_reason,
    createdAt: row.created_at,
  }));
}

async function createKnowledgePage(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  input: CreatePageInput,
) {
  const title = input.title?.trim();
  if (!title) throw new Error("title is required");

  let parentPageId: string | null = null;
  if (input.parentPageId) {
    const parent = await getKnowledgePageById(db, workspaceId, input.parentPageId);
    if (!parent) throw new Error("Parent page not found");
    parentPageId = parent.id;
  }

  const maxSortResult = await db
    .prepare(
      `
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort
      FROM pages
      WHERE workspace_id = ?
        AND deleted_at IS NULL
        AND archived_at IS NULL
        AND (
          (? IS NULL AND parent_page_id IS NULL)
          OR parent_page_id = ?
        )
    `,
    )
    .bind(workspaceId, parentPageId, parentPageId)
    .all<{ max_sort: number | null }>();
  if (!maxSortResult.success) throw new Error(maxSortResult.error ?? "Failed to compute sort order");

  const now = new Date().toISOString();
  const id = createId();
  const slug = createSlug(title);
  const sortOrder = Number(maxSortResult.results?.[0]?.max_sort ?? 0) + 1000;
  const insert = await db
    .prepare(
      `
      INSERT INTO pages (
        id, workspace_id, parent_page_id, is_folder, sort_order, title, slug, icon,
        cover_image_asset_id, excerpt, content_json, content_text, status, is_deleted,
        created_by, updated_by, created_at, updated_at, archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      id,
      workspaceId,
      parentPageId,
      input.isFolder ? 1 : 0,
      sortOrder,
      title,
      slug,
      input.icon ?? null,
      null,
      null,
      null,
      null,
      "draft",
      0,
      actorUserId,
      actorUserId,
      now,
      now,
      null,
      null,
    )
    .all();
  if (!insert.success) throw new Error(insert.error ?? "Failed to create page");

  const page = await getKnowledgePageById(db, workspaceId, id);
  if (!page) throw new Error("Failed to load created page");
  return page;
}

async function updateKnowledgePage(
  db: D1DatabaseLike,
  workspaceId: string,
  actorUserId: string,
  pageId: string,
  input: UpdatePageInput,
) {
  const existing = await getKnowledgePageById(db, workspaceId, pageId);
  if (!existing) return null;

  const updates: string[] = [];
  const args: unknown[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    args.push(input.title);
  }
  if (input.contentJson !== undefined) {
    updates.push("content_json = ?");
    args.push(input.contentJson ? JSON.stringify(input.contentJson) : null);
  }
  if (input.icon !== undefined) {
    updates.push("icon = ?");
    args.push(input.icon);
  }
  if (input.status !== undefined) {
    updates.push("status = ?");
    args.push(input.status);
    if (input.status === "archived") {
      updates.push("archived_at = ?");
      args.push(new Date().toISOString());
    } else {
      updates.push("archived_at = ?");
      args.push(null);
    }
  }
  if (input.parentPageId !== undefined) {
    if (input.parentPageId === pageId) {
      throw new Error("A page cannot be parent of itself");
    }
    if (input.parentPageId !== null) {
      const parent = await getKnowledgePageById(db, workspaceId, input.parentPageId);
      if (!parent) throw new Error("Parent page not found");
    }
    updates.push("parent_page_id = ?");
    args.push(input.parentPageId);
  }

  updates.push("updated_by = ?");
  args.push(actorUserId);
  updates.push("updated_at = ?");
  args.push(new Date().toISOString());

  const query = `UPDATE pages SET ${updates.join(", ")} WHERE id = ? AND workspace_id = ?`;
  const updateResult = await db.prepare(query).bind(...args, pageId, workspaceId).all();
  if (!updateResult.success) throw new Error(updateResult.error ?? "Failed to update page");

  const updated = await getKnowledgePageById(db, workspaceId, pageId);
  if (!updated) throw new Error("Failed to load updated page");

  if (input.createRevision) {
    const latestResult = await db
      .prepare(`SELECT COALESCE(MAX(version), 0) AS max_version FROM page_revisions WHERE page_id = ?`)
      .bind(pageId)
      .all<{ max_version: number | null }>();
    if (!latestResult.success) throw new Error(latestResult.error ?? "Failed to compute revision version");
    const version = Number(latestResult.results?.[0]?.max_version ?? 0) + 1;
    const revisionInsert = await db
      .prepare(
        `
        INSERT INTO page_revisions (
          id, page_id, version, title, content_json, content_text, created_by, change_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        createId(),
        pageId,
        version,
        updated.title,
        updated.contentJson ? JSON.stringify(updated.contentJson) : null,
        updated.contentText,
        actorUserId,
        input.changeReason ?? null,
        new Date().toISOString(),
      )
      .all();
    if (!revisionInsert.success) throw new Error(revisionInsert.error ?? "Failed to create revision");
  }

  return updated;
}

async function reorderKnowledgePages(
  db: D1DatabaseLike,
  workspaceId: string,
  input: { parentPageId: string | null; orderedIds: string[] },
) {
  if (!input.orderedIds.length) throw new Error("orderedIds cannot be empty");
  let sortOrder = 1000;
  for (const pageId of input.orderedIds) {
    const result = await db
      .prepare(
        `
        UPDATE pages
        SET sort_order = ?, updated_at = ?
        WHERE id = ?
          AND workspace_id = ?
          AND (
            (? IS NULL AND parent_page_id IS NULL)
            OR parent_page_id = ?
          )
      `,
      )
      .bind(sortOrder, new Date().toISOString(), pageId, workspaceId, input.parentPageId, input.parentPageId)
      .all();
    if (!result.success) throw new Error(result.error ?? "Failed to reorder pages");
    sortOrder += 1000;
  }
}

async function archiveKnowledgePage(db: D1DatabaseLike, workspaceId: string, pageId: string) {
  const existing = await getKnowledgePageById(db, workspaceId, pageId);
  if (!existing) return false;
  const result = await db
    .prepare(
      `
      UPDATE pages
      SET status = 'archived', archived_at = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    )
    .bind(new Date().toISOString(), new Date().toISOString(), pageId, workspaceId)
    .all();
  if (!result.success) throw new Error(result.error ?? "Failed to archive page");
  return true;
}

async function restoreKnowledgePage(db: D1DatabaseLike, workspaceId: string, pageId: string) {
  const existing = await getKnowledgePageById(db, workspaceId, pageId);
  if (!existing) return false;
  const result = await db
    .prepare(
      `
      UPDATE pages
      SET status = 'published', archived_at = NULL, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    )
    .bind(new Date().toISOString(), pageId, workspaceId)
    .all();
  if (!result.success) throw new Error(result.error ?? "Failed to restore page");
  return true;
}

async function softDeleteKnowledgePage(db: D1DatabaseLike, workspaceId: string, pageId: string) {
  const existing = await getKnowledgePageById(db, workspaceId, pageId);
  if (!existing) return false;
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `
      UPDATE pages
      SET is_deleted = 1, deleted_at = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `,
    )
    .bind(now, now, pageId, workspaceId)
    .all();
  if (!result.success) throw new Error(result.error ?? "Failed to delete page");
  return true;
}

async function getOkrCyclesWithStats(db: D1DatabaseLike, workspaceId: string) {
  const [cyclesResult, objectivesResult, keyResultsResult] = await Promise.all([
    db
      .prepare(
        `
        SELECT id, workspace_id, title, slug, description, start_date, end_date, status,
               created_by, updated_by, created_at, updated_at, archived_at, deleted_at
        FROM okr_cycles
        WHERE workspace_id = ?
          AND deleted_at IS NULL
        ORDER BY start_date DESC
      `,
      )
      .bind(workspaceId)
      .all<OkrCycleRow>(),
    db
      .prepare(
        `
        SELECT id, cycle_id, status
        FROM okr_objectives
        WHERE workspace_id = ?
          AND deleted_at IS NULL
      `,
      )
      .bind(workspaceId)
      .all<{ id: string; cycle_id: string | null; status: string }>(),
    db
      .prepare(
        `
        SELECT id, cycle_id, status, progress_percent
        FROM okr_key_results
        WHERE workspace_id = ?
          AND deleted_at IS NULL
      `,
      )
      .bind(workspaceId)
      .all<{ id: string; cycle_id: string | null; status: string; progress_percent: number }>(),
  ]);

  if (!cyclesResult.success) throw new Error(cyclesResult.error ?? "Failed to query cycles");
  if (!objectivesResult.success) throw new Error(objectivesResult.error ?? "Failed to query objectives");
  if (!keyResultsResult.success) throw new Error(keyResultsResult.error ?? "Failed to query key results");

  const objectives = objectivesResult.results ?? [];
  const keyResults = keyResultsResult.results ?? [];

  return (cyclesResult.results ?? []).map((cycle) => {
    const cObjectives = objectives.filter((o) => o.cycle_id === cycle.id);
    const cKrs = keyResults.filter((k) => k.cycle_id === cycle.id);
    const avgKrProgress =
      cKrs.length === 0
        ? 0
        : Math.round(
            (cKrs.reduce((sum, kr) => sum + Number(kr.progress_percent ?? 0), 0) / cKrs.length) * 10,
          ) / 10;
    return {
      id: cycle.id,
      workspaceId: cycle.workspace_id,
      title: cycle.title,
      slug: cycle.slug,
      description: cycle.description,
      startDate: cycle.start_date,
      endDate: cycle.end_date,
      status: cycle.status,
      createdBy: cycle.created_by,
      updatedBy: cycle.updated_by,
      createdAt: cycle.created_at,
      updatedAt: cycle.updated_at,
      archivedAt: cycle.archived_at,
      deletedAt: cycle.deleted_at,
      stats: {
        objectiveCount: cObjectives.length,
        keyResultCount: cKrs.length,
        objectivesCompleted: cObjectives.filter((o) => o.status === "completed").length,
        krsCompleted: cKrs.filter((k) => k.status === "completed").length,
        objectivesAtRisk: cObjectives.filter((o) => o.status === "at_risk").length,
        objectivesOffTrack: cObjectives.filter((o) => o.status === "off_track").length,
        krsAtRisk: cKrs.filter((k) => k.status === "at_risk").length,
        krsOffTrack: cKrs.filter((k) => k.status === "off_track").length,
        avgKrProgress,
      },
    };
  });
}

async function getOkrObjectives(
  db: D1DatabaseLike,
  workspaceId: string,
  filters: { cycleId?: string; status?: string },
) {
  const where: string[] = ["workspace_id = ?", "deleted_at IS NULL"];
  const args: unknown[] = [workspaceId];
  if (filters.cycleId) {
    where.push("cycle_id = ?");
    args.push(filters.cycleId);
  }
  if (filters.status) {
    where.push("status = ?");
    args.push(filters.status);
  }

  const objectivesResult = await db
    .prepare(
      `
      SELECT
        id, workspace_id, cycle_id, title, slug, description_json, description_text, owner_user_id,
        status, progress_percent, priority, sort_order, start_date, target_date, completed_at,
        created_by, updated_by, created_at, updated_at, archived_at, deleted_at
      FROM okr_objectives
      WHERE ${where.join(" AND ")}
      ORDER BY sort_order ASC, updated_at DESC
    `,
    )
    .bind(...args)
    .all<OkrObjectiveRow>();
  if (!objectivesResult.success) throw new Error(objectivesResult.error ?? "Failed to query objectives");

  const objectives = objectivesResult.results ?? [];
  if (objectives.length === 0) return [];

  const objectiveIds = objectives.map((o) => o.id);
  const placeholders = objectiveIds.map(() => "?").join(", ");
  const keyResultsResult = await db
    .prepare(
      `
      SELECT
        id, workspace_id, cycle_id, objective_id, title, slug, description_json, description_text, owner_user_id,
        metric_type, unit, start_value, current_value, target_value, progress_percent, status, confidence,
        sort_order, start_date, target_date, completed_at, created_by, updated_by, created_at, updated_at,
        archived_at, deleted_at
      FROM okr_key_results
      WHERE workspace_id = ?
        AND deleted_at IS NULL
        AND objective_id IN (${placeholders})
      ORDER BY sort_order ASC, updated_at DESC
    `,
    )
    .bind(workspaceId, ...objectiveIds)
    .all<OkrKeyResultRow>();
  if (!keyResultsResult.success) throw new Error(keyResultsResult.error ?? "Failed to query key results");

  const keyResultsByObjective = new Map<string, OkrKeyResultRow[]>();
  for (const kr of keyResultsResult.results ?? []) {
    const list = keyResultsByObjective.get(kr.objective_id) ?? [];
    list.push(kr);
    keyResultsByObjective.set(kr.objective_id, list);
  }

  return objectives.map((obj) => ({
    id: obj.id,
    workspaceId: obj.workspace_id,
    cycleId: obj.cycle_id,
    title: obj.title,
    slug: obj.slug,
    descriptionJson: safeJsonParse(obj.description_json),
    descriptionText: obj.description_text,
    ownerUserId: obj.owner_user_id,
    status: obj.status,
    progressPercent: Number(obj.progress_percent ?? 0),
    priority: obj.priority,
    sortOrder: Number(obj.sort_order ?? 0),
    startDate: obj.start_date,
    targetDate: obj.target_date,
    completedAt: obj.completed_at,
    createdBy: obj.created_by,
    updatedBy: obj.updated_by,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
    archivedAt: obj.archived_at,
    deletedAt: obj.deleted_at,
    keyResults: (keyResultsByObjective.get(obj.id) ?? []).map((kr) => ({
      id: kr.id,
      workspaceId: kr.workspace_id,
      cycleId: kr.cycle_id,
      objectiveId: kr.objective_id,
      title: kr.title,
      slug: kr.slug,
      descriptionJson: safeJsonParse(kr.description_json),
      descriptionText: kr.description_text,
      ownerUserId: kr.owner_user_id,
      metricType: kr.metric_type,
      unit: kr.unit,
      startValue: Number(kr.start_value ?? 0),
      currentValue: Number(kr.current_value ?? 0),
      targetValue: Number(kr.target_value ?? 0),
      progressPercent: Number(kr.progress_percent ?? 0),
      status: kr.status,
      confidence: kr.confidence,
      sortOrder: Number(kr.sort_order ?? 0),
      startDate: kr.start_date,
      targetDate: kr.target_date,
      completedAt: kr.completed_at,
      createdBy: kr.created_by,
      updatedBy: kr.updated_by,
      createdAt: kr.created_at,
      updatedAt: kr.updated_at,
      archivedAt: kr.archived_at,
      deletedAt: kr.deleted_at,
    })),
  }));
}

async function getAuthUserByEmail(db: D1DatabaseLike, email: string) {
  const result = await db
    .prepare(
      `
      SELECT id, workspace_id, name, email, password_hash, role, is_active
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    )
    .bind(email.toLowerCase())
    .all<AuthUserRow>();
  if (!result.success) throw new Error(result.error ?? "Failed to query auth user");
  const user = result.results?.[0];
  if (!user || !user.is_active) return null;
  return {
    id: user.id,
    workspaceId: user.workspace_id,
    name: user.name,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
  };
}

function buildPageTree(
  pages: Array<
    ReturnType<typeof toPageDto> & {
      children?: Array<ReturnType<typeof toPageDto>>;
    }
  >,
) {
  const byParent = new Map<string | null, typeof pages>();
  for (const page of pages) {
    const parent = page.parentPageId ?? null;
    const list = byParent.get(parent) ?? [];
    list.push({ ...page, children: [] });
    byParent.set(parent, list);
  }

  const attach = (parentId: string | null): typeof pages => {
    const nodes = byParent.get(parentId) ?? [];
    for (const node of nodes) {
      node.children = attach(node.id);
    }
    return nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  };

  return attach(null);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/health") {
      return json({ ok: true, service: "tribus-hub-api" });
    }

    if (request.method === "GET" && pathname === "/db-ping") {
      const probe = await env.TRIBUS_HUB_DB.prepare("select 1 as ok").all<{ ok: number }>();
      return json({ ok: probe.success, data: probe.results ?? [] }, probe.success ? 200 : 500);
    }

    const body = request.method === "GET" ? "" : await request.text();
    const isValid = await verifyRequest(request, env, body);
    if (!isValid) {
      return json({ error: { message: "Unauthorized internal call" } }, 401);
    }

    if (request.method === "GET" && pathname === "/v1/workspace/members") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);

      try {
        const rows = await getWorkspaceMembers(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "GET" && pathname === "/v1/projects") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);

      try {
        const rows = await getProjectsByWorkspace(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "POST" && pathname === "/v1/projects") {
      const workspaceId = request.headers.get("x-workspace-id");
      const actorUserId = request.headers.get("x-actor-user-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);

      try {
        const input = parseJsonBody<CreateProjectInput>(body);
        const project = await createProject(env.TRIBUS_HUB_DB, workspaceId, actorUserId, input);
        return json({ data: project }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "GET" && pathname === "/v1/tasks/board") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);

      try {
        const board = await getTaskBoardData(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: board });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "GET" && pathname === "/v1/task-labels") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);

      try {
        const rows = await getTaskLabelsByWorkspace(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "POST" && pathname === "/v1/task-labels") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);

      try {
        const input = parseJsonBody<CreateTaskLabelInput>(body);
        const label = await createTaskLabel(env.TRIBUS_HUB_DB, workspaceId, input);
        return json({ data: label }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "GET" && pathname === "/v1/tasks") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      const url = new URL(request.url);
      const priorityRaw = url.searchParams.get("priority");
      const priority =
        priorityRaw === "low" ||
        priorityRaw === "medium" ||
        priorityRaw === "high" ||
        priorityRaw === "urgent"
          ? priorityRaw
          : undefined;
      try {
        const rows = await getTasksByWorkspace(env.TRIBUS_HUB_DB, workspaceId, {
          projectId: url.searchParams.get("projectId") ?? undefined,
          columnId: url.searchParams.get("columnId") ?? undefined,
          milestoneId: url.searchParams.get("milestoneId") ?? undefined,
          assigneeUserId: url.searchParams.get("assigneeUserId") ?? undefined,
          labelId: url.searchParams.get("labelId") ?? undefined,
          priority,
        });
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "POST" && pathname === "/v1/tasks") {
      const workspaceId = request.headers.get("x-workspace-id");
      const actorUserId = request.headers.get("x-actor-user-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
      try {
        const input = parseJsonBody<CreateTaskInput>(body);
        const task = await createTask(env.TRIBUS_HUB_DB, workspaceId, actorUserId, input);
        return json({ data: task }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "GET" && pathname === "/v1/task-columns") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      try {
        const rows = await getTaskColumnsByWorkspace(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "GET" && pathname === "/v1/knowledge/tree") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      try {
        const pages = await getKnowledgePages(env.TRIBUS_HUB_DB, workspaceId, {
          includeArchived: false,
        });
        return json({ data: buildPageTree(pages.map((p) => ({ ...p }))) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "GET" && pathname === "/v1/okr/cycles") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      try {
        const rows = await getOkrCyclesWithStats(env.TRIBUS_HUB_DB, workspaceId);
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "GET" && pathname === "/v1/okr/objectives") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      const url = new URL(request.url);
      try {
        const rows = await getOkrObjectives(env.TRIBUS_HUB_DB, workspaceId, {
          cycleId: url.searchParams.get("cycleId") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
        });
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "POST" && pathname === "/v1/internal/auth/user-by-email") {
      try {
        const payload = parseJsonBody<{ email?: string }>(body);
        const email = payload.email?.trim();
        if (!email) return json({ error: { message: "email is required" } }, 400);
        const user = await getAuthUserByEmail(env.TRIBUS_HUB_DB, email);
        return json({ data: user });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "GET" && pathname === "/v1/knowledge/pages") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      const url = new URL(request.url);
      const parentIdRaw = url.searchParams.get("parentId");
      const parentId = parentIdRaw === null ? undefined : parentIdRaw;
      const includeArchived = url.searchParams.get("archived") === "true";
      try {
        const rows = await getKnowledgePages(env.TRIBUS_HUB_DB, workspaceId, {
          parentId,
          includeArchived,
        });
        return json({ data: rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 500);
      }
    }

    if (request.method === "POST" && pathname === "/v1/knowledge/pages") {
      const workspaceId = request.headers.get("x-workspace-id");
      const actorUserId = request.headers.get("x-actor-user-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
      try {
        const input = parseJsonBody<CreatePageInput>(body);
        const page = await createKnowledgePage(env.TRIBUS_HUB_DB, workspaceId, actorUserId, input);
        return json({ data: page }, 201);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "POST" && pathname === "/v1/knowledge/pages/reorder") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      try {
        const input = parseJsonBody<{ parentPageId: string | null; orderedIds: string[] }>(body);
        await reorderKnowledgePages(env.TRIBUS_HUB_DB, workspaceId, input);
        return json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "PATCH" && pathname === "/v1/task-columns/reorder") {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      try {
        const payload = parseJsonBody<{ updates: Array<{ id: string; sortOrder: number }> }>(body);
        await reorderTaskColumns(env.TRIBUS_HUB_DB, workspaceId, payload.updates ?? []);
        return json({ data: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (request.method === "POST" && pathname === "/v1/tasks/move") {
      const workspaceId = request.headers.get("x-workspace-id");
      const actorUserId = request.headers.get("x-actor-user-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
      try {
        const input = parseJsonBody<MoveTaskInput>(body);
        await moveTaskInBoard(env.TRIBUS_HUB_DB, workspaceId, actorUserId, input);
        return json({ data: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return json({ error: { message } }, 400);
      }
    }

    if (pathname.startsWith("/v1/knowledge/pages/")) {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      const parts = pathname.split("/");
      const pageId = parts[parts.length - 1];
      const maybeRevisions = parts[parts.length - 1] === "revisions";
      const targetPageId = maybeRevisions ? parts[parts.length - 2] : pageId;
      if (!targetPageId) return json({ error: { message: "page id is required" } }, 400);

      if (request.method === "GET" && maybeRevisions) {
        try {
          const rows = await getKnowledgePageRevisions(env.TRIBUS_HUB_DB, workspaceId, targetPageId);
          if (rows === null) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: rows });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 500);
        }
      }

      if (request.method === "GET") {
        try {
          const page = await getKnowledgePageById(env.TRIBUS_HUB_DB, workspaceId, targetPageId);
          if (!page) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: page });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 500);
        }
      }

      if (request.method === "POST" && parts[parts.length - 1] === "archive") {
        try {
          const archived = await archiveKnowledgePage(env.TRIBUS_HUB_DB, workspaceId, targetPageId);
          if (!archived) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }

      if (request.method === "POST" && parts[parts.length - 1] === "restore") {
        try {
          const restored = await restoreKnowledgePage(env.TRIBUS_HUB_DB, workspaceId, targetPageId);
          if (!restored) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }

      if (request.method === "PATCH" && !maybeRevisions) {
        const actorUserId = request.headers.get("x-actor-user-id");
        if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
        try {
          const input = parseJsonBody<UpdatePageInput>(body);
          const updated = await updateKnowledgePage(
            env.TRIBUS_HUB_DB,
            workspaceId,
            actorUserId,
            targetPageId,
            input,
          );
          if (!updated) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: updated });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }

      if (request.method === "DELETE" && !maybeRevisions) {
        try {
          const deleted = await softDeleteKnowledgePage(env.TRIBUS_HUB_DB, workspaceId, targetPageId);
          if (!deleted) return json({ error: { message: "Page not found" } }, 404);
          return json({ data: null }, 200);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }
    }

    if (pathname.startsWith("/v1/tasks/")) {
      const workspaceId = request.headers.get("x-workspace-id");
      if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
      const taskId = pathname.split("/").at(-1);
      if (!taskId) return json({ error: { message: "task id is required" } }, 400);

      if (request.method === "GET") {
        try {
          const task = await getTaskById(env.TRIBUS_HUB_DB, workspaceId, taskId);
          if (!task) return json({ error: { message: "Task not found" } }, 404);
          return json({ data: task });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 500);
        }
      }

      if (request.method === "PATCH") {
        const actorUserId = request.headers.get("x-actor-user-id");
        if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
        try {
          const input = parseJsonBody<UpdateTaskInput>(body);
          const updated = await updateTaskById(env.TRIBUS_HUB_DB, workspaceId, actorUserId, taskId, input);
          if (!updated) return json({ error: { message: "Task not found" } }, 404);
          return json({ data: updated });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }

      if (request.method === "DELETE") {
        try {
          const deleted = await softDeleteTaskById(env.TRIBUS_HUB_DB, workspaceId, taskId);
          if (!deleted) return json({ error: { message: "Task not found" } }, 404);
          return json({ data: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error";
          return json({ error: { message } }, 400);
        }
      }
    }

    const extraV1 = await handleV1ExtraRoutes(request, env, pathname, body);
    if (extraV1) return extraV1;
    const okrV1 = await handleV1OkrWriteRoutes(request, env, pathname, body);
    if (okrV1) return okrV1;

    return json({ error: { message: "Not found" } }, 404);
  },
};
