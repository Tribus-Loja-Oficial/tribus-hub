/**
 * Additional authenticated /v1 routes (projects detail, PM, OKR writes, search).
 * Kept separate from index.ts to limit file size.
 */
import { ensureExternalRef } from "./external-refs";
import {
  buildCompletionSnapshotFromPreCompleteRow,
  computePaceHealth,
  resolveMilestoneWindow,
  resolveProjectWindow,
} from "./pace-health";
import {
  workflowStatusForMilestoneRow,
  workflowStatusForOkrObjective,
  workflowStatusForProjectRow,
} from "./pace-workflow-status";
import { healthInsightForObjective } from "./okr-health-insights";

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results?: T[]; success: boolean; error?: string }>;
};

type D1DatabaseLike = { prepare: (query: string) => D1PreparedStatement };
type ExternalRefEntityType =
  | "user"
  | "project"
  | "milestone"
  | "task"
  | "okr_cycle"
  | "okr_objective"
  | "okr_key_result";

export type HubExtraEnv = {
  TRIBUS_HUB_DB: D1DatabaseLike;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function createId() {
  return crypto.randomUUID().replace(/-/g, "");
}

type ProjectEstimateSummary = {
  unit: "hours" | "story_points";
  /** Soma só de estimativas &gt; 0 (horas ou SP) — UI “X / Y horas”. */
  total: number;
  completed: number;
  /** Peso por tarefa: estimativa se &gt; 0, senão 1 — roll-up coerente de % projeto/milestone. */
  weightTotal: number;
  weightCompleted: number;
  milestoneProgressPercent: Map<string, number>;
};

const PROJECT_DB_STATUSES = new Set(["planned", "active", "on_hold", "completed", "cancelled"]);
const MILESTONE_DB_STATUSES = new Set(["pending", "in_progress", "blocked", "completed", "missed"]);

async function milestoneTaskProgressPercentByProject(
  db: D1DatabaseLike,
  projectId: string,
): Promise<ProjectEstimateSummary> {
  const r = await db
    .prepare(
      `SELECT
          p.estimation_unit as estimation_unit,
          t.milestone_id as milestone_id,
          t.estimated_hours as estimated_hours,
          t.estimated_points as estimated_points,
          t.completed_at as completed_at,
          c.slug as column_slug
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       INNER JOIN task_columns c ON c.id = t.column_id
       WHERE t.project_id = ? AND t.deleted_at IS NULL`,
    )
    .bind(projectId)
    .all<{
      estimation_unit: "hours" | "story_points" | null;
      milestone_id: string | null;
      estimated_hours: number | null;
      estimated_points: number | null;
      completed_at: string | null;
      column_slug: string | null;
    }>();
  const unit = (r.results?.[0]?.estimation_unit ?? "hours") as "hours" | "story_points";
  const byMilestone = new Map<
    string,
    {
      estimateTotal: number;
      estimateCompleted: number;
      weightTotal: number;
      weightCompleted: number;
    }
  >();
  let projectTotal = 0;
  let projectCompleted = 0;
  let projectWeightTotal = 0;
  let projectWeightCompleted = 0;
  for (const row of r.results ?? []) {
    const estimateRaw = unit === "story_points" ? row.estimated_points : row.estimated_hours;
    const estimate = Number(estimateRaw ?? 0);
    const isDone =
      Boolean(row.completed_at) || String(row.column_slug ?? "").toLowerCase() === "done";
    const isPositiveEstimate = Number.isFinite(estimate) && estimate > 0;
    const taskWeight = isPositiveEstimate ? estimate : 1;
    projectWeightTotal += taskWeight;
    if (isDone) projectWeightCompleted += taskWeight;
    if (isPositiveEstimate) {
      projectTotal += estimate;
      if (isDone) projectCompleted += estimate;
    }
    if (!row.milestone_id) continue;
    const current = byMilestone.get(row.milestone_id) ?? {
      estimateTotal: 0,
      estimateCompleted: 0,
      weightTotal: 0,
      weightCompleted: 0,
    };
    current.weightTotal += taskWeight;
    if (isDone) current.weightCompleted += taskWeight;
    if (isPositiveEstimate) {
      current.estimateTotal += estimate;
      if (isDone) current.estimateCompleted += estimate;
    }
    byMilestone.set(row.milestone_id, current);
  }
  const milestoneProgressPercent = new Map<string, number>();
  for (const [milestoneId, stat] of byMilestone.entries()) {
    milestoneProgressPercent.set(
      milestoneId,
      stat.weightTotal > 0 ? Math.round((stat.weightCompleted / stat.weightTotal) * 100) : 0,
    );
  }
  return {
    unit,
    total: projectTotal,
    completed: projectCompleted,
    weightTotal: projectWeightTotal,
    weightCompleted: projectWeightCompleted,
    milestoneProgressPercent,
  };
}

function healthInsightForProjectRow(raw: Record<string, unknown>) {
  const w = resolveProjectWindow(raw);
  return computePaceHealth({
    kind: "project",
    status: String(raw.status ?? "planned"),
    progressPercent: Number(raw.progress_percent ?? 0),
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
    completedAt: (raw.completed_at as string | null) ?? null,
    healthSnapshotJson: (raw.health_snapshot_json as string | null) ?? null,
  });
}

function healthInsightForMilestoneRow(
  raw: Record<string, unknown>,
  projectRaw: Record<string, unknown>,
  taskProgressPercent: number,
) {
  const progress =
    String(raw.status ?? "") === "completed"
      ? 100
      : Math.max(0, Math.min(100, taskProgressPercent));
  const w = resolveMilestoneWindow(
    { due_date: raw.due_date as string | null },
    {
      start_date: projectRaw.start_date as string | null,
      target_date: projectRaw.target_date as string | null,
      title: projectRaw.title as string | null,
    },
  );
  return computePaceHealth({
    kind: "milestone",
    status: String(raw.status ?? "pending"),
    progressPercent: progress,
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
    completedAt: (raw.completed_at as string | null) ?? null,
    healthSnapshotJson: (raw.health_snapshot_json as string | null) ?? null,
  });
}

/** Resolve project route param (UUID or slug) to canonical project id. */
async function resolveProjectIdByIdOrSlug(
  db: D1DatabaseLike,
  workspaceId: string,
  idOrSlug: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id FROM projects WHERE workspace_id = ? AND deleted_at IS NULL AND (id = ? OR slug = ?) LIMIT 1`,
    )
    .bind(workspaceId, idOrSlug, idOrSlug)
    .all<{ id: string }>();
  if (!row.success || !row.results?.[0]) return null;
  return row.results[0].id;
}

function parseJson<T>(body: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeIsoCivilDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function validateProjectDateRange(startDate: unknown, targetDate: unknown): string | null {
  const start = normalizeIsoCivilDate(startDate);
  const target = normalizeIsoCivilDate(targetDate);
  if (start && target && start > target) {
    return "project startDate cannot be later than targetDate";
  }
  return null;
}

function validateMilestoneDueWithinProjectRange(
  dueDate: unknown,
  projectStartDate: unknown,
  projectTargetDate: unknown,
): string | null {
  const due = normalizeIsoCivilDate(dueDate);
  if (!due) return null;
  const pStart = normalizeIsoCivilDate(projectStartDate);
  const pTarget = normalizeIsoCivilDate(projectTargetDate);
  if (pStart && due < pStart) {
    return "milestone dueDate cannot be earlier than project startDate";
  }
  if (pTarget && due > pTarget) {
    return "milestone dueDate cannot be later than project targetDate";
  }
  return null;
}

async function getExternalRefMap(
  db: D1DatabaseLike,
  workspaceId: string,
  entityType: ExternalRefEntityType,
  entityIds: string[],
) {
  if (entityIds.length === 0) return new Map<string, string>();
  const unique = [...new Set(entityIds)];
  const placeholders = unique.map(() => "?").join(", ");
  const rows = await db
    .prepare(
      `
      SELECT entity_id, external_ref
      FROM entity_external_refs
      WHERE workspace_id = ?
        AND entity_type = ?
        AND entity_id IN (${placeholders})
    `,
    )
    .bind(workspaceId, entityType, ...unique)
    .all<{ entity_id: string; external_ref: string }>();
  if (!rows.success) throw new Error(rows.error ?? "Failed to query external refs");
  return new Map((rows.results ?? []).map((r) => [r.entity_id, r.external_ref]));
}

function slugifyTitle(input: string): string {
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

async function resolveUniqueSlug(
  db: D1DatabaseLike,
  sql: string,
  workspaceId: string,
  base: string,
): Promise<string> {
  const check = await db.prepare(sql).bind(workspaceId, base).all<{ id: string }>();
  if (!check.success) throw new Error(check.error ?? "slug check failed");
  if (check.results?.length)
    return `${base || "item"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
  return base || "item";
}

export function calcKrProgress(
  start: number,
  current: number,
  target: number,
  metricType: string,
): number {
  if (metricType === "boolean") return current >= 1 ? 100 : 0;
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - start) / range) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function calcObjectiveProgressFromKrs(krs: { progressPercent: number }[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((s, k) => s + k.progressPercent, 0);
  return Math.round((total / krs.length) * 10) / 10;
}

export async function handleV1ExtraRoutes(
  request: Request,
  env: HubExtraEnv,
  pathname: string,
  body: string,
): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const workspaceId = request.headers.get("x-workspace-id");
  const actorUserId = request.headers.get("x-actor-user-id");
  const db = env.TRIBUS_HUB_DB;

  const needWs = () => {
    if (!workspaceId) return json({ error: { message: "x-workspace-id is required" } }, 400);
    return null;
  };
  const needActor = () => {
    if (!actorUserId) return json({ error: { message: "x-actor-user-id is required" } }, 400);
    return null;
  };

  /**
   * Mesma semântica do GET /v1/okr/dashboard: allCycles=1 → workspace inteiro;
   * cycleId → ciclo explícito; sem params → ciclo com status active (se existir), senão workspace inteiro.
   */
  type PmDashboardScope = { kind: "workspace" } | { kind: "cycle"; cycleId: string };
  const resolvePmDashboardScope = async (ws: string): Promise<PmDashboardScope | Response> => {
    const url = new URL(request.url);
    if (url.searchParams.get("allCycles") === "1") return { kind: "workspace" };
    const cycleIdParam = url.searchParams.get("cycleId")?.trim() ?? "";
    if (cycleIdParam.length > 0) {
      const row = await db
        .prepare(
          `SELECT id FROM okr_cycles WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL`,
        )
        .bind(ws, cycleIdParam)
        .first<{ id: string }>();
      if (!row) return json({ error: { message: "cycle not found" } }, 404);
      return { kind: "cycle", cycleId: cycleIdParam };
    }
    const active = await db
      .prepare(
        `SELECT id FROM okr_cycles WHERE workspace_id = ? AND status = 'active' AND deleted_at IS NULL ORDER BY start_date DESC LIMIT 1`,
      )
      .bind(ws)
      .first<{ id: string }>();
    if (active?.id) return { kind: "cycle", cycleId: active.id };
    return { kind: "workspace" };
  };

  // --- GET /v1/search?q= ---
  if (method === "GET" && pathname === "/v1/search") {
    const err = needWs();
    if (err) return err;
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2)
      return json({ error: { message: "query must be at least 2 characters" } }, 400);
    const safe = q.replace(/[%_]/g, " ").trim();
    if (safe.length < 2)
      return json({ error: { message: "query must be at least 2 characters" } }, 400);
    const pattern = `%${safe}%`;
    const limit = 48;
    const each = 8;
    try {
      const [pages, projects, milestones, tasks, objectives, keyResults, cycles] =
        await Promise.all([
          db
            .prepare(
              `SELECT id, title, slug, excerpt FROM pages
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR slug LIKE ? OR IFNULL(excerpt,'') LIKE ? OR IFNULL(content_text,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId, pattern, pattern, pattern, pattern, each)
            .all<{ id: string; title: string; slug: string; excerpt: string | null }>(),
          db
            .prepare(
              `SELECT id, title, slug, summary, description_text FROM projects
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR IFNULL(summary,'') LIKE ? OR IFNULL(description_text,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, pattern, pattern, each)
            .all<{
              id: string;
              title: string;
              slug: string;
              summary: string | null;
              description_text: string | null;
            }>(),
          db
            .prepare(
              `SELECT m.id, m.title, m.project_id FROM milestones m
             INNER JOIN projects p ON p.id = m.project_id
             WHERE p.workspace_id = ? AND m.title LIKE ?
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, each)
            .all<{ id: string; title: string; project_id: string }>(),
          db
            .prepare(
              `SELECT id, title, slug, description_text FROM tasks
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR slug LIKE ? OR IFNULL(description_text,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, pattern, pattern, each)
            .all<{ id: string; title: string; slug: string; description_text: string | null }>(),
          db
            .prepare(
              `SELECT id, title, slug, description_text FROM okr_objectives
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR IFNULL(description_text,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, pattern, each)
            .all<{ id: string; title: string; slug: string; description_text: string | null }>(),
          db
            .prepare(
              `SELECT id, title, slug, description_text FROM okr_key_results
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR IFNULL(description_text,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, pattern, each)
            .all<{ id: string; title: string; slug: string; description_text: string | null }>(),
          db
            .prepare(
              `SELECT id, title, slug, description FROM okr_cycles
             WHERE workspace_id = ? AND deleted_at IS NULL
               AND (title LIKE ? OR IFNULL(description,'') LIKE ?)
             LIMIT ?`,
            )
            .bind(workspaceId!, pattern, pattern, each)
            .all<{ id: string; title: string; slug: string; description: string | null }>(),
        ]);
      if (
        !pages.success ||
        !projects.success ||
        !milestones.success ||
        !tasks.success ||
        !objectives.success ||
        !keyResults.success ||
        !cycles.success
      ) {
        throw new Error("search query failed");
      }
      const results = [
        ...(pages.results ?? []).map((p) => ({
          id: p.id,
          type: "page" as const,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? undefined,
        })),
        ...(projects.results ?? []).map((p) => ({
          id: p.id,
          type: "project" as const,
          title: p.title,
          slug: p.slug,
          excerpt: p.summary ?? p.description_text ?? undefined,
        })),
        ...(milestones.results ?? []).map((m) => ({
          id: m.id,
          type: "milestone" as const,
          title: m.title,
          slug: m.id,
        })),
        ...(tasks.results ?? []).map((t) => ({
          id: t.id,
          type: "task" as const,
          title: t.title,
          slug: t.slug,
          excerpt: t.description_text ?? undefined,
        })),
        ...(objectives.results ?? []).map((o) => ({
          id: o.id,
          type: "okr_objective" as const,
          title: o.title,
          slug: o.slug,
          excerpt: o.description_text ?? undefined,
        })),
        ...(keyResults.results ?? []).map((k) => ({
          id: k.id,
          type: "okr_key_result" as const,
          title: k.title,
          slug: k.slug,
          excerpt: k.description_text ?? undefined,
        })),
        ...(cycles.results ?? []).map((c) => ({
          id: c.id,
          type: "okr_cycle" as const,
          title: c.title,
          slug: c.slug,
          excerpt: c.description ?? undefined,
        })),
      ].slice(0, limit);
      return json({
        data: {
          pages: results.filter((r) => r.type === "page"),
          projects: results.filter((r) => r.type === "project"),
          milestones: results.filter((r) => r.type === "milestone"),
          tasks: results.filter((r) => r.type === "task"),
          objectives: results.filter((r) => r.type === "okr_objective"),
          keyResults: results.filter((r) => r.type === "okr_key_result"),
          cycles: results.filter((r) => r.type === "okr_cycle"),
          total: results.length,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "search failed";
      return json({ error: { message } }, 500);
    }
  }

  // --- GET /v1/pm/dashboard ---
  if (method === "GET" && pathname === "/v1/pm/dashboard") {
    const err = needWs();
    if (err) return err;
    const ws = workspaceId!;
    const scopeOrErr = await resolvePmDashboardScope(ws);
    if (scopeOrErr instanceof Response) return scopeOrErr;
    const scope = scopeOrErr;
    try {
      const projSql =
        `SELECT id, status, health_status, start_date, target_date, progress_percent, completed_at, health_snapshot_json
           FROM projects WHERE workspace_id = ? AND deleted_at IS NULL` +
        (scope.kind === "cycle" ? ` AND cycle_id = ?` : "");
      const projStmt = db
        .prepare(projSql)
        .bind(...(scope.kind === "cycle" ? [ws, scope.cycleId] : [ws]));
      const proj = await projStmt.all<Record<string, unknown>>();
      if (!proj.success) throw new Error(proj.error ?? "projects");
      const allProjects = proj.results ?? [];
      const active = allProjects.filter((p) => String(p.status) === "active");
      const today = new Date().toISOString().slice(0, 10);
      const msSql =
        `SELECT m.id, m.status, m.due_date, m.project_id FROM milestones m
           INNER JOIN projects p ON p.id = m.project_id
           WHERE p.workspace_id = ?` + (scope.kind === "cycle" ? ` AND p.cycle_id = ?` : "");
      const ms = await db
        .prepare(msSql)
        .bind(...(scope.kind === "cycle" ? [ws, scope.cycleId] : [ws]))
        .all<{ id: string; status: string; due_date: string | null; project_id: string }>();
      if (!ms.success) throw new Error(ms.error ?? "milestones");
      const overdueMilestones = (ms.results ?? []).filter(
        (m) => m.due_date && m.due_date < today && m.status !== "completed",
      ).length;
      return json({
        data: {
          totalProjects: allProjects.length,
          activeProjects: active.length,
          atRisk: active.filter((p) => {
            const slug = healthInsightForProjectRow(p).slug;
            return slug === "at_risk" || slug === "off_track";
          }).length,
          paceOnTrackActive: active.filter((p) => {
            const slug = healthInsightForProjectRow(p).slug;
            return slug === "on_track" || slug === "ahead";
          }).length,
          /** Inclui `on_hold` (Bloqueado no cadastro); não filtrar só em `active` pois pausa remove de active. */
          blocked: allProjects.filter(
            (p) => String(p.status) === "on_hold" || String(p.health_status ?? "") === "blocked",
          ).length,
          overdueMilestones,
          completedProjects: allProjects.filter((p) => p.status === "completed").length,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "pm dashboard failed";
      return json({ error: { message } }, 500);
    }
  }

  if (method === "GET" && pathname === "/v1/pm/upcoming-milestones") {
    const err = needWs();
    if (err) return err;
    const daysAhead = Number(new URL(request.url).searchParams.get("days") ?? "14");
    const ws = workspaceId!;
    const scopeOrErr = await resolvePmDashboardScope(ws);
    if (scopeOrErr instanceof Response) return scopeOrErr;
    const scope = scopeOrErr;
    try {
      const projSql =
        `SELECT id, title, start_date, target_date, status FROM projects WHERE workspace_id = ? AND deleted_at IS NULL` +
        (scope.kind === "cycle" ? ` AND cycle_id = ?` : "");
      const proj = await db
        .prepare(projSql)
        .bind(...(scope.kind === "cycle" ? [ws, scope.cycleId] : [ws]))
        .all<{
          id: string;
          title: string;
          start_date: string | null;
          target_date: string | null;
          status: string;
        }>();
      if (!proj.success) throw new Error(proj.error);
      const plist = proj.results ?? [];
      if (plist.length === 0) return json({ data: [] });
      const pids = plist.map((p) => p.id);
      const titles = new Map(plist.map((p) => [p.id, p.title]));
      const projectRowById = new Map(
        plist.map((p) => [
          p.id,
          {
            id: p.id,
            title: p.title,
            start_date: p.start_date,
            target_date: p.target_date,
            status: p.status,
          } as Record<string, unknown>,
        ]),
      );
      const ph = pids.map(() => "?").join(", ");
      const today = new Date().toISOString().slice(0, 10);
      const future = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
      const ms = await db
        .prepare(
          `SELECT * FROM milestones WHERE project_id IN (${ph}) AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC LIMIT 12`,
        )
        .bind(...pids, today, future)
        .all<Record<string, unknown>>();
      if (!ms.success) throw new Error(ms.error);
      const rows = (ms.results ?? [])
        .filter((m) => m.status !== "completed")
        .map((m) => {
          const raw = m as Record<string, unknown>;
          const pid = m.project_id as string;
          const projectRaw = projectRowById.get(pid) ?? {};
          const workflowStatusInsight = workflowStatusForMilestoneRow(raw, projectRaw, 0);
          return {
            ...mapMilestoneCamel(m),
            projectTitle: titles.get(pid) ?? "",
            workflowStatusInsight,
          };
        });
      return json({ data: rows });
    } catch (e) {
      const message = e instanceof Error ? e.message : "upcoming milestones failed";
      return json({ error: { message } }, 500);
    }
  }

  if (method === "GET" && pathname === "/v1/pm/overdue-tasks-count") {
    const err = needWs();
    if (err) return err;
    const ws = workspaceId!;
    const scopeOrErr = await resolvePmDashboardScope(ws);
    if (scopeOrErr instanceof Response) return scopeOrErr;
    const scope = scopeOrErr;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const countSql =
        scope.kind === "workspace"
          ? `SELECT COUNT(*) as c FROM tasks WHERE workspace_id = ? AND deleted_at IS NULL AND completed_at IS NULL AND due_date IS NOT NULL AND due_date <= ?`
          : `SELECT COUNT(*) as c FROM tasks t
             INNER JOIN projects p ON p.id = t.project_id
             WHERE t.workspace_id = ? AND p.workspace_id = ? AND p.deleted_at IS NULL AND p.cycle_id = ?
               AND t.deleted_at IS NULL AND t.completed_at IS NULL AND t.due_date IS NOT NULL AND t.due_date <= ?`;
      const row = await db
        .prepare(countSql)
        .bind(...(scope.kind === "workspace" ? [ws, today] : [ws, ws, scope.cycleId, today]))
        .all<{ c: number }>();
      if (!row.success) throw new Error(row.error);
      return json({ data: { count: Number(row.results?.[0]?.c ?? 0) } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "overdue count failed";
      return json({ error: { message } }, 500);
    }
  }

  if (method === "GET" && pathname === "/v1/pm/overdue-milestones-list") {
    const err = needWs();
    if (err) return err;
    const ws = workspaceId!;
    const scopeOrErr = await resolvePmDashboardScope(ws);
    if (scopeOrErr instanceof Response) return scopeOrErr;
    const scope = scopeOrErr;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sql =
        `SELECT m.id, m.project_id, m.title, m.description, m.status, m.priority, m.due_date, m.completed_at,
                m.health_snapshot_json, m.owner_user_id, m.sort_order, m.created_at, m.updated_at,
                p.title AS project_title, p.start_date AS project_start_date, p.target_date AS project_target_date, p.status AS project_status
         FROM milestones m
         INNER JOIN projects p ON p.id = m.project_id
         WHERE p.workspace_id = ? AND p.deleted_at IS NULL
           AND m.due_date IS NOT NULL AND m.due_date < ?
           AND m.status != 'completed'` +
        (scope.kind === "cycle" ? ` AND p.cycle_id = ?` : "") +
        ` ORDER BY m.due_date ASC LIMIT 50`;
      const res = await db
        .prepare(sql)
        .bind(...(scope.kind === "cycle" ? [ws, today, scope.cycleId] : [ws, today]))
        .all<Record<string, unknown>>();
      if (!res.success) throw new Error(res.error ?? "overdue milestones list");
      const rows = (res.results ?? []).map((row) => {
        const projectRaw = {
          id: row.project_id,
          title: row.project_title,
          start_date: row.project_start_date,
          target_date: row.project_target_date,
          status: row.project_status,
        } as Record<string, unknown>;
        const rawM: Record<string, unknown> = {
          id: row.id,
          project_id: row.project_id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          due_date: row.due_date,
          completed_at: row.completed_at,
          health_snapshot_json: row.health_snapshot_json,
          owner_user_id: row.owner_user_id,
          sort_order: row.sort_order,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        const workflowStatusInsight = workflowStatusForMilestoneRow(rawM, projectRaw, 0);
        return {
          ...mapMilestoneCamel(rawM),
          projectTitle: String(row.project_title ?? ""),
          workflowStatusInsight,
        };
      });
      return json({ data: rows });
    } catch (e) {
      const message = e instanceof Error ? e.message : "overdue milestones list failed";
      return json({ error: { message } }, 500);
    }
  }

  if (method === "GET" && pathname === "/v1/pm/overdue-tasks-list") {
    const err = needWs();
    if (err) return err;
    const ws = workspaceId!;
    const scopeOrErr = await resolvePmDashboardScope(ws);
    if (scopeOrErr instanceof Response) return scopeOrErr;
    const scope = scopeOrErr;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sql =
        scope.kind === "workspace"
          ? `SELECT t.*, p.title AS project_title
             FROM tasks t
             LEFT JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
             WHERE t.workspace_id = ? AND t.deleted_at IS NULL AND t.completed_at IS NULL
               AND t.due_date IS NOT NULL AND t.due_date <= ?
             ORDER BY t.due_date ASC LIMIT 50`
          : `SELECT t.*, p.title AS project_title
             FROM tasks t
             INNER JOIN projects p ON p.id = t.project_id
             WHERE t.workspace_id = ? AND p.workspace_id = ? AND p.deleted_at IS NULL AND p.cycle_id = ?
               AND t.deleted_at IS NULL AND t.completed_at IS NULL
               AND t.due_date IS NOT NULL AND t.due_date <= ?
             ORDER BY t.due_date ASC LIMIT 50`;
      const res = await db
        .prepare(sql)
        .bind(...(scope.kind === "workspace" ? [ws, today] : [ws, ws, scope.cycleId, today]))
        .all<Record<string, unknown>>();
      if (!res.success) throw new Error(res.error ?? "overdue tasks list");
      const rows = (res.results ?? []).map((row) => {
        const { project_title: projectTitle, ...trow } = row;
        return {
          ...mapTaskCamel(trow),
          projectTitle: projectTitle != null ? String(projectTitle) : null,
        };
      });
      return json({ data: rows });
    } catch (e) {
      const message = e instanceof Error ? e.message : "overdue tasks list failed";
      return json({ error: { message } }, 500);
    }
  }

  // --- GET /v1/workspace/cycles ---
  if (method === "GET" && pathname === "/v1/workspace/cycles") {
    const err = needWs();
    if (err) return err;
    try {
      const cyclesRes = await db
        .prepare(
          `SELECT c.*, er.external_ref
           FROM okr_cycles c
           LEFT JOIN entity_external_refs er
             ON er.workspace_id = c.workspace_id
            AND er.entity_type = 'okr_cycle'
            AND er.entity_id = c.id
           WHERE c.workspace_id = ? AND c.deleted_at IS NULL
           ORDER BY c.start_date DESC`,
        )
        .bind(workspaceId)
        .all<Record<string, unknown>>();
      if (!cyclesRes.success) throw new Error(cyclesRes.error ?? "cycles");
      const cycles = cyclesRes.results ?? [];
      if (cycles.length === 0) return json({ data: [] });
      const ids = cycles.map((c) => String(c.id));
      const ph = ids.map(() => "?").join(", ");
      const [objectivesRes, projectsRes] = await Promise.all([
        db
          .prepare(
            `SELECT id, cycle_id, title, status, progress_percent, start_date, target_date
             FROM okr_objectives
             WHERE workspace_id = ? AND deleted_at IS NULL AND cycle_id IN (${ph})
             ORDER BY sort_order ASC`,
          )
          .bind(workspaceId, ...ids)
          .all<Record<string, unknown>>(),
        db
          .prepare(
            `SELECT id, cycle_id, title, slug, status, health_status, progress_percent, start_date, target_date, completed_at, health_snapshot_json
             FROM projects
             WHERE workspace_id = ? AND deleted_at IS NULL AND cycle_id IN (${ph})
             ORDER BY updated_at DESC`,
          )
          .bind(workspaceId, ...ids)
          .all<Record<string, unknown>>(),
      ]);
      const objectivesByCycle = new Map<string, Record<string, unknown>[]>();
      for (const o of objectivesRes.results ?? []) {
        const cid = String(o.cycle_id ?? "");
        if (!cid) continue;
        const list = objectivesByCycle.get(cid) ?? [];
        list.push(o);
        objectivesByCycle.set(cid, list);
      }
      const projectsByCycle = new Map<string, Record<string, unknown>[]>();
      for (const p of projectsRes.results ?? []) {
        const cid = String(p.cycle_id ?? "");
        if (!cid) continue;
        const list = projectsByCycle.get(cid) ?? [];
        list.push(p);
        projectsByCycle.set(cid, list);
      }
      return json({
        data: cycles.map((c) => {
          const cid = String(c.id);
          const objectives = objectivesByCycle.get(cid) ?? [];
          const projects = projectsByCycle.get(cid) ?? [];
          return {
            id: c.id,
            externalRef: (c.external_ref as string | null | undefined) ?? null,
            workspaceId: c.workspace_id,
            title: c.title,
            slug: c.slug,
            description: c.description ?? null,
            startDate: c.start_date,
            endDate: c.end_date,
            status: c.status,
            createdBy: c.created_by,
            updatedBy: c.updated_by,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            archivedAt: c.archived_at ?? null,
            deletedAt: c.deleted_at ?? null,
            summary: {
              objectiveCount: objectives.length,
              objectiveCompleted: objectives.filter((o) => String(o.status) === "completed").length,
              projectCount: projects.length,
              projectBlocked: projects.filter(
                (p) =>
                  String(p.status) === "on_hold" || String(p.health_status ?? "") === "blocked",
              ).length,
            },
            objectives: objectives.map((o) => {
              const cycleRow = c as Record<string, unknown>;
              const orow = o as Record<string, unknown>;
              return {
                id: o.id,
                title: o.title,
                status: o.status,
                progressPercent: Number(o.progress_percent ?? 0),
                startDate: o.start_date ?? null,
                targetDate: o.target_date ?? null,
                healthInsight: healthInsightForObjective(orow, cycleRow),
                workflowStatusInsight: workflowStatusForOkrObjective(orow, cycleRow),
              };
            }),
            projects: projects.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              status: p.status,
              progressPercent: Number(p.progress_percent ?? 0),
              startDate: p.start_date ?? null,
              targetDate: p.target_date ?? null,
              healthInsight: healthInsightForProjectRow(p),
              workflowStatusInsight: workflowStatusForProjectRow(p),
            })),
          };
        }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "workspace cycles failed";
      return json({ error: { message } }, 500);
    }
  }

  // --- GET /v1/projects/hierarchy ---
  if (method === "GET" && pathname === "/v1/projects/hierarchy") {
    const err = needWs();
    if (err) return err;
    try {
      const projectsRes = await db
        .prepare(
          `SELECT * FROM projects WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
        )
        .bind(workspaceId)
        .all<Record<string, unknown>>();
      if (!projectsRes.success) throw new Error(projectsRes.error ?? "projects");
      const plist = projectsRes.results ?? [];
      if (plist.length === 0) return json({ data: [] });
      const pids = plist.map((p) => p.id as string);
      const ph = pids.map(() => "?").join(", ");
      const milestonesRes = await db
        .prepare(`SELECT * FROM milestones WHERE project_id IN (${ph}) ORDER BY sort_order ASC`)
        .bind(...pids)
        .all<Record<string, unknown>>();
      if (!milestonesRes.success) throw new Error(milestonesRes.error ?? "milestones");
      const tasksRes = await db
        .prepare(
          `SELECT t.id, t.title, t.project_id, t.milestone_id, t.priority, t.assignee_user_id, t.due_date, t.completed_at, t.column_id, c.name as column_name, c.slug as column_slug
           FROM tasks t INNER JOIN task_columns c ON c.id = t.column_id
           WHERE t.deleted_at IS NULL AND t.project_id IN (${ph})`,
        )
        .bind(...pids)
        .all<Record<string, unknown>>();
      if (!tasksRes.success) throw new Error(tasksRes.error ?? "tasks");
      const refsRes = await db
        .prepare(
          `SELECT entity_type, entity_id, external_ref
           FROM entity_external_refs
           WHERE workspace_id = ?
             AND (
               (entity_type = 'project' AND entity_id IN (${ph}))
               OR (entity_type = 'milestone' AND entity_id IN (SELECT id FROM milestones WHERE project_id IN (${ph})))
               OR (entity_type = 'task' AND entity_id IN (SELECT id FROM tasks WHERE deleted_at IS NULL AND project_id IN (${ph})))
             )`,
        )
        .bind(workspaceId, ...pids, ...pids, ...pids)
        .all<{ entity_type: string; entity_id: string; external_ref: string }>();
      if (!refsRes.success) throw new Error(refsRes.error ?? "external refs");
      const refMap = new Map(
        (refsRes.results ?? []).map((r) => [`${r.entity_type}:${r.entity_id}`, r.external_ref]),
      );
      const milestonesByProject = new Map<string, Record<string, unknown>[]>();
      for (const m of milestonesRes.results ?? []) {
        const pid = m.project_id as string;
        const list = milestonesByProject.get(pid) ?? [];
        list.push(m);
        milestonesByProject.set(pid, list);
      }
      const tasksByMilestone = new Map<string, unknown[]>();
      const tasksByProject = new Map<string, unknown[]>();
      for (const t of tasksRes.results ?? []) {
        const task = {
          id: t.id,
          externalRef: refMap.get(`task:${String(t.id)}`) ?? null,
          title: t.title,
          projectId: t.project_id,
          milestoneId: t.milestone_id,
          priority: t.priority,
          assigneeUserId: t.assignee_user_id,
          dueDate: t.due_date,
          completedAt: t.completed_at,
          columnId: t.column_id,
          columnName: t.column_name,
          columnSlug: t.column_slug,
        };
        if (t.milestone_id) {
          const list = tasksByMilestone.get(t.milestone_id as string) ?? [];
          list.push(task);
          tasksByMilestone.set(t.milestone_id as string, list);
        }
        if (t.project_id) {
          const list = tasksByProject.get(t.project_id as string) ?? [];
          list.push(task);
          tasksByProject.set(t.project_id as string, list);
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const progCache = new Map<string, ProjectEstimateSummary>();
      await Promise.all(
        pids.map(async (pid) => {
          const m = await milestoneTaskProgressPercentByProject(db, pid);
          progCache.set(pid, m);
        }),
      );
      const data = plist.map((raw) => {
        const id = raw.id as string;
        const projMilestones = milestonesByProject.get(id) ?? [];
        const projTasks = (tasksByProject.get(id) ?? []) as Array<{
          completedAt: unknown;
          columnSlug?: unknown;
        }>;
        const doneTasks = projTasks.filter((x) => {
          const doneByCompletion = Boolean(x.completedAt);
          const doneByColumn = String(x.columnSlug ?? "").toLowerCase() === "done";
          return doneByCompletion || doneByColumn;
        }).length;
        const progress = progCache.get(id);
        const progressPercent =
          progress && progress.weightTotal > 0
            ? Math.round((progress.weightCompleted / progress.weightTotal) * 100)
            : 0;
        return {
          ...mapProjectRowCamel(raw),
          progressPercent,
          estimateSummary: progress
            ? { unit: progress.unit, total: progress.total, completed: progress.completed }
            : null,
          healthInsight: healthInsightForProjectRow({ ...raw, progress_percent: progressPercent }),
          workflowStatusInsight: workflowStatusForProjectRow({
            ...raw,
            progress_percent_effective: progressPercent,
          }),
          milestones: projMilestones.map((milestone) => {
            const mid = milestone.id as string;
            const mTasks = (tasksByMilestone.get(mid) ?? []) as {
              completedAt: unknown;
            }[];
            const mDone = mTasks.filter((t) => {
              const doneByCompletion = Boolean(t.completedAt);
              const doneByColumn =
                String((t as { columnSlug?: unknown }).columnSlug ?? "").toLowerCase() === "done";
              return doneByCompletion || doneByColumn;
            }).length;
            const pct = progress?.milestoneProgressPercent.get(mid) ?? 0;
            return {
              ...mapMilestoneCamel(milestone),
              externalRef: refMap.get(`milestone:${mid}`) ?? null,
              tasks: mTasks,
              taskStats: { total: mTasks.length, done: mDone },
              taskProgressPercent: pct,
              healthInsight: healthInsightForMilestoneRow(milestone, raw, pct),
              workflowStatusInsight: workflowStatusForMilestoneRow(milestone, raw, pct),
            };
          }),
          externalRef: refMap.get(`project:${id}`) ?? null,
          projectStats: {
            totalMilestones: projMilestones.length,
            completedMilestones: projMilestones.filter((m) => m.status === "completed").length,
            totalTasks: projTasks.length,
            doneTasks,
            overdueMilestones: projMilestones.filter(
              (m) => m.due_date && (m.due_date as string) < today && m.status !== "completed",
            ).length,
          },
        };
      });
      return json({ data });
    } catch (e) {
      const message = e instanceof Error ? e.message : "hierarchy failed";
      return json({ error: { message } }, 500);
    }
  }

  // --- Single project + milestones + okr links + hub (prefix /v1/projects/) ---
  if (pathname.startsWith("/v1/projects/") && pathname !== "/v1/projects/hierarchy") {
    const err = needWs();
    if (err) return err;
    const tail = pathname.slice("/v1/projects/".length);
    const segments = tail.split("/").filter(Boolean);

    if (segments.length === 1) {
      const idOrSlug = segments[0]!;
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, idOrSlug);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      if (method === "GET") {
        const row = await db
          .prepare(
            `SELECT * FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
          )
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        if (!row.success || !row.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        const pr = row.results[0];
        return json({
          data: {
            ...mapProjectRowCamel(pr),
            healthInsight: healthInsightForProjectRow(pr),
            workflowStatusInsight: workflowStatusForProjectRow(pr),
          },
        });
      }
      if (method === "PATCH") {
        const aerr = needActor();
        if (aerr) return aerr;
        const input = parseJson<Record<string, unknown>>(body);
        const curRes = await db
          .prepare(
            `SELECT * FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
          )
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        if (!curRes.success || !curRes.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        const cur = curRes.results[0];
        const prevStatus = String(cur.status ?? "planned");
        const nextStatus = input.status !== undefined ? String(input.status) : prevStatus;
        if (!PROJECT_DB_STATUSES.has(nextStatus)) {
          return json({ error: { message: "status is invalid" } }, 400);
        }
        const nextStartDate = input.startDate !== undefined ? input.startDate : cur.start_date;
        const nextTargetDate = input.targetDate !== undefined ? input.targetDate : cur.target_date;
        if (
          input.estimationUnit !== undefined &&
          input.estimationUnit !== "hours" &&
          input.estimationUnit !== "story_points"
        ) {
          return json({ error: { message: "estimationUnit is invalid" } }, 400);
        }
        const dateError = validateProjectDateRange(nextStartDate, nextTargetDate);
        if (dateError) return json({ error: { message: dateError } }, 400);
        const nextCycleId =
          input.cycleId !== undefined
            ? (input.cycleId as string | null)
            : (cur.cycle_id as string | null);
        if (nextCycleId) {
          const cycleCheck = await db
            .prepare(
              `SELECT id FROM okr_cycles WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
            )
            .bind(nextCycleId, workspaceId)
            .all<{ id: string }>();
          if (!cycleCheck.success || !cycleCheck.results?.[0]) {
            return json({ error: { message: "cycleId is invalid for this workspace" } }, 400);
          }
        }
        const nowIso = new Date().toISOString();
        const sets: string[] = [];
        const args: unknown[] = [];
        const map: [string, string][] = [
          ["title", "title"],
          ["summary", "summary"],
          ["status", "status"],
          ["healthStatus", "health_status"],
          ["priority", "priority"],
          ["ownerUserId", "owner_user_id"],
          ["cycleId", "cycle_id"],
          ["startDate", "start_date"],
          ["targetDate", "target_date"],
          ["estimationUnit", "estimation_unit"],
        ];
        for (const [js, col] of map) {
          if (input[js] !== undefined) {
            sets.push(`${col} = ?`);
            args.push(input[js] ?? null);
          }
        }
        if (nextStatus === "completed" && prevStatus !== "completed") {
          const w = resolveProjectWindow(cur);
          const snap = buildCompletionSnapshotFromPreCompleteRow({
            kind: "project",
            previousStatus: prevStatus,
            progressPercent: Number(cur.progress_percent ?? 0),
            windowStart: w.start,
            windowEnd: w.end,
            dateSourcePt: w.dateSourcePt,
            existingSnapshot: (cur.health_snapshot_json as string | null) ?? null,
          });
          if (snap) {
            sets.push("health_snapshot_json = ?", "completed_at = ?");
            args.push(snap, cur.completed_at ? cur.completed_at : nowIso);
          } else if (!cur.completed_at) {
            sets.push("completed_at = ?");
            args.push(nowIso);
          }
        } else if (nextStatus !== "completed" && prevStatus === "completed") {
          sets.push("health_snapshot_json = ?", "completed_at = ?");
          args.push(null, null);
        }
        sets.push("updated_by = ?", "updated_at = ?");
        args.push(actorUserId, nowIso, projectId, workspaceId);
        const q = `UPDATE projects SET ${sets.join(", ")} WHERE id = ? AND workspace_id = ?`;
        const up = await db
          .prepare(q)
          .bind(...args)
          .all();
        if (!up.success) return json({ error: { message: up.error } }, 400);
        const again = await db
          .prepare(`SELECT * FROM projects WHERE id = ?`)
          .bind(projectId)
          .all<Record<string, unknown>>();
        const pr2 = again.results?.[0] ?? {};
        return json({
          data: {
            ...mapProjectRowCamel(pr2),
            healthInsight: healthInsightForProjectRow(pr2),
            workflowStatusInsight: workflowStatusForProjectRow(pr2),
          },
        });
      }
      if (method === "DELETE") {
        const now = new Date().toISOString();
        const up = await db
          .prepare(
            `UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
          )
          .bind(now, now, projectId, workspaceId)
          .all();
        if (!up.success) return json({ error: { message: up.error } }, 400);
        return json({ data: null });
      }
    }

    // /v1/projects/:id/hub
    if (segments.length === 2 && segments[1] === "hub") {
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, segments[0]!);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      if (method !== "GET") return null;
      const proj = await db
        .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`)
        .bind(projectId, workspaceId)
        .all<Record<string, unknown>>();
      if (!proj.success || !proj.results?.[0])
        return json({ error: { message: "Not found" } }, 404);
      const projectRaw = proj.results[0];
      const [ms, linkRows, taskCount, mileProg] = await Promise.all([
        db
          .prepare(`SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order ASC`)
          .bind(projectId)
          .all<Record<string, unknown>>(),
        db
          .prepare(
            `SELECT okr_objective_id FROM pm_project_okr_objective_links WHERE project_id = ? ORDER BY created_at ASC`,
          )
          .bind(projectId)
          .all<{ okr_objective_id: string }>(),
        db
          .prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND deleted_at IS NULL`)
          .bind(projectId)
          .all<{ c: number }>(),
        milestoneTaskProgressPercentByProject(db, projectId),
      ]);
      const progressPercent =
        mileProg.weightTotal > 0
          ? Math.round((mileProg.weightCompleted / mileProg.weightTotal) * 100)
          : 0;
      const projectDto = {
        ...mapProjectRowCamel(projectRaw),
        progressPercent,
        estimateSummary: {
          unit: mileProg.unit,
          total: mileProg.total,
          completed: mileProg.completed,
        },
        healthInsight: healthInsightForProjectRow({
          ...projectRaw,
          progress_percent: progressPercent,
        }),
        workflowStatusInsight: workflowStatusForProjectRow({
          ...projectRaw,
          progress_percent_effective: progressPercent,
        }),
      };
      const objIdsOrdered = (linkRows.results ?? [])
        .map((r) => r.okr_objective_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      let objectivesWithKr: Array<Record<string, unknown>> = [];
      if (objIdsOrdered.length > 0) {
        const ph = objIdsOrdered.map(() => "?").join(", ");
        const objsRes = await db
          .prepare(
            `SELECT * FROM okr_objectives WHERE id IN (${ph}) AND workspace_id = ? AND deleted_at IS NULL`,
          )
          .bind(...objIdsOrdered, workspaceId)
          .all<Record<string, unknown>>();
        const byId = new Map((objsRes.results ?? []).map((o) => [String(o.id), o]));
        const objList = objIdsOrdered
          .map((id) => byId.get(id))
          .filter((o): o is Record<string, unknown> => o != null);
        const krRes = await db
          .prepare(
            `SELECT * FROM okr_key_results WHERE objective_id IN (${ph}) AND workspace_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC`,
          )
          .bind(...objIdsOrdered, workspaceId)
          .all<Record<string, unknown>>();
        const krs = krRes.results ?? [];
        const krByObj = new Map<string, Record<string, unknown>[]>();
        for (const kr of krs) {
          const oid = kr.objective_id as string;
          const list = krByObj.get(oid) ?? [];
          list.push(kr);
          krByObj.set(oid, list);
        }
        objectivesWithKr = objList.map((o) => ({
          ...mapOkrObjectiveLinkedToProjectHub(o, projectId),
          keyResults: (krByObj.get(String(o.id)) ?? []).map(mapProjectKrCamel),
        }));
      }
      const tasksRes = await db
        .prepare(
          `SELECT * FROM tasks WHERE workspace_id = ? AND project_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 12`,
        )
        .bind(workspaceId, projectId)
        .all<Record<string, unknown>>();
      const milestones = (ms.results ?? []).map((mm) => {
        const pct = mileProg.milestoneProgressPercent.get(String(mm.id)) ?? 0;
        return {
          ...mapMilestoneCamel(mm),
          taskProgressPercent: pct,
          healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
          workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw, pct),
        };
      });
      const projectRefMap = await getExternalRefMap(db, workspaceId, "project", [projectId]);
      const milestoneRefMap = await getExternalRefMap(
        db,
        workspaceId,
        "milestone",
        milestones.map((m) => String(m.id)),
      );
      const taskRefMap = await getExternalRefMap(
        db,
        workspaceId,
        "task",
        (tasksRes.results ?? []).map((t) => String(t.id)),
      );
      const links = await db
        .prepare(
          `SELECT id, source_type, source_id, target_type, target_id FROM relation_links
           WHERE (target_type = 'project' AND target_id = ?) OR (source_type = 'project' AND source_id = ?)`,
        )
        .bind(projectId, projectId)
        .all<Record<string, unknown>>();
      const pageIds = new Set<string>();
      for (const l of links.results ?? []) {
        if (l.target_type === "project" && l.target_id === projectId && l.source_type === "page")
          pageIds.add(l.source_id as string);
        if (l.source_type === "project" && l.source_id === projectId && l.target_type === "page")
          pageIds.add(l.target_id as string);
      }
      let linkedPages: { id: string; title: string; isFolder: boolean }[] = [];
      if (pageIds.size) {
        const ph = [...pageIds].map(() => "?").join(", ");
        const pr = await db
          .prepare(
            `SELECT id, title, is_folder FROM pages WHERE id IN (${ph}) AND workspace_id = ? AND deleted_at IS NULL`,
          )
          .bind(...[...pageIds], workspaceId)
          .all<{ id: string; title: string; is_folder: number }>();
        linkedPages = (pr.results ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          isFolder: Boolean(p.is_folder),
        }));
      }
      const openMilestones = milestones.filter((m) => m.status !== "completed").length;
      return json({
        data: {
          project: {
            ...projectDto,
            externalRef: projectRefMap.get(projectId) ?? null,
          },
          milestones: milestones.map((m) => ({
            ...m,
            externalRef: milestoneRefMap.get(String(m.id)) ?? null,
          })),
          objectives: objectivesWithKr,
          stats: {
            taskCount: Number((taskCount.results?.[0] as { c: number })?.c ?? 0),
            milestoneCount: milestones.length,
            openMilestones,
            estimationUnit: mileProg.unit,
            totalEstimate: mileProg.total,
            completedEstimate: mileProg.completed,
          },
          linkedPages,
          recentTasks: (tasksRes.results ?? []).map((t) => ({
            ...mapTaskCamel(t),
            externalRef: taskRefMap.get(String(t.id)) ?? null,
          })),
        },
      });
    }

    // milestones
    if (segments.length === 2 && segments[1] === "milestones") {
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, segments[0]!);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      const ok = await db
        .prepare(`SELECT id FROM projects WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`)
        .bind(projectId, workspaceId)
        .all<{ id: string }>();
      if (!ok.success || !ok.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      if (method === "GET") {
        const rows = await db
          .prepare(`SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order ASC`)
          .bind(projectId)
          .all<Record<string, unknown>>();
        const projFull = await db
          .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ?`)
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        const projectRaw = projFull.results?.[0] ?? {};
        const progMap = await milestoneTaskProgressPercentByProject(db, projectId);
        return json({
          data: (rows.results ?? []).map((mm) => {
            const pct = progMap.milestoneProgressPercent.get(String(mm.id)) ?? 0;
            return {
              ...mapMilestoneCamel(mm),
              taskProgressPercent: pct,
              healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
              workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw, pct),
            };
          }),
        });
      }
      if (method === "POST") {
        const aerr = needActor();
        if (aerr) return aerr;
        const input = parseJson<Record<string, unknown>>(body);
        const projFull = await db
          .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ?`)
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        const projectRaw = projFull.results?.[0] ?? {};
        const dueDate = input.dueDate ?? null;
        const dueError = validateMilestoneDueWithinProjectRange(
          dueDate,
          projectRaw.start_date,
          projectRaw.target_date,
        );
        if (dueError) return json({ error: { message: dueError } }, 400);
        const id = createId();
        const now = new Date().toISOString();
        const status = String(input.status ?? "pending");
        if (!MILESTONE_DB_STATUSES.has(status)) {
          return json({ error: { message: "status is invalid" } }, 400);
        }
        const w = resolveMilestoneWindow(
          { due_date: dueDate as string | null },
          {
            start_date: projectRaw.start_date as string | null,
            target_date: projectRaw.target_date as string | null,
            title: projectRaw.title as string | null,
          },
        );
        let healthSnap: string | null = null;
        let completedAt: string | null = null;
        if (status === "completed") {
          const snap = buildCompletionSnapshotFromPreCompleteRow({
            kind: "milestone",
            previousStatus: "pending",
            progressPercent: 100,
            windowStart: w.start,
            windowEnd: w.end,
            dateSourcePt: w.dateSourcePt,
            existingSnapshot: null,
          });
          healthSnap = snap;
          completedAt = now;
        }
        const ins = await db
          .prepare(
            `INSERT INTO milestones (id, project_id, title, description, status, priority, due_date, completed_at, health_snapshot_json, owner_user_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            projectId,
            input.title,
            input.description ?? null,
            status,
            input.priority ?? "medium",
            dueDate,
            completedAt,
            healthSnap,
            input.ownerUserId ?? null,
            input.sortOrder ?? 0,
            now,
            now,
          )
          .all();
        if (!ins.success) return json({ error: { message: ins.error } }, 400);
        const row = await db
          .prepare(`SELECT * FROM milestones WHERE id = ?`)
          .bind(id)
          .all<Record<string, unknown>>();
        const mm = row.results?.[0] ?? {};
        const progMap = await milestoneTaskProgressPercentByProject(db, projectId);
        const pct = progMap.milestoneProgressPercent.get(String(id)) ?? 0;
        const externalRef = await ensureExternalRef(db, {
          workspaceId,
          entityType: "milestone",
          entityId: id,
          suggestedRef: (input.externalRef as string | undefined) ?? null,
        });
        return json(
          {
            data: {
              ...mapMilestoneCamel(mm),
              taskProgressPercent: pct,
              healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
              workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw, pct),
              externalRef,
            },
          },
          201,
        );
      }
    }

    // /v1/projects/:projectId/milestones/:milestoneId — GET, PATCH, DELETE
    if (segments.length === 3 && segments[1] === "milestones") {
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, segments[0]!);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      const milestoneId = segments[2]!;
      const pcheck = await db
        .prepare(`SELECT id FROM projects WHERE id = ? AND workspace_id = ?`)
        .bind(projectId, workspaceId)
        .all<{ id: string }>();
      if (!pcheck.success || !pcheck.results?.[0])
        return json({ error: { message: "Not found" } }, 404);
      const mcheck = await db
        .prepare(`SELECT id FROM milestones WHERE id = ? AND project_id = ?`)
        .bind(milestoneId, projectId)
        .all<{ id: string }>();
      if (!mcheck.success || !mcheck.results?.[0])
        return json({ error: { message: "Not found" } }, 404);
      if (method === "GET") {
        const row = await db
          .prepare(`SELECT * FROM milestones WHERE id = ? AND project_id = ?`)
          .bind(milestoneId, projectId)
          .all<Record<string, unknown>>();
        if (!row.success || !row.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        const mm = row.results[0];
        const projFull = await db
          .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ?`)
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        const projectRaw = projFull.results?.[0] ?? {};
        const progMap = await milestoneTaskProgressPercentByProject(db, projectId);
        const pct = progMap.milestoneProgressPercent.get(String(milestoneId)) ?? 0;
        const mref = await getExternalRefMap(db, workspaceId, "milestone", [milestoneId]);
        return json({
          data: {
            ...mapMilestoneCamel(mm),
            taskProgressPercent: pct,
            healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
            workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw, pct),
            externalRef: mref.get(milestoneId) ?? null,
          },
        });
      }
      if (method === "PATCH") {
        const aerr = needActor();
        if (aerr) return aerr;
        const input = parseJson<Record<string, unknown>>(body);
        const curRes = await db
          .prepare(`SELECT * FROM milestones WHERE id = ? AND project_id = ?`)
          .bind(milestoneId, projectId)
          .all<Record<string, unknown>>();
        if (!curRes.success || !curRes.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        const cur = curRes.results[0];
        const projFull = await db
          .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ?`)
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        const projectRaw = projFull.results?.[0] ?? {};
        const prevStatus = String(cur.status ?? "pending");
        const nextStatus = input.status !== undefined ? String(input.status) : prevStatus;
        if (!MILESTONE_DB_STATUSES.has(nextStatus)) {
          return json({ error: { message: "status is invalid" } }, 400);
        }
        const nextDueDate = input.dueDate !== undefined ? input.dueDate : cur.due_date;
        const dueError = validateMilestoneDueWithinProjectRange(
          nextDueDate,
          projectRaw.start_date,
          projectRaw.target_date,
        );
        if (dueError) return json({ error: { message: dueError } }, 400);
        const nowIso = new Date().toISOString();
        const sets: string[] = [];
        const args: unknown[] = [];
        const pairs: [string, string][] = [
          ["title", "title"],
          ["description", "description"],
          ["status", "status"],
          ["priority", "priority"],
          ["dueDate", "due_date"],
          ["ownerUserId", "owner_user_id"],
          ["sortOrder", "sort_order"],
        ];
        for (const [js, col] of pairs) {
          if (input[js] !== undefined) {
            sets.push(`${col} = ?`);
            args.push(input[js] ?? null);
          }
        }
        const mergedMilestone = {
          ...cur,
          status: nextStatus,
          due_date: input.dueDate !== undefined ? input.dueDate : cur.due_date,
        };
        const w = resolveMilestoneWindow(
          { due_date: mergedMilestone.due_date as string | null },
          {
            start_date: projectRaw.start_date as string | null,
            target_date: projectRaw.target_date as string | null,
            title: projectRaw.title as string | null,
          },
        );
        let healthSnap: string | null = (cur.health_snapshot_json as string | null) ?? null;
        let completedAt: string | null = (cur.completed_at as string | null) ?? null;
        if (nextStatus === "completed" && prevStatus !== "completed") {
          const snap = buildCompletionSnapshotFromPreCompleteRow({
            kind: "milestone",
            previousStatus: prevStatus,
            progressPercent: 100,
            windowStart: w.start,
            windowEnd: w.end,
            dateSourcePt: w.dateSourcePt,
            existingSnapshot: healthSnap,
          });
          if (snap) {
            healthSnap = snap;
            if (!completedAt) completedAt = nowIso;
          } else if (!completedAt) completedAt = nowIso;
        } else if (nextStatus !== "completed" && prevStatus === "completed") {
          healthSnap = null;
          completedAt = null;
        }
        sets.push("health_snapshot_json = ?", "completed_at = ?");
        args.push(healthSnap, completedAt);
        sets.push("updated_at = ?");
        args.push(nowIso, milestoneId);
        const up = await db
          .prepare(`UPDATE milestones SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...args)
          .all();
        if (!up.success) return json({ error: { message: up.error } }, 400);
        const row = await db
          .prepare(`SELECT * FROM milestones WHERE id = ?`)
          .bind(milestoneId)
          .all<Record<string, unknown>>();
        const mm2 = row.results?.[0] ?? {};
        const progMap = await milestoneTaskProgressPercentByProject(db, projectId);
        const pct = progMap.milestoneProgressPercent.get(String(milestoneId)) ?? 0;
        return json({
          data: {
            ...mapMilestoneCamel(mm2),
            taskProgressPercent: pct,
            healthInsight: healthInsightForMilestoneRow(mm2, projectRaw, pct),
            workflowStatusInsight: workflowStatusForMilestoneRow(mm2, projectRaw, pct),
          },
        });
      }
      if (method === "DELETE") {
        const del = await db.prepare(`DELETE FROM milestones WHERE id = ?`).bind(milestoneId).all();
        if (!del.success) return json({ error: { message: del.error } }, 400);
        return json({ data: null });
      }
    }

    // okr-links
    if (segments.length === 2 && segments[1] === "okr-links") {
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, segments[0]!);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      if (method === "GET") {
        const objLinks = await db
          .prepare(
            `SELECT l.id, l.project_id, l.okr_objective_id, l.created_at, o.title as obj_title, o.slug as obj_slug, o.status as obj_status
             FROM pm_project_okr_objective_links l
             INNER JOIN okr_objectives o ON o.id = l.okr_objective_id AND o.deleted_at IS NULL
             WHERE l.project_id = ?`,
          )
          .bind(projectId)
          .all<Record<string, unknown>>();
        const krLinks = await db
          .prepare(
            `SELECT l.id, l.project_id, l.okr_kr_id, l.relation_type, l.created_at,
                    k.title as kr_title, k.slug as kr_slug, k.status as kr_status, k.objective_id as kr_objective_id
             FROM pm_project_okr_kr_links l
             INNER JOIN okr_key_results k ON k.id = l.okr_kr_id AND k.deleted_at IS NULL
             WHERE l.project_id = ?`,
          )
          .bind(projectId)
          .all<Record<string, unknown>>();
        const objectiveLinks = (objLinks.results ?? []).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          okrObjectiveId: r.okr_objective_id,
          createdAt: r.created_at,
          objective: {
            id: r.okr_objective_id,
            title: r.obj_title,
            slug: r.obj_slug,
            status: r.obj_status,
          },
        }));
        const krLinksOut = (krLinks.results ?? []).map((r) => ({
          id: r.id,
          projectId: r.project_id,
          okrKrId: r.okr_kr_id,
          relationType: r.relation_type,
          createdAt: r.created_at,
          keyResult: {
            id: r.okr_kr_id,
            title: r.kr_title,
            slug: r.kr_slug,
            status: r.kr_status,
            objectiveId: r.kr_objective_id,
          },
        }));
        return json({ data: { objectiveLinks, krLinks: krLinksOut } });
      }
      if (method === "POST") {
        const aerr = needActor();
        if (aerr) return aerr;
        const input = parseJson<{
          type?: string;
          okrObjectiveId?: string;
          okrKrId?: string;
          relationType?: string;
        }>(body);
        const isObj = input.type === "objective" || Boolean(input.okrObjectiveId);
        if (isObj && input.okrObjectiveId) {
          const now = new Date().toISOString();
          const existing = await db
            .prepare(
              `SELECT id, project_id, okr_objective_id, created_at FROM pm_project_okr_objective_links WHERE project_id = ? AND okr_objective_id = ?`,
            )
            .bind(projectId, input.okrObjectiveId)
            .all<Record<string, unknown>>();
          if (existing.results?.[0]) {
            const r = existing.results[0];
            return json(
              {
                data: {
                  id: r.id,
                  projectId: r.project_id,
                  okrObjectiveId: r.okr_objective_id,
                  createdAt: r.created_at,
                },
              },
              201,
            );
          }
          const lid = createId();
          const ins = await db
            .prepare(
              `INSERT INTO pm_project_okr_objective_links (id, project_id, okr_objective_id, created_at) VALUES (?, ?, ?, ?)`,
            )
            .bind(lid, projectId, input.okrObjectiveId, now)
            .all();
          if (!ins.success) return json({ error: { message: ins.error } }, 400);
          return json(
            {
              data: {
                id: lid,
                projectId,
                okrObjectiveId: input.okrObjectiveId,
                createdAt: now,
              },
            },
            201,
          );
        }
        if (input.okrKrId) {
          const now = new Date().toISOString();
          const rt = input.relationType ?? "contributes_to";
          const existing = await db
            .prepare(
              `SELECT id, project_id, okr_kr_id, relation_type, created_at FROM pm_project_okr_kr_links WHERE project_id = ? AND okr_kr_id = ?`,
            )
            .bind(projectId, input.okrKrId)
            .all<Record<string, unknown>>();
          if (existing.results?.[0]) {
            const r = existing.results[0];
            return json(
              {
                data: {
                  id: r.id,
                  projectId: r.project_id,
                  okrKrId: r.okr_kr_id,
                  relationType: r.relation_type,
                  createdAt: r.created_at,
                },
              },
              201,
            );
          }
          const lid = createId();
          const ins = await db
            .prepare(
              `INSERT INTO pm_project_okr_kr_links (id, project_id, okr_kr_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)`,
            )
            .bind(lid, projectId, input.okrKrId, rt, now)
            .all();
          if (!ins.success) return json({ error: { message: ins.error } }, 400);
          return json(
            {
              data: {
                id: lid,
                projectId,
                okrKrId: input.okrKrId,
                relationType: rt,
                createdAt: now,
              },
            },
            201,
          );
        }
        return json({ error: { message: "okrObjectiveId or okrKrId required" } }, 400);
      }
    }

    if (segments.length === 4 && segments[1] === "okr-links") {
      const projectId = await resolveProjectIdByIdOrSlug(db, workspaceId, segments[0]!);
      if (!projectId) return json({ error: { message: "Not found" } }, 404);
      const kind = segments[2];
      const linkId = segments[3]!;
      if (method !== "DELETE") return null;
      if (kind === "objectives") {
        const del = await db
          .prepare(`DELETE FROM pm_project_okr_objective_links WHERE id = ? AND project_id = ?`)
          .bind(linkId, projectId)
          .all();
        if (!del.success) return json({ error: { message: del.error } }, 400);
        return json({ data: null });
      }
      if (kind === "key-results") {
        const del = await db
          .prepare(`DELETE FROM pm_project_okr_kr_links WHERE id = ? AND project_id = ?`)
          .bind(linkId, projectId)
          .all();
        if (!del.success) return json({ error: { message: del.error } }, 400);
        return json({ data: null });
      }
    }
  }

  return null;
}

function mapProjectRowCamel(raw: Record<string, unknown>) {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    title: raw.title,
    slug: raw.slug,
    summary: raw.summary,
    descriptionJson: raw.description_json ? safeJsonParse(raw.description_json as string) : null,
    descriptionText: raw.description_text,
    status: raw.status,
    healthStatus: raw.health_status,
    healthSnapshotJson: (raw.health_snapshot_json as string | null | undefined) ?? null,
    priority: raw.priority,
    progressPercent: Number(raw.progress_percent ?? 0),
    estimationUnit: (raw.estimation_unit as string | null | undefined) ?? "hours",
    ownerUserId: raw.owner_user_id,
    cycleId: (raw.cycle_id as string | null | undefined) ?? null,
    startDate: raw.start_date,
    targetDate: raw.target_date,
    completedAt: raw.completed_at,
    createdBy: raw.created_by,
    updatedBy: raw.updated_by,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    archivedAt: raw.archived_at,
    deletedAt: raw.deleted_at,
  };
}

/**
 * Project hub lists OKRs linked via `pm_project_okr_objective_links` (legacy
 * `project_objectives` / `project_key_results` were removed in migration 0007).
 */
function mapOkrObjectiveLinkedToProjectHub(o: Record<string, unknown>, projectId: string) {
  return {
    id: o.id,
    workspaceId: o.workspace_id,
    projectId,
    title: o.title,
    description: (o.description_text as string | null | undefined) ?? null,
    ownerUserId: o.owner_user_id ?? null,
    status: o.status,
    createdBy: o.created_by,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

function mapMilestoneCamel(m: Record<string, unknown>) {
  return {
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    description: m.description,
    status: m.status,
    priority: m.priority,
    dueDate: m.due_date,
    completedAt: m.completed_at,
    healthSnapshotJson: (m.health_snapshot_json as string | null | undefined) ?? null,
    ownerUserId: m.owner_user_id,
    sortOrder: m.sort_order,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

function mapProjectKrCamel(k: Record<string, unknown>) {
  return {
    id: k.id,
    objectiveId: k.objective_id,
    title: k.title,
    metricType: k.metric_type,
    startValue: Number(k.start_value ?? 0),
    targetValue: Number(k.target_value ?? 0),
    currentValue: Number(k.current_value ?? 0),
    unit: k.unit,
    status: k.status,
    confidence: k.confidence,
    createdAt: k.created_at,
    updatedAt: k.updated_at,
  };
}

function mapTaskCamel(t: Record<string, unknown>) {
  return {
    id: t.id,
    workspaceId: t.workspace_id,
    projectId: t.project_id,
    milestoneId: t.milestone_id,
    columnId: t.column_id,
    title: t.title,
    slug: t.slug,
    descriptionJson: t.description_json ? safeJsonParse(t.description_json as string) : null,
    descriptionText: t.description_text,
    priority: t.priority,
    assigneeUserId: t.assignee_user_id,
    reporterUserId: t.reporter_user_id,
    dueDate: t.due_date,
    startDate: t.start_date,
    completedAt: t.completed_at,
    estimatedHours: (t.estimated_hours as number | null | undefined) ?? null,
    estimatedPoints: (t.estimated_points as number | null | undefined) ?? null,
    sortOrder: t.sort_order,
    createdBy: t.created_by,
    updatedBy: t.updated_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    archivedAt: t.archived_at,
    deletedAt: t.deleted_at,
  };
}
