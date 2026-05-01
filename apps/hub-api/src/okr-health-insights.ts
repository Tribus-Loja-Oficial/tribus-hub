/**
 * OKR pace health at read time — single source for list/detail and aggregate stats.
 * Persisted okr_objectives.status / okr_key_results.status is for writes/ingestion;
 * summaries that must match hierarchy use slug from computePaceHealth here.
 */

import { computePaceHealth, resolveOkrKrWindow, resolveOkrObjectiveWindow } from "./pace-health";
import {
  effectiveHealthSnapshotForOkrPace,
  effectiveOkrStatusForPaceAndWorkflow,
} from "./okr-pace-integrity";
import type { HealthInsightDto } from "./pace-health";

export function healthInsightForObjective(
  o: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
): HealthInsightDto {
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

export function healthInsightForKr(
  kr: Record<string, unknown>,
  objective: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
): HealthInsightDto {
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

export function isOkrPaceRiskSlug(slug: string): boolean {
  return slug === "at_risk" || slug === "off_track";
}

function cycleRowForEntity(
  cycleId: string | null | undefined,
  cycleById: Map<string, Record<string, unknown>>,
): Record<string, unknown> | null {
  if (!cycleId) return null;
  return cycleById.get(String(cycleId)) ?? null;
}

/** Exclui concluídos (meta) dos buckets de health do dashboard — evita snapshot “no rumo” contar duas vezes. */
export function isOkrCompletedForDashboardCounts(
  statusRaw: string,
  progressPercent: number,
): boolean {
  return effectiveOkrStatusForPaceAndWorkflow(statusRaw, progressPercent) === "completed";
}

/**
 * Buckets alinhados à UI do dashboard OKR (mesmos slugs que a hierarquia / healthInsight).
 * - No rumo: on_track + ahead (+ completed_legacy raro para não-concluído)
 * - Planejado: draft (cadastro) + no_dates + not_started (cadência)
 * Concluídos: use countOkrCompletedObjectives / countOkrCompletedKrs separadamente.
 */
export type OkrDashboardPaceBuckets = {
  onTrack: number;
  planejado: number;
  atRisk: number;
  offTrack: number;
};

function bucketOkrHealthSlug(slug: string): keyof OkrDashboardPaceBuckets | null {
  if (slug === "on_track" || slug === "ahead" || slug === "completed_legacy") return "onTrack";
  if (slug === "draft" || slug === "no_dates" || slug === "not_started") return "planejado";
  if (slug === "at_risk") return "atRisk";
  if (slug === "off_track") return "offTrack";
  return null;
}

export function countObjectiveDashboardPaceBuckets(
  objectives: Record<string, unknown>[],
  cycleById: Map<string, Record<string, unknown>>,
): OkrDashboardPaceBuckets {
  const out: OkrDashboardPaceBuckets = { onTrack: 0, planejado: 0, atRisk: 0, offTrack: 0 };
  for (const o of objectives) {
    const raw = String(o.status ?? "draft");
    const p = Number(o.progress_percent ?? 0);
    if (isOkrCompletedForDashboardCounts(raw, p)) continue;
    const cycle = cycleRowForEntity(o.cycle_id as string | null | undefined, cycleById);
    const slug = healthInsightForObjective(o, cycle).slug;
    const b = bucketOkrHealthSlug(slug);
    if (b) out[b] += 1;
    else out.planejado += 1;
  }
  return out;
}

export function countKrDashboardPaceBuckets(
  keyResults: Record<string, unknown>[],
  objectiveById: Map<string, Record<string, unknown>>,
  cycleById: Map<string, Record<string, unknown>>,
): OkrDashboardPaceBuckets {
  const out: OkrDashboardPaceBuckets = { onTrack: 0, planejado: 0, atRisk: 0, offTrack: 0 };
  for (const kr of keyResults) {
    const raw = String(kr.status ?? "draft");
    const p = Number(kr.progress_percent ?? 0);
    if (isOkrCompletedForDashboardCounts(raw, p)) continue;
    const objective = objectiveById.get(String(kr.objective_id ?? "")) ?? {};
    const cid = (kr.cycle_id as string | null) ?? (objective.cycle_id as string | null);
    const cycle = cycleRowForEntity(cid, cycleById);
    const slug = healthInsightForKr(kr, objective, cycle).slug;
    const b = bucketOkrHealthSlug(slug);
    if (b) out[b] += 1;
    else out.planejado += 1;
  }
  return out;
}

export function countOkrCompletedObjectives(objectives: Record<string, unknown>[]): number {
  let n = 0;
  for (const o of objectives) {
    const raw = String(o.status ?? "draft");
    const p = Number(o.progress_percent ?? 0);
    if (isOkrCompletedForDashboardCounts(raw, p)) n += 1;
  }
  return n;
}

export function countOkrCompletedKeyResults(keyResults: Record<string, unknown>[]): number {
  let n = 0;
  for (const kr of keyResults) {
    const raw = String(kr.status ?? "draft");
    const p = Number(kr.progress_percent ?? 0);
    if (isOkrCompletedForDashboardCounts(raw, p)) n += 1;
  }
  return n;
}

/** Pace-based counts for OKR objectives (ciclos; exclui concluídos como no dashboard). */
export function countObjectivePaceRisk(
  objectives: Record<string, unknown>[],
  cycleById: Map<string, Record<string, unknown>>,
): { objectivesAtRisk: number; objectivesOffTrack: number } {
  const b = countObjectiveDashboardPaceBuckets(objectives, cycleById);
  return { objectivesAtRisk: b.atRisk, objectivesOffTrack: b.offTrack };
}

/** Pace-based counts for key results (ciclos; exclui concluídos como no dashboard). */
export function countKrPaceRisk(
  keyResults: Record<string, unknown>[],
  objectiveById: Map<string, Record<string, unknown>>,
  cycleById: Map<string, Record<string, unknown>>,
): { krsAtRisk: number; krsOffTrack: number } {
  const b = countKrDashboardPaceBuckets(keyResults, objectiveById, cycleById);
  return { krsAtRisk: b.atRisk, krsOffTrack: b.offTrack };
}
