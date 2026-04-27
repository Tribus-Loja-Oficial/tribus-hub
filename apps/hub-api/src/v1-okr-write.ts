/**
 * OKR mutations, single-entity reads, KR updates, dashboard (D1).
 */

import type { HubExtraEnv } from "./v1-extra-routes";
import { calcKrProgress, calcObjectiveProgressFromKrs } from "./v1-extra-routes";
import { ensureExternalRef } from "./external-refs";
import {
  buildCompletionSnapshotFromPreCompleteRow,
  calcElapsedPercent,
  computePaceHealth,
  resolveOkrKrWindow,
  resolveOkrObjectiveWindow,
} from "./pace-health";
import { workflowStatusForOkrKr, workflowStatusForOkrObjective } from "./pace-workflow-status";
import {
  effectiveHealthSnapshotForOkrPace,
  effectiveOkrStatusForPaceAndWorkflow,
  resolveOkrStatusAfterProgress,
} from "./okr-pace-integrity";

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T>() => Promise<{ results?: T[]; success: boolean; error?: string }>;
};
type D1DatabaseLike = { prepare: (query: string) => D1PreparedStatement };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function createId() {
  return crypto.randomUUID().replace(/-/g, "");
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

function toIsoCivilDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v;
}

function validateKrDatesWithinObjectiveWindow(
  krStartDate: unknown,
  krTargetDate: unknown,
  objectiveStartDate: unknown,
  objectiveTargetDate: unknown,
): string | null {
  const krStart = toIsoCivilDateOrNull(krStartDate);
  const krTarget = toIsoCivilDateOrNull(krTargetDate);
  const objStart = toIsoCivilDateOrNull(objectiveStartDate);
  const objTarget = toIsoCivilDateOrNull(objectiveTargetDate);

  if (krStart && objStart && krStart < objStart) {
    return "KR startDate cannot be earlier than objective startDate";
  }
  if (krTarget && objTarget && krTarget > objTarget) {
    return "KR targetDate cannot be later than objective targetDate";
  }
  return null;
}

function calcCycleElapsedPercentFromRow(cycle: Record<string, unknown>): number {
  const sd = cycle.start_date as string | undefined;
  const ed = cycle.end_date as string | undefined;
  if (!sd || !ed) return 0;
  return calcElapsedPercent(sd, ed);
}

