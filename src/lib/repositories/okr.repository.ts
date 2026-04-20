// @ts-nocheck
import { db } from "@/lib/db/client";
import {
  okrCycles,
  okrObjectives,
  okrKeyResults,
  okrKeyResultUpdates,
  okrGroups,
  okrObjectiveGroups,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, inArray, ne } from "drizzle-orm";
import type {
  OkrCycle,
  NewOkrCycle,
  OkrObjective,
  NewOkrObjective,
  OkrKeyResult,
  NewOkrKeyResult,
  OkrKeyResultUpdate,
  NewOkrKeyResultUpdate,
  OkrGroup,
  NewOkrGroup,
} from "@/lib/db/schema";

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Calculates progress percent for a key result from its start/current/target values.
 * Boolean KR: 0 or 100. Others: linear interpolation clamped 0–100.
 */
export function calcKrProgress(
  start: number,
  current: number,
  target: number,
  metricType: string,
): number {
  if (metricType === "boolean") {
    return current >= 1 ? 100 : 0;
  }
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - start) / range) * 100;
  return Math.min(100, Math.max(0, progress));
}

/** Derives objective progress as simple average of its KR progress percents. */
export function calcObjectiveProgress(krs: OkrKeyResult[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((sum, kr) => sum + kr.progressPercent, 0);
  return Math.round((total / krs.length) * 10) / 10;
}

// ─── Slug existence checks (O(1) — single SELECT by slug) ────────────────────

export async function cycleSlugExists(workspaceId: string, slug: string): Promise<boolean> {
  const row = await db.query.okrCycles.findFirst({
    columns: { id: true },
    where: and(eq(okrCycles.workspaceId, workspaceId), eq(okrCycles.slug, slug), isNull(okrCycles.deletedAt)),
  });
  return !!row;
}

export async function objectiveSlugExists(workspaceId: string, slug: string): Promise<boolean> {
  const row = await db.query.okrObjectives.findFirst({
    columns: { id: true },
    where: and(eq(okrObjectives.workspaceId, workspaceId), eq(okrObjectives.slug, slug), isNull(okrObjectives.deletedAt)),
  });
  return !!row;
}

export async function krSlugExists(workspaceId: string, slug: string): Promise<boolean> {
  const row = await db.query.okrKeyResults.findFirst({
    columns: { id: true },
    where: and(eq(okrKeyResults.workspaceId, workspaceId), eq(okrKeyResults.slug, slug), isNull(okrKeyResults.deletedAt)),
  });
  return !!row;
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

export async function findCyclesByWorkspace(workspaceId: string): Promise<OkrCycle[]> {
  return db.query.okrCycles.findMany({
    where: and(eq(okrCycles.workspaceId, workspaceId), isNull(okrCycles.deletedAt)),
    orderBy: [desc(okrCycles.startDate)],
  });
}

export async function findCycleById(id: string): Promise<OkrCycle | undefined> {
  return db.query.okrCycles.findFirst({
    where: and(eq(okrCycles.id, id), isNull(okrCycles.deletedAt)),
  });
}

export async function findActiveCycle(workspaceId: string): Promise<OkrCycle | undefined> {
  return db.query.okrCycles.findFirst({
    where: and(
      eq(okrCycles.workspaceId, workspaceId),
      eq(okrCycles.status, "active"),
      isNull(okrCycles.deletedAt),
    ),
    orderBy: [desc(okrCycles.startDate)],
  });
}

export async function createCycle(data: NewOkrCycle): Promise<OkrCycle> {
  const [cycle] = await db.insert(okrCycles).values(data).returning();
  if (!cycle) throw new Error("Failed to create cycle");
  return cycle;
}

export async function updateCycle(id: string, data: Partial<NewOkrCycle>): Promise<OkrCycle> {
  const [updated] = await db
    .update(okrCycles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(okrCycles.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update cycle");
  return updated;
}

export async function softDeleteCycle(id: string): Promise<void> {
  await db.update(okrCycles).set({ deletedAt: new Date() }).where(eq(okrCycles.id, id));
}

/** Garante um único ciclo ativo: encerra os demais no workspace. */
export async function closeOtherActiveCycles(
  workspaceId: string,
  keepCycleId: string,
  updatedBy: string,
): Promise<void> {
  await db
    .update(okrCycles)
    .set({ status: "closed", updatedAt: new Date(), updatedBy })
    .where(
      and(
        eq(okrCycles.workspaceId, workspaceId),
        eq(okrCycles.status, "active"),
        ne(okrCycles.id, keepCycleId),
        isNull(okrCycles.deletedAt),
      ),
    );
}

// ─── Objectives ──────────────────────────────────────────────────────────────

export async function findObjectivesByWorkspace(
  workspaceId: string,
  filters?: { cycleId?: string; status?: string },
): Promise<OkrObjective[]> {
  return db.query.okrObjectives.findMany({
    where: and(
      eq(okrObjectives.workspaceId, workspaceId),
      isNull(okrObjectives.deletedAt),
      filters?.cycleId ? eq(okrObjectives.cycleId, filters.cycleId) : undefined,
      filters?.status
        ? eq(
            okrObjectives.status,
            filters.status as OkrObjective["status"],
          )
        : undefined,
    ),
    orderBy: [asc(okrObjectives.sortOrder), desc(okrObjectives.createdAt)],
  });
}

export async function findObjectiveById(id: string): Promise<OkrObjective | undefined> {
  return db.query.okrObjectives.findFirst({
    where: and(eq(okrObjectives.id, id), isNull(okrObjectives.deletedAt)),
  });
}

export async function createObjective(data: NewOkrObjective): Promise<OkrObjective> {
  const [objective] = await db.insert(okrObjectives).values(data).returning();
  if (!objective) throw new Error("Failed to create objective");
  return objective;
}

export async function updateObjective(
  id: string,
  data: Partial<NewOkrObjective>,
): Promise<OkrObjective> {
  const [updated] = await db
    .update(okrObjectives)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(okrObjectives.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update objective");
  return updated;
}

export async function softDeleteObjective(id: string): Promise<void> {
  await db
    .update(okrObjectives)
    .set({ deletedAt: new Date() })
    .where(eq(okrObjectives.id, id));
}

export async function archiveObjective(id: string): Promise<void> {
  await db
    .update(okrObjectives)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(okrObjectives.id, id));
}

// ─── Key Results ─────────────────────────────────────────────────────────────

export async function findKeyResultsByWorkspace(
  workspaceId: string,
  filters?: { cycleId?: string; objectiveId?: string; status?: string },
): Promise<OkrKeyResult[]> {
  return db.query.okrKeyResults.findMany({
    where: and(
      eq(okrKeyResults.workspaceId, workspaceId),
      isNull(okrKeyResults.deletedAt),
      filters?.cycleId ? eq(okrKeyResults.cycleId, filters.cycleId) : undefined,
      filters?.objectiveId ? eq(okrKeyResults.objectiveId, filters.objectiveId) : undefined,
      filters?.status
        ? eq(okrKeyResults.status, filters.status as OkrKeyResult["status"])
        : undefined,
    ),
    orderBy: [asc(okrKeyResults.sortOrder), desc(okrKeyResults.createdAt)],
  });
}

export async function findKeyResultsByObjectiveIds(objectiveIds: string[]): Promise<OkrKeyResult[]> {
  if (objectiveIds.length === 0) return [];
  return db.query.okrKeyResults.findMany({
    where: and(inArray(okrKeyResults.objectiveId, objectiveIds), isNull(okrKeyResults.deletedAt)),
    orderBy: [asc(okrKeyResults.sortOrder)],
  });
}

export async function findKeyResultsByIds(ids: string[]): Promise<OkrKeyResult[]> {
  if (ids.length === 0) return [];
  return db.query.okrKeyResults.findMany({
    where: and(inArray(okrKeyResults.id, ids), isNull(okrKeyResults.deletedAt)),
  });
}

export async function findObjectivesByIds(ids: string[]): Promise<OkrObjective[]> {
  if (ids.length === 0) return [];
  return db.query.okrObjectives.findMany({
    where: and(inArray(okrObjectives.id, ids), isNull(okrObjectives.deletedAt)),
  });
}

export async function findKeyResultById(id: string): Promise<OkrKeyResult | undefined> {
  return db.query.okrKeyResults.findFirst({
    where: and(eq(okrKeyResults.id, id), isNull(okrKeyResults.deletedAt)),
  });
}

export async function createKeyResult(data: NewOkrKeyResult): Promise<OkrKeyResult> {
  const [kr] = await db.insert(okrKeyResults).values(data).returning();
  if (!kr) throw new Error("Failed to create key result");
  return kr;
}

export async function updateKeyResult(
  id: string,
  data: Partial<NewOkrKeyResult>,
): Promise<OkrKeyResult> {
  const [updated] = await db
    .update(okrKeyResults)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(okrKeyResults.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update key result");
  return updated;
}

export async function softDeleteKeyResult(id: string): Promise<void> {
  await db
    .update(okrKeyResults)
    .set({ deletedAt: new Date() })
    .where(eq(okrKeyResults.id, id));
}

// ─── Key Result Updates ───────────────────────────────────────────────────────

export async function findUpdatesByKeyResult(keyResultId: string): Promise<OkrKeyResultUpdate[]> {
  return db.query.okrKeyResultUpdates.findMany({
    where: eq(okrKeyResultUpdates.keyResultId, keyResultId),
    orderBy: [desc(okrKeyResultUpdates.createdAt)],
  });
}

export async function createKeyResultUpdate(
  data: NewOkrKeyResultUpdate,
): Promise<OkrKeyResultUpdate> {
  const [update] = await db.insert(okrKeyResultUpdates).values(data).returning();
  if (!update) throw new Error("Failed to create key result update");
  return update;
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function findGroupsByWorkspace(workspaceId: string): Promise<OkrGroup[]> {
  return db.query.okrGroups.findMany({
    where: eq(okrGroups.workspaceId, workspaceId),
    orderBy: [asc(okrGroups.name)],
  });
}

export async function createGroup(data: NewOkrGroup): Promise<OkrGroup> {
  const [group] = await db.insert(okrGroups).values(data).returning();
  if (!group) throw new Error("Failed to create group");
  return group;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface CycleDashboardStats {
  totalObjectives: number;
  draftObjectives: number;
  onTrackObjectives: number;
  atRiskObjectives: number;
  offTrackObjectives: number;
  completedObjectives: number;
  totalKeyResults: number;
  avgKrProgress: number;
  draftKrs: number;
  onTrackKrs: number;
  atRiskKrs: number;
  offTrackKrs: number;
  completedKrs: number;
}

export async function getDashboardStats(
  workspaceId: string,
  cycleId?: string,
): Promise<CycleDashboardStats> {
  const [objectives, krs] = await Promise.all([
    db.query.okrObjectives.findMany({
      columns: { status: true },
      where: and(
        eq(okrObjectives.workspaceId, workspaceId),
        isNull(okrObjectives.deletedAt),
        cycleId ? eq(okrObjectives.cycleId, cycleId) : undefined,
      ),
    }),
    db.query.okrKeyResults.findMany({
      columns: { status: true, progressPercent: true },
      where: and(
        eq(okrKeyResults.workspaceId, workspaceId),
        isNull(okrKeyResults.deletedAt),
        cycleId ? eq(okrKeyResults.cycleId, cycleId) : undefined,
      ),
    }),
  ]);

  const count = <T extends { status: string }>(rows: T[], status: string) =>
    rows.filter((r) => r.status === status).length;

  const avgKrProgress =
    krs.length === 0
      ? 0
      : Math.round((krs.reduce((s, kr) => s + kr.progressPercent, 0) / krs.length) * 10) / 10;

  return {
    totalObjectives: objectives.length,
    draftObjectives: count(objectives, "draft"),
    onTrackObjectives: count(objectives, "on_track"),
    atRiskObjectives: count(objectives, "at_risk"),
    offTrackObjectives: count(objectives, "off_track"),
    completedObjectives: count(objectives, "completed"),
    totalKeyResults: krs.length,
    avgKrProgress,
    draftKrs: count(krs, "draft"),
    onTrackKrs: count(krs, "on_track"),
    atRiskKrs: count(krs, "at_risk"),
    offTrackKrs: count(krs, "off_track"),
    completedKrs: count(krs, "completed"),
  };
}

export async function findRecentKrUpdates(
  workspaceId: string,
  cycleId?: string,
  limit = 10,
): Promise<OkrKeyResultUpdate[]> {
  // Get KR ids in workspace (and optionally cycle)
  const krs = await findKeyResultsByWorkspace(workspaceId, cycleId ? { cycleId } : undefined);
  const krIds = krs.map((kr) => kr.id);
  if (krIds.length === 0) return [];

  return db.query.okrKeyResultUpdates.findMany({
    where: inArray(okrKeyResultUpdates.keyResultId, krIds),
    orderBy: [desc(okrKeyResultUpdates.createdAt)],
    limit,
  });
}
