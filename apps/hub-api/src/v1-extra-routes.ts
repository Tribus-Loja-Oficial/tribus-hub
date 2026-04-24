/**
 * Additional authenticated /v1 routes (projects detail, PM, OKR writes, search, assets).
 * Kept separate from index.ts to limit file size.
 */
import { ensureExternalRef } from "./external-refs";
import {
  buildCompletionSnapshotFromPreCompleteRow,
  computePaceHealth,
  resolveMilestoneWindow,
  resolveProjectWindow,
} from "./pace-health";
import { workflowStatusForMilestoneRow, workflowStatusForProjectRow } from "./pace-workflow-status";

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

async function milestoneTaskProgressPercentByProject(
  db: D1DatabaseLike,
  projectId: string,
): Promise<Map<string, number>> {
  const r = await db
    .prepare(
      `SELECT milestone_id,
              COUNT(*) as total,
              SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as done
       FROM tasks
       WHERE project_id = ? AND deleted_at IS NULL AND milestone_id IS NOT NULL
       GROUP BY milestone_id`,
    )
    .bind(projectId)
    .all<{ milestone_id: string; total: number; done: number }>();
  const m = new Map<string, number>();
  for (const row of r.results ?? []) {
    const t = Number(row.total ?? 0);
    const d = Number(row.done ?? 0);
    m.set(String(row.milestone_id), t > 0 ? Math.round((d / t) * 100) : 0);
  }
  return m;
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
    try {
      const proj = await db
        .prepare(
          `SELECT id, status, health_status, target_date FROM projects WHERE workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(workspaceId)
        .all<{
          id: string;
          status: string;
          health_status: string | null;
          target_date: string | null;
        }>();
      if (!proj.success) throw new Error(proj.error ?? "projects");
      const allProjects = proj.results ?? [];
      const active = allProjects.filter((p) => p.status === "active");
      const today = new Date().toISOString().slice(0, 10);
      const ms = await db
        .prepare(
          `SELECT m.id, m.status, m.due_date, m.project_id FROM milestones m
           INNER JOIN projects p ON p.id = m.project_id
           WHERE p.workspace_id = ?`,
        )
        .bind(workspaceId)
        .all<{ id: string; status: string; due_date: string | null; project_id: string }>();
      if (!ms.success) throw new Error(ms.error ?? "milestones");
      const overdueMilestones = (ms.results ?? []).filter(
        (m) => m.due_date && m.due_date < today && m.status !== "completed",
      ).length;
      return json({
        data: {
          totalProjects: allProjects.length,
          activeProjects: active.length,
          atRisk: active.filter((p) => p.health_status === "at_risk").length,
          blocked: active.filter((p) => p.health_status === "blocked").length,
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
    try {
      const proj = await db
        .prepare(
          `SELECT id, title, start_date, target_date, status FROM projects WHERE workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(workspaceId)
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
          const workflowStatusInsight = workflowStatusForMilestoneRow(raw, projectRaw);
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
    try {
      const today = new Date().toISOString().slice(0, 10);
      const row = await db
        .prepare(
          `SELECT COUNT(*) as c FROM tasks WHERE workspace_id = ? AND deleted_at IS NULL AND completed_at IS NULL AND due_date IS NOT NULL AND due_date <= ?`,
        )
        .bind(workspaceId, today)
        .all<{ c: number }>();
      if (!row.success) throw new Error(row.error);
      return json({ data: { count: Number(row.results?.[0]?.c ?? 0) } });
    } catch (e) {
      const message = e instanceof Error ? e.message : "overdue count failed";
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
      const progCache = new Map<string, Map<string, number>>();
      await Promise.all(
        pids.map(async (pid) => {
          const m = await milestoneTaskProgressPercentByProject(db, pid);
          progCache.set(pid, m);
        }),
      );
      const data = plist.map((raw) => {
        const id = raw.id as string;
        const projMilestones = milestonesByProject.get(id) ?? [];
        const projTasks = tasksByProject.get(id) ?? [];
        const doneTasks = projTasks.filter((x: { completedAt: unknown }) => !!x.completedAt).length;
        const progMap = progCache.get(id) ?? new Map<string, number>();
        return {
          ...mapProjectRowCamel(raw),
          healthInsight: healthInsightForProjectRow(raw),
          workflowStatusInsight: workflowStatusForProjectRow(raw),
          milestones: projMilestones.map((milestone) => {
            const mid = milestone.id as string;
            const mTasks = (tasksByMilestone.get(mid) ?? []) as {
              completedAt: unknown;
            }[];
            const mDone = mTasks.filter((t) => !!t.completedAt).length;
            const pct = progMap.get(mid) ?? 0;
            return {
              ...mapMilestoneCamel(milestone),
              externalRef: refMap.get(`milestone:${mid}`) ?? null,
              tasks: mTasks,
              taskStats: { total: mTasks.length, done: mDone },
              taskProgressPercent: pct,
              healthInsight: healthInsightForMilestoneRow(milestone, raw, pct),
              workflowStatusInsight: workflowStatusForMilestoneRow(milestone, raw),
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

  // --- Assets ---
  if (pathname.startsWith("/v1/assets")) {
    const err = needWs();
    if (err) return err;
    const parts = pathname.split("/").filter(Boolean);
    // ["v1","assets"] or ["v1","assets", id] or ["v1","assets", id, "link"]
    if (method === "GET" && parts.length === 2) {
      const rows = await db
        .prepare(
          `SELECT id, workspace_id, storage_provider, bucket, object_key, original_filename, mime_type, extension, size_bytes, checksum_sha256, width, height, uploaded_by, created_at
           FROM assets WHERE workspace_id = ? ORDER BY created_at DESC`,
        )
        .bind(workspaceId)
        .all<Record<string, unknown>>();
      if (!rows.success) return json({ error: { message: rows.error } }, 500);
      return json({ data: (rows.results ?? []).map(mapAssetCamel) });
    }
    if (method === "POST" && parts.length === 2) {
      const aerr = needActor();
      if (aerr) return aerr;
      const input = parseJson<{
        bucket: string;
        objectKey: string;
        originalFilename: string;
        mimeType: string;
        extension: string;
        sizeBytes: number;
        checksumSha256?: string | null;
        width?: number | null;
        height?: number | null;
      }>(body);
      const id = createId();
      const now = new Date().toISOString();
      const ins = await db
        .prepare(
          `INSERT INTO assets (id, workspace_id, storage_provider, bucket, object_key, original_filename, mime_type, extension, size_bytes, checksum_sha256, width, height, uploaded_by, created_at)
           VALUES (?, ?, 'r2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          workspaceId,
          input.bucket,
          input.objectKey,
          input.originalFilename,
          input.mimeType,
          input.extension,
          input.sizeBytes,
          input.checksumSha256 ?? null,
          input.width ?? null,
          input.height ?? null,
          actorUserId,
          now,
        )
        .all();
      if (!ins.success) return json({ error: { message: ins.error ?? "insert failed" } }, 400);
      const row = await db
        .prepare(`SELECT * FROM assets WHERE id = ?`)
        .bind(id)
        .all<Record<string, unknown>>();
      return json({ data: mapAssetCamel(row.results?.[0] ?? {}) }, 201);
    }
    const assetId = parts[2];
    if (assetId && parts.length === 3) {
      if (method === "GET") {
        const row = await db
          .prepare(`SELECT * FROM assets WHERE id = ? AND workspace_id = ?`)
          .bind(assetId, workspaceId)
          .all<Record<string, unknown>>();
        if (!row.success || !row.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        return json({ data: mapAssetCamel(row.results[0]) });
      }
      if (method === "DELETE") {
        const row = await db
          .prepare(`SELECT id FROM assets WHERE id = ? AND workspace_id = ?`)
          .bind(assetId, workspaceId)
          .all<{ id: string }>();
        if (!row.success || !row.results?.[0])
          return json({ error: { message: "Not found" } }, 404);
        await db.prepare(`DELETE FROM asset_links WHERE asset_id = ?`).bind(assetId).all();
        const del = await db.prepare(`DELETE FROM assets WHERE id = ?`).bind(assetId).all();
        if (!del.success) return json({ error: { message: del.error } }, 400);
        return json({ data: null });
      }
    }
    if (method === "POST" && parts.length === 4 && parts[3] === "link" && assetId) {
      const input = parseJson<{ entityType: string; entityId: string; usageKind: string }>(body);
      const linkId = createId();
      const now = new Date().toISOString();
      const assetCheck = await db
        .prepare(`SELECT id FROM assets WHERE id = ? AND workspace_id = ?`)
        .bind(assetId, workspaceId)
        .all<{ id: string }>();
      if (!assetCheck.success || !assetCheck.results?.[0])
        return json({ error: { message: "Not found" } }, 404);
      const ins = await db
        .prepare(
          `INSERT INTO asset_links (id, asset_id, entity_type, entity_id, usage_kind, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          linkId,
          assetId,
          input.entityType,
          input.entityId,
          input.usageKind ?? "attachment",
          now,
        )
        .all();
      if (!ins.success) return json({ error: { message: ins.error ?? "link failed" } }, 400);
      return json(
        {
          data: {
            id: linkId,
            assetId,
            entityType: input.entityType,
            entityId: input.entityId,
            usageKind: input.usageKind ?? "attachment",
            createdAt: now,
          },
        },
        201,
      );
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
          ["startDate", "start_date"],
          ["targetDate", "target_date"],
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
      const projectDto = {
        ...mapProjectRowCamel(projectRaw),
        healthInsight: healthInsightForProjectRow(projectRaw),
        workflowStatusInsight: workflowStatusForProjectRow(projectRaw),
      };
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
      const progMap = mileProg;
      const milestones = (ms.results ?? []).map((mm) => {
        const pct = progMap.get(String(mm.id)) ?? 0;
        return {
          ...mapMilestoneCamel(mm),
          taskProgressPercent: pct,
          healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
          workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw),
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
      const al = await db
        .prepare(
          `SELECT al.usage_kind, a.id, a.original_filename, a.mime_type, a.size_bytes, a.created_at
           FROM asset_links al INNER JOIN assets a ON a.id = al.asset_id
           WHERE al.entity_type = 'project' AND al.entity_id = ? AND a.workspace_id = ?`,
        )
        .bind(projectId, workspaceId)
        .all<Record<string, unknown>>();
      const linkedAssets = (al.results ?? []).map((r) => ({
        id: r.id,
        filename: r.original_filename,
        mimeType: r.mime_type,
        sizeBytes: r.size_bytes,
        usageKind: r.usage_kind,
        createdAt: r.created_at,
      }));
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
          },
          linkedPages,
          linkedAssets,
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
            const pct = progMap.get(String(mm.id)) ?? 0;
            return {
              ...mapMilestoneCamel(mm),
              taskProgressPercent: pct,
              healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
              workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw),
            };
          }),
        });
      }
      if (method === "POST") {
        const aerr = needActor();
        if (aerr) return aerr;
        const input = parseJson<Record<string, unknown>>(body);
        const id = createId();
        const now = new Date().toISOString();
        const ins = await db
          .prepare(
            `INSERT INTO milestones (id, project_id, title, description, status, priority, due_date, completed_at, owner_user_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            projectId,
            input.title,
            input.description ?? null,
            input.status ?? "pending",
            input.priority ?? "medium",
            input.dueDate ?? null,
            null,
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
        const projFull = await db
          .prepare(`SELECT * FROM projects WHERE id = ? AND workspace_id = ?`)
          .bind(projectId, workspaceId)
          .all<Record<string, unknown>>();
        const projectRaw = projFull.results?.[0] ?? {};
        const progMap = await milestoneTaskProgressPercentByProject(db, projectId);
        const pct = progMap.get(String(id)) ?? 0;
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
              workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw),
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
        const pct = progMap.get(String(milestoneId)) ?? 0;
        const mref = await getExternalRefMap(db, workspaceId, "milestone", [milestoneId]);
        return json({
          data: {
            ...mapMilestoneCamel(mm),
            taskProgressPercent: pct,
            healthInsight: healthInsightForMilestoneRow(mm, projectRaw, pct),
            workflowStatusInsight: workflowStatusForMilestoneRow(mm, projectRaw),
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
        const nextStatus =
          input.status !== undefined ? String(input.status) : prevStatus;
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
        const pct = progMap.get(String(milestoneId)) ?? 0;
        return json({
          data: {
            ...mapMilestoneCamel(mm2),
            taskProgressPercent: pct,
            healthInsight: healthInsightForMilestoneRow(mm2, projectRaw, pct),
            workflowStatusInsight: workflowStatusForMilestoneRow(mm2, projectRaw),
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
    ownerUserId: raw.owner_user_id,
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
    sortOrder: t.sort_order,
    createdBy: t.created_by,
    updatedBy: t.updated_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    archivedAt: t.archived_at,
    deletedAt: t.deleted_at,
  };
}

function mapAssetCamel(a: Record<string, unknown>) {
  return {
    id: a.id,
    workspaceId: a.workspace_id,
    storageProvider: a.storage_provider,
    bucket: a.bucket,
    objectKey: a.object_key,
    originalFilename: a.original_filename,
    mimeType: a.mime_type,
    extension: a.extension,
    sizeBytes: a.size_bytes,
    checksumSha256: a.checksum_sha256,
    width: a.width,
    height: a.height,
    uploadedBy: a.uploaded_by,
    createdAt: a.created_at,
  };
}