/** Δ = média dos KRs − % do tempo decorrido no ciclo (pontos percentuais, arredondado). */
function buildCyclePace(
  avgKrProgress: number,
  cycle: Record<string, unknown>,
): {
  elapsedPercent: number;
  avgKrProgress: number;
  verdict: "ahead" | "aligned" | "behind";
  diff: number;
} {
  const elapsedPercent = calcCycleElapsedPercentFromRow(cycle);
  const diff = Math.round((avgKrProgress - elapsedPercent) * 10) / 10;
  const band = 8;
  let verdict: "ahead" | "aligned" | "behind";
  if (diff > band) verdict = "ahead";
  else if (diff < -band) verdict = "behind";
  else verdict = "aligned";
  return { elapsedPercent, avgKrProgress, verdict, diff };
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

async function uniqueSlug(
  db: D1DatabaseLike,
  table: "okr_cycles" | "okr_objectives" | "okr_key_results",
  workspaceCol: string,
  workspaceId: string,
  base: string,
): Promise<string> {
  const b = base || "item";
  const q =
    table === "okr_cycles"
      ? `SELECT id FROM okr_cycles WHERE workspace_id = ? AND slug = ? AND deleted_at IS NULL LIMIT 1`
      : table === "okr_objectives"
        ? `SELECT id FROM okr_objectives WHERE workspace_id = ? AND slug = ? AND deleted_at IS NULL LIMIT 1`
        : `SELECT id FROM okr_key_results WHERE workspace_id = ? AND slug = ? AND deleted_at IS NULL LIMIT 1`;
  const check = await db.prepare(q).bind(workspaceId, b).all<{ id: string }>();
  if (check.results?.length) return `${b}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
  return b;
}

function mapCycle(r: Record<string, unknown>) {
  return {
    id: r.id,
    externalRef: r.external_ref ?? null,
    workspaceId: r.workspace_id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
    deletedAt: r.deleted_at,
  };
}

function mapObjective(r: Record<string, unknown>) {
  return {
    id: r.id,
    externalRef: r.external_ref ?? null,
    workspaceId: r.workspace_id,
    cycleId: r.cycle_id,
    title: r.title,
    slug: r.slug,
    descriptionJson: safeJsonParse(r.description_json as string | null),
    descriptionText: r.description_text,
    ownerUserId: r.owner_user_id,
    status: r.status,
    progressPercent: Number(r.progress_percent ?? 0),
    priority: r.priority,
    sortOrder: Number(r.sort_order ?? 0),
    startDate: r.start_date,
    targetDate: r.target_date,
    completedAt: r.completed_at,
    healthSnapshotJson: (r.health_snapshot_json as string | null | undefined) ?? null,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
    deletedAt: r.deleted_at,
  };
}

function mapKr(r: Record<string, unknown>) {
  return {
    id: r.id,
    externalRef: r.external_ref ?? null,
    workspaceId: r.workspace_id,
    cycleId: r.cycle_id,
    objectiveId: r.objective_id,
    title: r.title,
    slug: r.slug,
    descriptionJson: safeJsonParse(r.description_json as string | null),
    descriptionText: r.description_text,
    ownerUserId: r.owner_user_id,
    metricType: r.metric_type,
    unit: r.unit,
    startValue: Number(r.start_value ?? 0),
    currentValue: Number(r.current_value ?? 0),
    targetValue: Number(r.target_value ?? 0),
    progressPercent: Number(r.progress_percent ?? 0),
    status: r.status,
    confidence: r.confidence,
    sortOrder: Number(r.sort_order ?? 0),
    startDate: r.start_date,
    targetDate: r.target_date,
    completedAt: r.completed_at,
    healthSnapshotJson: (r.health_snapshot_json as string | null | undefined) ?? null,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
    deletedAt: r.deleted_at,
  };
}

async function loadOkrCycleRow(
  db: D1DatabaseLike,
  workspaceId: string,
  cycleId: string | null,
): Promise<Record<string, unknown> | null> {
  if (!cycleId) return null;
  const r = await db
    .prepare(`SELECT * FROM okr_cycles WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`)
    .bind(cycleId, workspaceId)
    .all<Record<string, unknown>>();
  return r.results?.[0] ?? null;
}

function healthInsightForObjective(
  o: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
) {
  const w = resolveOkrObjectiveWindow(o, cycle);
  const raw = String(o.status ?? "draft");
  const p = Number(o.progress_percent ?? 0);
  return computePaceHealth({
    kind: "okr_objective",
    status: effectiveOkrStatusForPaceAndWorkflow(raw, p),
    progressPercent: p,
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
    completedAt: (o.completed_at as string | null) ?? null,
    healthSnapshotJson: effectiveHealthSnapshotForOkrPace(
      raw,
      p,
      (o.health_snapshot_json as string | null) ?? null,
    ),
  });
}

function healthInsightForKr(
  kr: Record<string, unknown>,
  objective: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
) {
  const w = resolveOkrKrWindow(kr, objective, cycle);
  const raw = String(kr.status ?? "draft");
  const p = Number(kr.progress_percent ?? 0);
  return computePaceHealth({
    kind: "okr_key_result",
    status: effectiveOkrStatusForPaceAndWorkflow(raw, p),
    progressPercent: p,
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
    completedAt: (kr.completed_at as string | null) ?? null,
    healthSnapshotJson: effectiveHealthSnapshotForOkrPace(
      raw,
      p,
      (kr.health_snapshot_json as string | null) ?? null,
    ),
  });
}

export async function enrichKrList(
  db: D1DatabaseLike,
  workspaceId: string,
  krRows: Record<string, unknown>[],
) {
  if (krRows.length === 0) return [];
  const objIds = [...new Set(krRows.map((k) => String(k.objective_id ?? "")).filter(Boolean))];
  const ph = objIds.map(() => "?").join(", ");
  const objs = await db
    .prepare(
      `SELECT * FROM okr_objectives WHERE id IN (${ph}) AND workspace_id = ? AND deleted_at IS NULL`,
    )
    .bind(...objIds, workspaceId)
    .all<Record<string, unknown>>();
  const objById = new Map((objs.results ?? []).map((o) => [String(o.id), o]));
  const cycleIds = new Set<string>();
  for (const kr of krRows) {
    const o = objById.get(String(kr.objective_id ?? ""));
    const cid = (kr.cycle_id as string | null) ?? (o?.cycle_id as string | null);
    if (cid) cycleIds.add(cid);
  }
  const cycleById = new Map<string, Record<string, unknown>>();
  if (cycleIds.size > 0) {
    const phc = [...cycleIds].map(() => "?").join(", ");
    const cyc = await db
      .prepare(
        `SELECT * FROM okr_cycles WHERE id IN (${phc}) AND workspace_id = ? AND deleted_at IS NULL`,
      )
      .bind(...[...cycleIds], workspaceId)
      .all<Record<string, unknown>>();
    for (const c of cyc.results ?? []) cycleById.set(String(c.id), c);
  }
  return krRows.map((kr) => {
    const objective = objById.get(String(kr.objective_id ?? "")) ?? {};
    const cid = (kr.cycle_id as string | null) ?? (objective.cycle_id as string | null);
    const cycle = cid ? (cycleById.get(cid) ?? null) : null;
    return {
      ...mapKr(kr),
      healthInsight: healthInsightForKr(kr, objective, cycle),
      workflowStatusInsight: workflowStatusForOkrKr(kr, objective, cycle),
    };
  });
}

export async function enrichObjectiveWithHealth(
  db: D1DatabaseLike,
  workspaceId: string,
  objectiveRow: Record<string, unknown>,
  keyResultRows: Record<string, unknown>[],
) {
  const cycleForObj = await loadOkrCycleRow(
    db,
    workspaceId,
    (objectiveRow.cycle_id as string | null) ?? null,
  );
  const objectiveMapped = mapObjective(objectiveRow);
  const krsOut = await Promise.all(
    (keyResultRows ?? []).map(async (kr) => {
      const cid = (kr.cycle_id as string | null) ?? (objectiveRow.cycle_id as string | null);
      const cycleForKr =
        cid === (objectiveRow.cycle_id as string | null)
          ? cycleForObj
          : await loadOkrCycleRow(db, workspaceId, cid);
      return {
        ...mapKr(kr),
        healthInsight: healthInsightForKr(kr, objectiveRow, cycleForKr),
        workflowStatusInsight: workflowStatusForOkrKr(kr, objectiveRow, cycleForKr),
      };
    }),
  );
  return {
    ...objectiveMapped,
    healthInsight: healthInsightForObjective(objectiveRow, cycleForObj),
    workflowStatusInsight: workflowStatusForOkrObjective(objectiveRow, cycleForObj),
    keyResults: krsOut,
  };
}

async function refreshObjectiveProgress(
  db: D1DatabaseLike,
  objectiveId: string,
  actorUserId: string,
) {
  const krs = await db
    .prepare(
      `SELECT progress_percent FROM okr_key_results WHERE objective_id = ? AND deleted_at IS NULL`,
    )
    .bind(objectiveId)
    .all<{ progress_percent: number }>();
  const list = (krs.results ?? []).map((k) => ({
    progressPercent: Number(k.progress_percent ?? 0),
  }));
  const p = calcObjectiveProgressFromKrs(list);
  await db
    .prepare(
      `UPDATE okr_objectives SET progress_percent = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(p, actorUserId, new Date().toISOString(), objectiveId)
    .all();
}

export async function handleV1OkrWriteRoutes(
  request: Request,
  env: HubExtraEnv,
  pathname: string,
  body: string,
): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const workspaceId = request.headers.get("x-workspace-id");
  const actorUserId = request.headers.get("x-actor-user-id");
  const db = env.TRIBUS_HUB_DB;

  const needWs = () =>
    !workspaceId ? json({ error: { message: "x-workspace-id is required" } }, 400) : null;
  const needActor = () =>
    !actorUserId ? json({ error: { message: "x-actor-user-id is required" } }, 400) : null;

  // GET /v1/okr/dashboard
  if (method === "GET" && pathname === "/v1/okr/dashboard") {
    const err = needWs();
    if (err) return err;
    const cycleId = new URL(request.url).searchParams.get("cycleId") ?? undefined;
    try {
      const cycles = await db
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
      if (!cycles.success) throw new Error(cycles.error);
      const allCycles = (cycles.results ?? []).map(mapCycle);
      let activeCycle: Record<string, unknown> | null = null;
      if (cycleId) {
        const one = await db
          .prepare(
            `SELECT c.*, er.external_ref
             FROM okr_cycles c
             LEFT JOIN entity_external_refs er
               ON er.workspace_id = c.workspace_id
              AND er.entity_type = 'okr_cycle'
              AND er.entity_id = c.id
             WHERE c.id = ? AND c.workspace_id = ? AND c.deleted_at IS NULL`,
          )
          .bind(cycleId, workspaceId)
          .all<Record<string, unknown>>();
        activeCycle = one.results?.[0] ?? null;
      } else {
        const a = await db
          .prepare(
            `SELECT c.*, er.external_ref
             FROM okr_cycles c
             LEFT JOIN entity_external_refs er
               ON er.workspace_id = c.workspace_id
              AND er.entity_type = 'okr_cycle'
              AND er.entity_id = c.id
             WHERE c.workspace_id = ? AND c.status = 'active' AND c.deleted_at IS NULL
             ORDER BY c.start_date DESC LIMIT 1`,
          )
          .bind(workspaceId)
          .all<Record<string, unknown>>();
        activeCycle = a.results?.[0] ?? null;
      }
      const resolvedCycleId = cycleId ?? (activeCycle?.id as string | undefined);
      const whereObj = ["workspace_id = ?", "deleted_at IS NULL"];
      const argsObj: unknown[] = [workspaceId];
      if (resolvedCycleId) {
        whereObj.push("cycle_id = ?");
        argsObj.push(resolvedCycleId);
      }
      const objs = await db
        .prepare(`SELECT status FROM okr_objectives WHERE ${whereObj.join(" AND ")}`)
        .bind(...argsObj)
        .all<{ status: string }>();
      const whereKr = ["workspace_id = ?", "deleted_at IS NULL"];
      const argsKr: unknown[] = [workspaceId];
      if (resolvedCycleId) {
        whereKr.push("cycle_id = ?");
        argsKr.push(resolvedCycleId);
      }
      const krs = await db
        .prepare(
          `SELECT status, progress_percent FROM okr_key_results WHERE ${whereKr.join(" AND ")}`,
        )
        .bind(...argsKr)
        .all<{ status: string; progress_percent: number }>();
      const oc = (s: string) => (objs.results ?? []).filter((o) => o.status === s).length;
      const kc = (s: string) => (krs.results ?? []).filter((k) => k.status === s).length;
      const krList = krs.results ?? [];
      const avgKrProgress =
        krList.length === 0
          ? 0
          : Math.round(
              (krList.reduce((sum, kr) => sum + Number(kr.progress_percent ?? 0), 0) /
                krList.length) *
                10,
            ) / 10;
      const stats = {
        totalObjectives: (objs.results ?? []).length,
        draftObjectives: oc("draft"),
        onTrackObjectives: oc("on_track"),
        atRiskObjectives: oc("at_risk"),
        offTrackObjectives: oc("off_track"),
        completedObjectives: oc("completed"),
        totalKeyResults: krList.length,
        avgKrProgress,
        draftKrs: kc("draft"),
        onTrackKrs: kc("on_track"),
        atRiskKrs: kc("at_risk"),
        offTrackKrs: kc("off_track"),
        completedKrs: kc("completed"),
      };
      const objFull = await db
        .prepare(
          `SELECT o.*, er.external_ref
           FROM okr_objectives o
           LEFT JOIN entity_external_refs er
             ON er.workspace_id = o.workspace_id
            AND er.entity_type = 'okr_objective'
            AND er.entity_id = o.id
           WHERE o.workspace_id = ? AND o.deleted_at IS NULL ${resolvedCycleId ? "AND o.cycle_id = ?" : ""}
           ORDER BY o.sort_order ASC`,
        )
        .bind(...(resolvedCycleId ? [workspaceId, resolvedCycleId] : [workspaceId]))
        .all<Record<string, unknown>>();
      const olist = objFull.results ?? [];
      const oids = olist.map((o) => o.id as string);
      const krByObj = new Map<string, Record<string, unknown>[]>();
      if (oids.length) {
        const ph = oids.map(() => "?").join(", ");
        const allKr = await db
          .prepare(
            `SELECT k.*, er.external_ref
             FROM okr_key_results k
             LEFT JOIN entity_external_refs er
               ON er.workspace_id = k.workspace_id
              AND er.entity_type = 'okr_key_result'
              AND er.entity_id = k.id
             WHERE k.workspace_id = ? AND k.deleted_at IS NULL AND k.objective_id IN (${ph})
             ORDER BY k.sort_order ASC`,
          )
          .bind(workspaceId, ...oids)
          .all<Record<string, unknown>>();
        for (const kr of allKr.results ?? []) {
          const oid = kr.objective_id as string;
          const list = krByObj.get(oid) ?? [];
          list.push(kr);
          krByObj.set(oid, list);
        }
      }
      const objectives = olist.map((o) => ({
        ...mapObjective(o),
        keyResults: (krByObj.get(o.id as string) ?? []).map(mapKr),
      }));
      const users = await db
        .prepare(`SELECT id, name FROM users WHERE workspace_id = ? AND is_active = 1`)
        .bind(workspaceId)
        .all<{ id: string; name: string }>();
      const nameBy = new Map((users.results ?? []).map((u) => [u.id, u.name]));
      const objectivesForDashboard = objectives.map((o) => ({
        ...o,
        ownerDisplayName: o.ownerUserId ? (nameBy.get(o.ownerUserId as string) ?? null) : null,
      }));
      const rawUpdates = await recentKrUpdates(db, workspaceId!, resolvedCycleId, 12);
      const recentUpdates = await enrichUpdates(db, rawUpdates, nameBy);
      return json({
        data: {
          activeCycle: activeCycle ? mapCycle(activeCycle) : null,
          allCycles,
          stats,
          attentionItems: buildAttention(
            objectives as Array<{
              id: string;
              title: string;
              status: string;
              progressPercent: number;
              keyResults: Array<{
                id: string;
                title: string;
                status: string;
                progressPercent: number;
                confidence: number | null;
                updatedAt: string;
              }>;
            }>,
          ),
          recentUpdates,
          objectives: objectivesForDashboard,
          cyclePace: activeCycle ? buildCyclePace(stats.avgKrProgress, activeCycle) : null,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "dashboard failed";
      return json({ error: { message } }, 500);
    }
  }

  // POST /v1/okr/cycles
  if (method === "POST" && pathname === "/v1/okr/cycles") {
    const err = needWs() ?? needActor();
    if (err) return err;
    try {
      const input = parseJson<Record<string, unknown>>(body);
      const title = String(input.title ?? "").trim();
      if (!title) return json({ error: { message: "title is required" } }, 400);
      const base = slugifyTitle(title);
      const slug = await uniqueSlug(db, "okr_cycles", "workspace_id", workspaceId!, base);
      const id = createId();
      const now = new Date().toISOString();
      const ins = await db
        .prepare(
          `INSERT INTO okr_cycles (id, workspace_id, title, slug, description, start_date, end_date, status, created_by, updated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          workspaceId,
          title,
          slug,
          input.description ?? null,
          input.startDate,
          input.endDate,
          input.status ?? "planned",
          actorUserId,
          actorUserId,
          now,
          now,
        )
        .all();
      if (!ins.success) return json({ error: { message: ins.error } }, 400);
      const row = await db
        .prepare(`SELECT * FROM okr_cycles WHERE id = ?`)
        .bind(id)
        .all<Record<string, unknown>>();
      const externalRef = await ensureExternalRef(db, {
        workspaceId: workspaceId!,
        entityType: "okr_cycle",
        entityId: id,
        suggestedRef: (input.externalRef as string | undefined) ?? null,
      });
      return json({ data: { ...mapCycle(row.results?.[0] ?? {}), externalRef } }, 201);
    } catch (e) {
      return json({ error: { message: e instanceof Error ? e.message : "error" } }, 400);
    }
  }

  // /v1/okr/cycles/:id
  const cycleMatch = pathname.match(/^\/v1\/okr\/cycles\/([^/]+)$/);
  if (cycleMatch) {
    const id = cycleMatch[1]!;
    const err = needWs() ?? needActor();
    if (err) return err;
    if (method === "GET") {
      const row = await db
        .prepare(
          `SELECT c.*, er.external_ref
           FROM okr_cycles c
           LEFT JOIN entity_external_refs er
             ON er.workspace_id = c.workspace_id
            AND er.entity_type = 'okr_cycle'
            AND er.entity_id = c.id
           WHERE c.id = ? AND c.workspace_id = ? AND c.deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!row.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const [objectivesRes, projectsRes] = await Promise.all([
        db
          .prepare(
            `SELECT * FROM okr_objectives
             WHERE workspace_id = ? AND cycle_id = ? AND deleted_at IS NULL
             ORDER BY sort_order ASC`,
          )
          .bind(workspaceId, id)
          .all<Record<string, unknown>>(),
        db
          .prepare(
            `SELECT * FROM projects
             WHERE workspace_id = ? AND cycle_id = ? AND deleted_at IS NULL
             ORDER BY updated_at DESC`,
          )
          .bind(workspaceId, id)
          .all<Record<string, unknown>>(),
      ]);
      return json({
        data: {
          ...mapCycle(row.results[0]),
          objectives: (objectivesRes.results ?? []).map((o) => mapObjective(o)),
          projects:
            (projectsRes.results ?? []).map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              status: p.status,
              progressPercent: Number(p.progress_percent ?? 0),
              startDate: p.start_date ?? null,
              targetDate: p.target_date ?? null,
              ownerUserId: p.owner_user_id ?? null,
            })) ?? [],
        },
      });
    }
    if (method === "PATCH") {
      const input = parseJson<Record<string, unknown>>(body);
      const cur = await db
        .prepare(
          `SELECT * FROM okr_cycles WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!cur.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      if (input.status === "active" && cur.results[0].status !== "active") {
        await db
          .prepare(
            `UPDATE okr_cycles SET status = 'closed', updated_by = ?, updated_at = ? WHERE workspace_id = ? AND status = 'active' AND id != ? AND deleted_at IS NULL`,
          )
          .bind(actorUserId, new Date().toISOString(), workspaceId, id)
          .all();
      }
      const sets: string[] = [];
      const args: unknown[] = [];
      for (const [k, col] of Object.entries({
        title: "title",
        description: "description",
        startDate: "start_date",
        endDate: "end_date",
        status: "status",
      })) {
        if (input[k] !== undefined) {
          sets.push(`${col} = ?`);
          args.push(input[k] ?? null);
        }
      }
      sets.push("updated_by = ?", "updated_at = ?");
      args.push(actorUserId, new Date().toISOString(), id, workspaceId);
      const up = await db
        .prepare(`UPDATE okr_cycles SET ${sets.join(", ")} WHERE id = ? AND workspace_id = ?`)
        .bind(...args)
        .all();
      if (!up.success) return json({ error: { message: up.error } }, 400);
      const row = await db
        .prepare(`SELECT * FROM okr_cycles WHERE id = ?`)
        .bind(id)
        .all<Record<string, unknown>>();
      return json({ data: mapCycle(row.results?.[0] ?? {}) });
    }
    if (method === "DELETE") {
      const now = new Date().toISOString();
      await db
        .prepare(
          `UPDATE okr_cycles SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND workspace_id = ?`,
        )
        .bind(now, now, actorUserId, id, workspaceId)
        .all();
      return json({ data: null });
    }
  }

  // POST /v1/okr/objectives
  if (method === "POST" && pathname === "/v1/okr/objectives") {
    const err = needWs() ?? needActor();
    if (err) return err;
    const input = parseJson<Record<string, unknown>>(body);
    const title = String(input.title ?? "").trim();
    if (!title) return json({ error: { message: "title is required" } }, 400);
    const base = slugifyTitle(title);
    const slug = await uniqueSlug(db, "okr_objectives", "workspace_id", workspaceId!, base);
    const id = createId();
    const now = new Date().toISOString();
    const ins = await db
      .prepare(
        `INSERT INTO okr_objectives (id, workspace_id, cycle_id, title, slug, description_json, description_text, owner_user_id, status, progress_percent, priority, sort_order, start_date, target_date, completed_at, created_by, updated_by, created_at, updated_at, archived_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        workspaceId,
        input.cycleId ?? null,
        title,
        slug,
        null,
        input.descriptionText ?? null,
        input.ownerUserId ?? null,
        input.status ?? "draft",
        0,
        input.priority ?? "medium",
        input.sortOrder ?? 0,
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
    if (!ins.success) return json({ error: { message: ins.error } }, 400);
    const row = await db
      .prepare(`SELECT * FROM okr_objectives WHERE id = ?`)
      .bind(id)
      .all<Record<string, unknown>>();
    const externalRef = await ensureExternalRef(db, {
      workspaceId: workspaceId!,
      entityType: "okr_objective",
      entityId: id,
      suggestedRef: (input.externalRef as string | undefined) ?? null,
    });
    const enriched = await enrichObjectiveWithHealth(db, workspaceId!, row.results?.[0] ?? {}, []);
    return json({ data: { ...enriched, externalRef } }, 201);
  }

  const objMatch = pathname.match(/^\/v1\/okr\/objectives\/([^/]+)$/);
  if (objMatch) {
    const id = objMatch[1]!;
    const err = needWs() ?? needActor();
    if (err) return err;
    if (method === "GET") {
      const row = await db
        .prepare(
          `SELECT o.*, oer.external_ref
           FROM okr_objectives o
           LEFT JOIN entity_external_refs oer
             ON oer.workspace_id = o.workspace_id
            AND oer.entity_type = 'okr_objective'
            AND oer.entity_id = o.id
           WHERE o.id = ? AND o.workspace_id = ? AND o.deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!row.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const krs = await db
        .prepare(
          `SELECT k.*, ker.external_ref
           FROM okr_key_results k
           LEFT JOIN entity_external_refs ker
             ON ker.workspace_id = k.workspace_id
            AND ker.entity_type = 'okr_key_result'
            AND ker.entity_id = k.id
           WHERE k.objective_id = ? AND k.deleted_at IS NULL
           ORDER BY k.sort_order ASC`,
        )
        .bind(id)
        .all<Record<string, unknown>>();
      const data = await enrichObjectiveWithHealth(
        db,
        workspaceId!,
        row.results[0],
        (krs.results ?? []) as Record<string, unknown>[],
      );
      return json({ data });
    }
    if (method === "PATCH") {
      const input = parseJson<Record<string, unknown>>(body);
      const ex = await db
        .prepare(
          `SELECT * FROM okr_objectives WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!ex.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const cur = ex.results[0];
      const prevStatus = String(cur.status ?? "draft");
      const progress = Number(cur.progress_percent ?? 0);
      const resolvedStatus = resolveOkrStatusAfterProgress(
        input.status !== undefined ? String(input.status) : undefined,
        prevStatus,
        progress,
      );
      const nowIso = new Date().toISOString();
      const sets: string[] = [];
      const args: unknown[] = [];
      const map: [string, string][] = [
        ["title", "title"],
        ["descriptionText", "description_text"],
        ["cycleId", "cycle_id"],
        ["ownerUserId", "owner_user_id"],
        ["priority", "priority"],
        ["startDate", "start_date"],
        ["targetDate", "target_date"],
        ["sortOrder", "sort_order"],
      ];
      for (const [js, col] of map) {
        if (input[js] !== undefined) {
          sets.push(`${col} = ?`);
          args.push(input[js] ?? null);
        }
      }
      sets.push("status = ?");
      args.push(resolvedStatus);
      if (resolvedStatus === "completed" && prevStatus !== "completed") {
        const cycle = await loadOkrCycleRow(
          db,
          workspaceId!,
          (cur.cycle_id as string | null) ?? null,
        );
        const w = resolveOkrObjectiveWindow(cur, cycle);
        const snap = buildCompletionSnapshotFromPreCompleteRow({
          kind: "okr_objective",
          previousStatus: prevStatus,
          progressPercent: progress,
          windowStart: w.start,
          windowEnd: w.end,
          dateSourcePt: w.dateSourcePt,
          existingSnapshot: (cur.health_snapshot_json as string | null) ?? null,
        });
        if (snap) {
          sets.push("health_snapshot_json = ?", "completed_at = ?");
          args.push(snap, (cur.completed_at as string | null) ? cur.completed_at : nowIso);
        } else if (!cur.completed_at) {
          sets.push("completed_at = ?");
          args.push(nowIso);
        }
      } else if (resolvedStatus !== "completed") {
        sets.push("health_snapshot_json = ?", "completed_at = ?");
        args.push(null, null);
      }
      sets.push("updated_by = ?", "updated_at = ?");
      args.push(actorUserId, nowIso, id, workspaceId);
      await db
        .prepare(`UPDATE okr_objectives SET ${sets.join(", ")} WHERE id = ? AND workspace_id = ?`)
        .bind(...args)
        .all();
      const row = await db
        .prepare(`SELECT * FROM okr_objectives WHERE id = ?`)
        .bind(id)
        .all<Record<string, unknown>>();
      const krs = await db
        .prepare(
          `SELECT * FROM okr_key_results WHERE objective_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC`,
        )
        .bind(id)
        .all<Record<string, unknown>>();
      const data = await enrichObjectiveWithHealth(
        db,
        workspaceId!,
        row.results?.[0] ?? {},
        (krs.results ?? []) as Record<string, unknown>[],
      );
      return json({ data });
    }
    if (method === "DELETE") {
      const now = new Date().toISOString();
      await db
        .prepare(
          `UPDATE okr_objectives SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND workspace_id = ?`,
        )
        .bind(now, now, actorUserId, id, workspaceId)
        .all();
      return json({ data: null });
    }
  }

  // GET /v1/okr/key-results?...
  if (method === "GET" && pathname === "/v1/okr/key-results") {
    const err = needWs();
    if (err) return err;
    const url = new URL(request.url);
    const cycleId = url.searchParams.get("cycleId") ?? undefined;
    const objectiveId = url.searchParams.get("objectiveId") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const where = ["workspace_id = ?", "deleted_at IS NULL"];
    const args: unknown[] = [workspaceId];
    if (cycleId) {
      where.push("cycle_id = ?");
      args.push(cycleId);
    }
    if (objectiveId) {
      where.push("objective_id = ?");
      args.push(objectiveId);
    }
    if (status) {
      where.push("status = ?");
      args.push(status);
    }
    const rows = await db
      .prepare(
        `SELECT k.*, er.external_ref
         FROM okr_key_results k
         LEFT JOIN entity_external_refs er
           ON er.workspace_id = k.workspace_id
          AND er.entity_type = 'okr_key_result'
          AND er.entity_id = k.id
         WHERE ${where.map((c) => c.replaceAll("workspace_id", "k.workspace_id").replaceAll("deleted_at", "k.deleted_at").replaceAll("cycle_id", "k.cycle_id").replaceAll("objective_id", "k.objective_id").replaceAll("status", "k.status")).join(" AND ")}
         ORDER BY k.sort_order ASC`,
      )
      .bind(...args)
      .all<Record<string, unknown>>();
    const enriched = await enrichKrList(db, workspaceId!, rows.results ?? []);
    return json({ data: enriched });
  }

  if (method === "POST" && pathname === "/v1/okr/key-results") {
    const err = needWs() ?? needActor();
    if (err) return err;
    const input = parseJson<Record<string, unknown>>(body);
    const title = String(input.title ?? "").trim();
    const objectiveId = String(input.objectiveId ?? "");
    if (!title || !objectiveId)
      return json({ error: { message: "title and objectiveId required" } }, 400);
    const obj = await db
      .prepare(`SELECT * FROM okr_objectives WHERE id = ? AND deleted_at IS NULL`)
      .bind(objectiveId)
      .all<Record<string, unknown>>();
    const o = obj.results?.[0];
    if (!o || o.workspace_id !== workspaceId)
      return json({ error: { message: "Objective not found" } }, 404);
    const dateWindowError = validateKrDatesWithinObjectiveWindow(
      input.startDate ?? null,
      input.targetDate ?? null,
      o.start_date,
      o.target_date,
    );
    if (dateWindowError) return json({ error: { message: dateWindowError } }, 400);
    const base = slugifyTitle(title);
    const slug = await uniqueSlug(db, "okr_key_results", "workspace_id", workspaceId!, base);
    const id = createId();
    const now = new Date().toISOString();
    const startValue = Number(input.startValue ?? 0);
    const targetValue = Number(input.targetValue);
    const currentValue = Number(input.currentValue ?? startValue);
    const metricType = (input.metricType as string) ?? "number";
    const progress = calcKrProgress(startValue, currentValue, targetValue, metricType);
    const cycleId = (input.cycleId ?? o.cycle_id ?? null) as string | null;
    const cycle = await loadOkrCycleRow(db, workspaceId!, cycleId);
    const w = resolveOkrKrWindow(
      {
        start_date: (input.startDate as string | null | undefined) ?? null,
        target_date: (input.targetDate as string | null | undefined) ?? null,
      },
      o,
      cycle,
    );
    const status = resolveOkrStatusAfterProgress(
      input.status !== undefined ? String(input.status) : undefined,
      "draft",
      progress,
    );
    let healthJson: string | null = null;
    let completedAtIns: string | null = null;
    if (status === "completed") {
      const snap = buildCompletionSnapshotFromPreCompleteRow({
        kind: "okr_key_result",
        previousStatus: "draft",
        progressPercent: progress,
        windowStart: w.start,
        windowEnd: w.end,
        dateSourcePt: w.dateSourcePt,
        existingSnapshot: null,
      });
      healthJson = snap;
      completedAtIns = now;
    }
    const ins = await db
      .prepare(
        `INSERT INTO okr_key_results (id, workspace_id, cycle_id, objective_id, title, slug, description_json, description_text, owner_user_id, metric_type, unit, start_value, current_value, target_value, progress_percent, status, confidence, sort_order, start_date, target_date, health_snapshot_json, completed_at, created_by, updated_by, created_at, updated_at, archived_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .bind(
        id,
        workspaceId,
        cycleId,
        objectiveId,
        title,
        slug,
        input.descriptionText ?? null,
        input.ownerUserId ?? null,
        metricType,
        input.unit ?? null,
        startValue,
        currentValue,
        targetValue,
        progress,
        status,
        input.confidence ?? 50,
        input.sortOrder ?? 0,
        input.startDate ?? null,
        input.targetDate ?? null,
        healthJson,
        completedAtIns,
        actorUserId,
        actorUserId,
        now,
        now,
      )
      .all();
    if (!ins.success) return json({ error: { message: ins.error } }, 400);
    await refreshObjectiveProgress(db, objectiveId, actorUserId!);
    const row = await db
      .prepare(`SELECT * FROM okr_key_results WHERE id = ?`)
      .bind(id)
      .all<Record<string, unknown>>();
    const externalRef = await ensureExternalRef(db, {
      workspaceId: workspaceId!,
      entityType: "okr_key_result",
      entityId: id,
      suggestedRef: (input.externalRef as string | undefined) ?? null,
    });
    const krRow = row.results?.[0] ?? {};
    const objFull = await db
      .prepare(`SELECT * FROM okr_objectives WHERE id = ? AND deleted_at IS NULL`)
      .bind(objectiveId)
      .all<Record<string, unknown>>();
    const objective = objFull.results?.[0] ?? {};
    const cid = (krRow.cycle_id as string | null) ?? (objective.cycle_id as string | null);
    const responseCycle = cid === cycleId ? cycle : await loadOkrCycleRow(db, workspaceId!, cid);
    return json(
      {
        data: {
          ...mapKr(krRow),
          healthInsight: healthInsightForKr(krRow, objective, responseCycle),
          workflowStatusInsight: workflowStatusForOkrKr(krRow, objective, responseCycle),
          externalRef,
        },
      },
      201,
    );
  }

  const krMatch = pathname.match(/^\/v1\/okr\/key-results\/([^/]+)$/);
  if (krMatch) {
    const id = krMatch[1]!;
    const err = needWs() ?? needActor();
    if (err) return err;
    if (method === "GET") {
      const row = await db
        .prepare(
          `SELECT k.*, er.external_ref
           FROM okr_key_results k
           LEFT JOIN entity_external_refs er
             ON er.workspace_id = k.workspace_id
            AND er.entity_type = 'okr_key_result'
            AND er.entity_id = k.id
           WHERE k.id = ? AND k.workspace_id = ? AND k.deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!row.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const kr = row.results[0];
      const obj = await db
        .prepare(`SELECT * FROM okr_objectives WHERE id = ? AND deleted_at IS NULL`)
        .bind(kr.objective_id)
        .all<Record<string, unknown>>();
      const objective = obj.results?.[0] ?? {};
      const cid = (kr.cycle_id as string | null) ?? (objective.cycle_id as string | null);
      const cycle = await loadOkrCycleRow(db, workspaceId!, cid);
      return json({
        data: {
          ...mapKr(kr),
          healthInsight: healthInsightForKr(kr, objective, cycle),
          workflowStatusInsight: workflowStatusForOkrKr(kr, objective, cycle),
        },
      });
    }
    if (method === "PATCH") {
      const input = parseJson<Record<string, unknown>>(body);
      const cur = await db
        .prepare(
          `SELECT * FROM okr_key_results WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<Record<string, unknown>>();
      if (!cur.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const c = cur.results[0];
      const prevStatus = String(c.status ?? "draft");
      const startValue = Number(input.startValue ?? c.start_value);
      const currentValue = Number(input.currentValue ?? c.current_value);
      const targetValue = Number(input.targetValue ?? c.target_value);
      const metricType = (input.metricType as string) ?? (c.metric_type as string);
      const progress = calcKrProgress(startValue, currentValue, targetValue, metricType);
      const title = input.title !== undefined ? String(input.title) : (c.title as string);
      const descriptionText =
        input.descriptionText !== undefined ? input.descriptionText : c.description_text;
      const cycleId = input.cycleId !== undefined ? input.cycleId : c.cycle_id;
      const ownerUserId = input.ownerUserId !== undefined ? input.ownerUserId : c.owner_user_id;
      const unit = input.unit !== undefined ? input.unit : c.unit;
      const status = resolveOkrStatusAfterProgress(
        input.status !== undefined ? String(input.status) : undefined,
        prevStatus,
        progress,
      );
      const confidence = input.confidence !== undefined ? input.confidence : c.confidence;
      const sortOrder = input.sortOrder !== undefined ? input.sortOrder : c.sort_order;
      const startDate = input.startDate !== undefined ? input.startDate : c.start_date;
      const targetDate = input.targetDate !== undefined ? input.targetDate : c.target_date;
      const now = new Date().toISOString();
      const obj = await db
        .prepare(`SELECT * FROM okr_objectives WHERE id = ? AND deleted_at IS NULL`)
        .bind(c.objective_id)
        .all<Record<string, unknown>>();
      const objective = obj.results?.[0] ?? {};
      const dateWindowError = validateKrDatesWithinObjectiveWindow(
        startDate,
        targetDate,
        objective.start_date,
        objective.target_date,
      );
      if (dateWindowError) return json({ error: { message: dateWindowError } }, 400);
      const cid = (cycleId as string | null) ?? (objective.cycle_id as string | null);
      const cycle = await loadOkrCycleRow(db, workspaceId!, cid);
      const w = resolveOkrKrWindow(
        {
          ...c,
          start_date: (startDate as string | null | undefined) ?? null,
          target_date: (targetDate as string | null | undefined) ?? null,
        },
        objective,
        cycle,
      );
      let healthSnap: string | null;
      let completedAt: string | null;
      if (status === "completed") {
        if (prevStatus !== "completed") {
          const snap = buildCompletionSnapshotFromPreCompleteRow({
            kind: "okr_key_result",
            previousStatus: prevStatus,
            progressPercent: progress,
            windowStart: w.start,
            windowEnd: w.end,
            dateSourcePt: w.dateSourcePt,
            existingSnapshot: (c.health_snapshot_json as string | null) ?? null,
          });
          healthSnap = snap ?? (c.health_snapshot_json as string | null) ?? null;
          completedAt = (c.completed_at as string | null) ?? now;
        } else {
          healthSnap = (c.health_snapshot_json as string | null) ?? null;
          completedAt = (c.completed_at as string | null) ?? null;
        }
      } else {
        healthSnap = null;
        completedAt = null;
      }
      await db
        .prepare(
          `UPDATE okr_key_results SET title = ?, description_text = ?, cycle_id = ?, owner_user_id = ?, metric_type = ?, unit = ?, start_value = ?, current_value = ?, target_value = ?, progress_percent = ?, status = ?, confidence = ?, sort_order = ?, start_date = ?, target_date = ?, health_snapshot_json = ?, completed_at = ?, updated_by = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
        )
        .bind(
          title,
          descriptionText,
          cycleId,
          ownerUserId,
          metricType,
          unit,
          startValue,
          currentValue,
          targetValue,
          progress,
          status,
          confidence,
          sortOrder,
          startDate,
          targetDate,
          healthSnap ?? null,
          completedAt,
          actorUserId,
          now,
          id,
          workspaceId,
        )
        .all();
      await refreshObjectiveProgress(db, c.objective_id as string, actorUserId!);
      const row = await db
        .prepare(`SELECT * FROM okr_key_results WHERE id = ?`)
        .bind(id)
        .all<Record<string, unknown>>();
      const kr2 = row.results?.[0] ?? {};
      const cycle2 = await loadOkrCycleRow(
        db,
        workspaceId!,
        (kr2.cycle_id as string | null) ?? (objective.cycle_id as string | null),
      );
      return json({
        data: {
          ...mapKr(kr2),
          healthInsight: healthInsightForKr(kr2, objective, cycle2),
          workflowStatusInsight: workflowStatusForOkrKr(kr2, objective, cycle2),
        },
      });
    }
    if (method === "DELETE") {
      const cur = await db
        .prepare(
          `SELECT objective_id FROM okr_key_results WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(id, workspaceId)
        .all<{ objective_id: string }>();
      if (!cur.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const oid = cur.results[0].objective_id;
      const now = new Date().toISOString();
      await db
        .prepare(
          `UPDATE okr_key_results SET deleted_at = ?, updated_at = ?, updated_by = ? WHERE id = ?`,
        )
        .bind(now, now, actorUserId, id)
        .all();
      await refreshObjectiveProgress(db, oid, actorUserId!);
      return json({ data: null });
    }
  }

  const krUpMatch = pathname.match(/^\/v1\/okr\/key-results\/([^/]+)\/updates$/);
  if (krUpMatch) {
    const krId = krUpMatch[1]!;
    const err = needWs() ?? needActor();
    if (err) return err;
    if (method === "GET") {
      const kr = await db
        .prepare(
          `SELECT id FROM okr_key_results WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(krId, workspaceId)
        .all<{ id: string }>();
      if (!kr.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const rows = await db
        .prepare(
          `SELECT * FROM okr_key_result_updates WHERE key_result_id = ? ORDER BY created_at DESC`,
        )
        .bind(krId)
        .all<Record<string, unknown>>();
      return json({
        data: (rows.results ?? []).map((u) => ({
          id: u.id,
          keyResultId: u.key_result_id,
          previousValue: u.previous_value,
          newValue: u.new_value,
          comment: u.comment,
          updatedBy: u.updated_by,
          createdAt: u.created_at,
        })),
      });
    }
    if (method === "POST") {
      const input = parseJson<{ newValue: number; comment?: string | null }>(body);
      const cur = await db
        .prepare(
          `SELECT * FROM okr_key_results WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL`,
        )
        .bind(krId, workspaceId)
        .all<Record<string, unknown>>();
      if (!cur.results?.[0]) return json({ error: { message: "Not found" } }, 404);
      const c = cur.results[0];
      const previousValue = Number(c.current_value);
      const newValue = input.newValue;
      const progress = calcKrProgress(
        Number(c.start_value),
        newValue,
        Number(c.target_value),
        c.metric_type as string,
      );
      const prevStatus = String(c.status ?? "draft");
      const status = resolveOkrStatusAfterProgress(undefined, prevStatus, progress);
      const now = new Date().toISOString();
      const obj = await db
        .prepare(`SELECT * FROM okr_objectives WHERE id = ? AND deleted_at IS NULL`)
        .bind(c.objective_id)
        .all<Record<string, unknown>>();
      const objective = obj.results?.[0] ?? {};
      const cid = (c.cycle_id as string | null) ?? (objective.cycle_id as string | null);
      const cycle = await loadOkrCycleRow(db, workspaceId!, cid);
      const w = resolveOkrKrWindow(c, objective, cycle);
      let healthSnap: string | null;
      let completedAt: string | null;
      if (status === "completed") {
        if (prevStatus !== "completed") {
          const snap = buildCompletionSnapshotFromPreCompleteRow({
            kind: "okr_key_result",
            previousStatus: prevStatus,
            progressPercent: progress,
            windowStart: w.start,
            windowEnd: w.end,
            dateSourcePt: w.dateSourcePt,
            existingSnapshot: (c.health_snapshot_json as string | null) ?? null,
          });
          healthSnap = snap ?? (c.health_snapshot_json as string | null) ?? null;
          completedAt = (c.completed_at as string | null) ?? now;
        } else {
          healthSnap = (c.health_snapshot_json as string | null) ?? null;
          completedAt = (c.completed_at as string | null) ?? null;
        }
      } else {
        healthSnap = null;
        completedAt = null;
      }
      const uid = createId();
      await db
        .prepare(
          `INSERT INTO okr_key_result_updates (id, key_result_id, previous_value, new_value, comment, updated_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(uid, krId, previousValue, newValue, input.comment ?? null, actorUserId, now)
        .all();
      await db
        .prepare(
          `UPDATE okr_key_results SET current_value = ?, progress_percent = ?, status = ?, health_snapshot_json = ?, completed_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(newValue, progress, status, healthSnap, completedAt, actorUserId, now, krId)
        .all();
      await refreshObjectiveProgress(db, c.objective_id as string, actorUserId!);
      const krRow = await db
        .prepare(`SELECT * FROM okr_key_results WHERE id = ?`)
        .bind(krId)
        .all<Record<string, unknown>>();
      const krAfter = krRow.results?.[0] ?? {};
      const cycle2 = await loadOkrCycleRow(
        db,
        workspaceId!,
        (krAfter.cycle_id as string | null) ?? (objective.cycle_id as string | null),
      );
      const upRow = await db
        .prepare(`SELECT * FROM okr_key_result_updates WHERE id = ?`)
        .bind(uid)
        .all<Record<string, unknown>>();
      const u = upRow.results?.[0] ?? {};
      return json({
        data: {
          keyResult: {
            ...mapKr(krAfter),
            healthInsight: healthInsightForKr(krAfter, objective, cycle2),
            workflowStatusInsight: workflowStatusForOkrKr(krAfter, objective, cycle2),
          },
          update: {
            id: u.id,
            keyResultId: u.key_result_id,
            previousValue: u.previous_value,
            newValue: u.new_value,
            comment: u.comment,
            updatedBy: u.updated_by,
            createdAt: u.created_at,
          },
        },
      });
    }
  }

  return null;
}

async function recentKrUpdates(
  db: D1DatabaseLike,
  workspaceId: string,
  cycleId: string | undefined,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const where = ["workspace_id = ?", "deleted_at IS NULL"];
  const args: unknown[] = [workspaceId];
  if (cycleId) {
    where.push("cycle_id = ?");
    args.push(cycleId);
  }
  const krs = await db
    .prepare(`SELECT id FROM okr_key_results WHERE ${where.join(" AND ")}`)
    .bind(...args)
    .all<{ id: string }>();
  const ids = (krs.results ?? []).map((k) => k.id);
  if (ids.length === 0) return [];
  const ph = ids.map(() => "?").join(", ");
  const rows = await db
    .prepare(
      `SELECT * FROM okr_key_result_updates WHERE key_result_id IN (${ph}) ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(...ids, limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

async function enrichUpdates(
  db: D1DatabaseLike,
  raw: Record<string, unknown>[],
  nameBy: Map<string, string>,
): Promise<unknown[]> {
  if (raw.length === 0) return [];
  const krIds = [...new Set(raw.map((u) => u.key_result_id as string))];
  const ph = krIds.map(() => "?").join(", ");
  const krs = await db
    .prepare(`SELECT id, title, objective_id FROM okr_key_results WHERE id IN (${ph})`)
    .bind(...krIds)
    .all<Record<string, unknown>>();
  const krMap = new Map((krs.results ?? []).map((k) => [k.id as string, k]));
  const objIds = [...new Set((krs.results ?? []).map((k) => k.objective_id as string))];
  const ph2 = objIds.map(() => "?").join(", ");
  const objs = await db
    .prepare(`SELECT id, title FROM okr_objectives WHERE id IN (${ph2})`)
    .bind(...objIds)
    .all<Record<string, unknown>>();
  const objMap = new Map((objs.results ?? []).map((o) => [o.id as string, o]));
  return raw.map((u) => {
    const kr = krMap.get(u.key_result_id as string);
    const obj = kr ? objMap.get(kr.objective_id as string) : undefined;
    return {
      id: u.id,
      keyResultId: u.key_result_id,
      previousValue: u.previous_value,
      newValue: u.new_value,
      comment: u.comment,
      updatedBy: u.updated_by,
      createdAt: u.created_at,
      keyResultTitle: kr?.title ?? "Key result",
      objectiveId: kr?.objective_id ?? "",
      objectiveTitle: (obj?.title as string) ?? "Objetivo",
      updatedByName: nameBy.get(u.updated_by as string) ?? null,
    };
  });
}

function buildAttention(
  objectives: {
    id: string;
    title: string;
    status: string;
    progressPercent: number;
    keyResults: {
      status: string;
      title: string;
      id: string;
      progressPercent: number;
      confidence: number | null;
      updatedAt: string;
    }[];
  }[],
) {
  const items: unknown[] = [];
  for (const o of objectives) {
    if (o.status === "off_track") {
      items.push({
        kind: "objective",
        id: o.id,
        title: o.title,
        reason: "Objetivo fora do rumo",
        href: `/okr/objectives/${o.id}`,
        severity: "high",
        score: 100,
        progressPercent: o.progressPercent,
        status: o.status,
      });
    }
    for (const kr of o.keyResults ?? []) {
      if (kr.status === "off_track") {
        items.push({
          kind: "key_result",
          id: kr.id,
          title: kr.title,
          reason: "KR fora do rumo",
          href: `/okr/key-results/${kr.id}`,
          severity: "high",
          score: 92,
          progressPercent: kr.progressPercent,
          status: kr.status,
          objectiveTitle: o.title,
        });
      }
    }
  }
  return items.slice(0, 12);
}
