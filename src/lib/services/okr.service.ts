import * as okrRepo from "@/lib/repositories/okr.repository";
import * as usersRepo from "@/lib/repositories/users.repository";
import { NotFoundError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";
import type { OkrCycle, OkrObjective, OkrKeyResult, OkrKeyResultUpdate } from "@/lib/db/schema";
import { differenceInDays, isAfter, isBefore } from "date-fns";
import type {
  CreateCycleInput,
  UpdateCycleInput,
  CreateObjectiveInput,
  UpdateObjectiveInput,
  CreateKeyResultInput,
  UpdateKeyResultInput,
  CreateKeyResultUpdateInput,
} from "@/lib/schemas/okr.schemas";
import { slugify, uniqueSlug } from "@/lib/utils/ids";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

export type ObjectiveWithKRsForDashboard = ObjectiveWithKRs & {
  ownerDisplayName: string | null;
};

export type DashboardAttentionItem = {
  kind: "objective" | "key_result";
  id: string;
  title: string;
  reason: string;
  href: string;
  severity: "high" | "medium";
  score: number;
  progressPercent: number;
  status: string;
  objectiveTitle?: string;
};

export type RecentKrUpdateWithContext = OkrKeyResultUpdate & {
  keyResultTitle: string;
  objectiveId: string;
  objectiveTitle: string;
  updatedByName: string | null;
};

export type CyclePace = {
  elapsedPercent: number;
  avgKrProgress: number;
  verdict: "ahead" | "aligned" | "behind";
  diff: number;
};

export type DashboardData = {
  activeCycle: OkrCycle | null;
  allCycles: OkrCycle[];
  stats: okrRepo.CycleDashboardStats;
  attentionItems: DashboardAttentionItem[];
  recentUpdates: RecentKrUpdateWithContext[];
  objectives: ObjectiveWithKRsForDashboard[];
  cyclePace: CyclePace | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveSlug(
  check: (slug: string) => Promise<boolean>,
  title: string,
): Promise<string> {
  const base = slugify(title);
  const exists = await check(base);
  return exists ? uniqueSlug(title) : base;
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

export async function listCycles(user: AuthenticatedUser): Promise<OkrCycle[]> {
  return okrRepo.findCyclesByWorkspace(user.workspaceId);
}

/** Métricas agregadas por ciclo (objetivos e KRs com o mesmo cycleId). */
export type CycleCardStats = {
  objectiveCount: number;
  keyResultCount: number;
  objectivesCompleted: number;
  krsCompleted: number;
  objectivesAtRisk: number;
  objectivesOffTrack: number;
  krsAtRisk: number;
  krsOffTrack: number;
  avgKrProgress: number;
};

export type OkrCycleWithStats = OkrCycle & { stats: CycleCardStats };

function computeCycleStats(
  cycleId: string,
  objectives: OkrObjective[],
  krs: OkrKeyResult[],
): CycleCardStats {
  const objs = objectives.filter((o) => o.cycleId === cycleId);
  const krList = krs.filter((k) => k.cycleId === cycleId);
  const avgKrProgress =
    krList.length === 0
      ? 0
      : Math.round((krList.reduce((s, k) => s + k.progressPercent, 0) / krList.length) * 10) / 10;
  return {
    objectiveCount: objs.length,
    keyResultCount: krList.length,
    objectivesCompleted: objs.filter((o) => o.status === "completed").length,
    krsCompleted: krList.filter((k) => k.status === "completed").length,
    objectivesAtRisk: objs.filter((o) => o.status === "at_risk").length,
    objectivesOffTrack: objs.filter((o) => o.status === "off_track").length,
    krsAtRisk: krList.filter((k) => k.status === "at_risk").length,
    krsOffTrack: krList.filter((k) => k.status === "off_track").length,
    avgKrProgress,
  };
}

export async function listCyclesWithStats(user: AuthenticatedUser): Promise<OkrCycleWithStats[]> {
  const [cycles, objectives, krs] = await Promise.all([
    okrRepo.findCyclesByWorkspace(user.workspaceId),
    okrRepo.findObjectivesByWorkspace(user.workspaceId),
    okrRepo.findKeyResultsByWorkspace(user.workspaceId),
  ]);
  return cycles.map((c) => ({
    ...c,
    stats: computeCycleStats(c.id, objectives, krs),
  }));
}

export async function getCycle(user: AuthenticatedUser, id: string): Promise<OkrCycle> {
  const cycle = await okrRepo.findCycleById(id);
  if (!cycle || cycle.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Cycle", id);
  }
  return cycle;
}

export async function createCycle(
  user: AuthenticatedUser,
  input: CreateCycleInput,
): Promise<OkrCycle> {
  const slug = await resolveSlug((s) => okrRepo.cycleSlugExists(user.workspaceId, s), input.title);
  return okrRepo.createCycle({
    workspaceId: user.workspaceId,
    title: input.title,
    slug,
    description: input.description ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status ?? "planned",
    createdBy: user.id,
    updatedBy: user.id,
  });
}

export async function updateCycle(
  user: AuthenticatedUser,
  id: string,
  input: UpdateCycleInput,
): Promise<OkrCycle> {
  const cycle = await getCycle(user, id);
  if (input.status === "active" && cycle.status !== "active") {
    await okrRepo.closeOtherActiveCycles(user.workspaceId, cycle.id, user.id);
  }
  return okrRepo.updateCycle(cycle.id, {
    ...input,
    updatedBy: user.id,
  });
}

export async function deleteCycle(user: AuthenticatedUser, id: string): Promise<void> {
  const cycle = await getCycle(user, id);
  await okrRepo.softDeleteCycle(cycle.id);
}

// ─── Objectives ──────────────────────────────────────────────────────────────

export async function listObjectives(
  user: AuthenticatedUser,
  filters?: { cycleId?: string; status?: string },
): Promise<ObjectiveWithKRs[]> {
  const objectives = await okrRepo.findObjectivesByWorkspace(user.workspaceId, filters);
  const objectiveIds = objectives.map((o) => o.id);
  const keyResults = await okrRepo.findKeyResultsByObjectiveIds(objectiveIds);

  const krByObjective = new Map<string, OkrKeyResult[]>();
  for (const kr of keyResults) {
    const list = krByObjective.get(kr.objectiveId) ?? [];
    list.push(kr);
    krByObjective.set(kr.objectiveId, list);
  }

  return objectives.map((o) => ({
    ...o,
    keyResults: krByObjective.get(o.id) ?? [],
  }));
}

export async function getObjective(
  user: AuthenticatedUser,
  id: string,
): Promise<ObjectiveWithKRs> {
  const objective = await okrRepo.findObjectiveById(id);
  if (!objective || objective.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Objective", id);
  }
  const keyResults = await okrRepo.findKeyResultsByObjectiveIds([objective.id]);
  return { ...objective, keyResults };
}

export async function createObjective(
  user: AuthenticatedUser,
  input: CreateObjectiveInput,
): Promise<OkrObjective> {
  const slug = await resolveSlug((s) => okrRepo.objectiveSlugExists(user.workspaceId, s), input.title);
  return okrRepo.createObjective({
    workspaceId: user.workspaceId,
    cycleId: input.cycleId ?? null,
    title: input.title,
    slug,
    descriptionText: input.descriptionText ?? null,
    ownerUserId: input.ownerUserId ?? null,
    status: input.status ?? "draft",
    priority: input.priority ?? "medium",
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    sortOrder: input.sortOrder ?? 0,
    progressPercent: 0,
    createdBy: user.id,
    updatedBy: user.id,
  });
}

export async function updateObjective(
  user: AuthenticatedUser,
  id: string,
  input: UpdateObjectiveInput,
): Promise<OkrObjective> {
  const objective = await okrRepo.findObjectiveById(id);
  if (!objective || objective.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Objective", id);
  }
  return okrRepo.updateObjective(objective.id, {
    ...input,
    cycleId: input.cycleId !== undefined ? (input.cycleId ?? null) : undefined,
    ownerUserId: input.ownerUserId !== undefined ? (input.ownerUserId ?? null) : undefined,
    updatedBy: user.id,
  });
}

export async function deleteObjective(user: AuthenticatedUser, id: string): Promise<void> {
  const objective = await okrRepo.findObjectiveById(id);
  if (!objective || objective.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Objective", id);
  }
  await okrRepo.softDeleteObjective(objective.id);
}

// ─── Key Results ─────────────────────────────────────────────────────────────

export async function listKeyResults(
  user: AuthenticatedUser,
  filters?: { cycleId?: string; objectiveId?: string; status?: string },
): Promise<OkrKeyResult[]> {
  return okrRepo.findKeyResultsByWorkspace(user.workspaceId, filters);
}

export async function getKeyResult(user: AuthenticatedUser, id: string): Promise<OkrKeyResult> {
  const kr = await okrRepo.findKeyResultById(id);
  if (!kr || kr.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Key Result", id);
  }
  return kr;
}

export async function createKeyResult(
  user: AuthenticatedUser,
  input: CreateKeyResultInput,
): Promise<OkrKeyResult> {
  // Validate objective belongs to workspace
  const objective = await okrRepo.findObjectiveById(input.objectiveId);
  if (!objective || objective.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Objective", input.objectiveId);
  }

  const slug = await resolveSlug((s) => okrRepo.krSlugExists(user.workspaceId, s), input.title);
  const startValue = input.startValue ?? 0;
  const targetValue = input.targetValue;
  const currentValue = input.currentValue ?? startValue;
  const metricType = input.metricType ?? "number";
  const progress = okrRepo.calcKrProgress(startValue, currentValue, targetValue, metricType);

  const kr = await okrRepo.createKeyResult({
    workspaceId: user.workspaceId,
    cycleId: input.cycleId ?? objective.cycleId ?? null,
    objectiveId: input.objectiveId,
    title: input.title,
    slug,
    descriptionText: input.descriptionText ?? null,
    ownerUserId: input.ownerUserId ?? null,
    metricType,
    unit: input.unit ?? null,
    startValue,
    currentValue,
    targetValue,
    progressPercent: progress,
    status: input.status ?? "draft",
    confidence: input.confidence ?? 50,
    startDate: input.startDate ?? null,
    targetDate: input.targetDate ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdBy: user.id,
    updatedBy: user.id,
  });

  // Refresh objective progress
  await refreshObjectiveProgress(user, objective.id);

  return kr;
}

export async function updateKeyResult(
  user: AuthenticatedUser,
  id: string,
  input: UpdateKeyResultInput,
): Promise<OkrKeyResult> {
  const kr = await okrRepo.findKeyResultById(id);
  if (!kr || kr.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Key Result", id);
  }

  const startValue = input.startValue ?? kr.startValue;
  const currentValue = input.currentValue ?? kr.currentValue;
  const targetValue = input.targetValue ?? kr.targetValue;
  const metricType = input.metricType ?? kr.metricType;
  const progress = okrRepo.calcKrProgress(startValue, currentValue, targetValue, metricType);

  const updated = await okrRepo.updateKeyResult(kr.id, {
    ...input,
    cycleId: input.cycleId !== undefined ? (input.cycleId ?? null) : undefined,
    ownerUserId: input.ownerUserId !== undefined ? (input.ownerUserId ?? null) : undefined,
    startValue,
    currentValue,
    targetValue,
    progressPercent: progress,
    updatedBy: user.id,
  });

  // Refresh parent objective progress
  await refreshObjectiveProgress(user, kr.objectiveId);

  return updated;
}

export async function deleteKeyResult(user: AuthenticatedUser, id: string): Promise<void> {
  const kr = await okrRepo.findKeyResultById(id);
  if (!kr || kr.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Key Result", id);
  }
  await okrRepo.softDeleteKeyResult(kr.id);
  await refreshObjectiveProgress(user, kr.objectiveId);
}

// ─── Key Result Progress Updates ─────────────────────────────────────────────

export async function updateKeyResultProgress(
  user: AuthenticatedUser,
  krId: string,
  input: CreateKeyResultUpdateInput,
): Promise<{ keyResult: OkrKeyResult; update: OkrKeyResultUpdate }> {
  const kr = await okrRepo.findKeyResultById(krId);
  if (!kr || kr.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Key Result", krId);
  }

  const previousValue = kr.currentValue;
  const newValue = input.newValue;
  const progress = okrRepo.calcKrProgress(kr.startValue, newValue, kr.targetValue, kr.metricType);

  // Auto-status suggestion
  let status = kr.status;
  if (progress >= 100) status = "completed";

  const [keyResult, update] = await Promise.all([
    okrRepo.updateKeyResult(kr.id, {
      currentValue: newValue,
      progressPercent: progress,
      status,
      updatedBy: user.id,
    }),
    okrRepo.createKeyResultUpdate({
      keyResultId: kr.id,
      previousValue,
      newValue,
      comment: input.comment ?? null,
      updatedBy: user.id,
    }),
  ]);

  await refreshObjectiveProgress(user, kr.objectiveId);

  return { keyResult, update };
}

export async function getKeyResultUpdates(
  user: AuthenticatedUser,
  krId: string,
): Promise<OkrKeyResultUpdate[]> {
  const kr = await okrRepo.findKeyResultById(krId);
  if (!kr || kr.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Key Result", krId);
  }
  return okrRepo.findUpdatesByKeyResult(kr.id);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const ATTENTION_STALE_DAYS = 14;
const ATTENTION_LOW_CONFIDENCE = 35;
const ATTENTION_NEAR_TARGET_DAYS = 21;

function calcCycleElapsedPercent(cycle: OkrCycle): number {
  const now = new Date();
  const start = new Date(cycle.startDate);
  const end = new Date(cycle.endDate);
  if (isBefore(now, start)) return 0;
  if (isAfter(now, end)) return 100;
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  if (total === 0) return 100;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function buildCyclePace(activeCycle: OkrCycle | null, avgKrProgress: number): CyclePace | null {
  if (!activeCycle) return null;
  const elapsedPercent = calcCycleElapsedPercent(activeCycle);
  const diff = Math.round((avgKrProgress - elapsedPercent) * 10) / 10;
  let verdict: CyclePace["verdict"] = "aligned";
  if (diff >= 5) verdict = "ahead";
  else if (diff <= -5) verdict = "behind";
  return { elapsedPercent, avgKrProgress, verdict, diff };
}

function buildAttentionItems(objectives: ObjectiveWithKRs[]): DashboardAttentionItem[] {
  const now = new Date();
  const candidates: DashboardAttentionItem[] = [];

  for (const o of objectives) {
    if (o.status === "completed") continue;

    if (o.status === "off_track") {
      candidates.push({
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
    } else if (o.status === "at_risk") {
      candidates.push({
        kind: "objective",
        id: o.id,
        title: o.title,
        reason: "Objetivo em risco",
        href: `/okr/objectives/${o.id}`,
        severity: "high",
        score: 95,
        progressPercent: o.progressPercent,
        status: o.status,
      });
    }

    if (o.keyResults.length === 0 && o.status !== "draft") {
      candidates.push({
        kind: "objective",
        id: o.id,
        title: o.title,
        reason: "Objetivo sem key results",
        href: `/okr/objectives/${o.id}`,
        severity: "high",
        score: 88,
        progressPercent: o.progressPercent,
        status: o.status,
      });
    }

    if (o.targetDate && o.progressPercent < 25) {
      const target = new Date(o.targetDate);
      const daysTo = differenceInDays(target, now);
      if (daysTo >= 0 && daysTo <= ATTENTION_NEAR_TARGET_DAYS) {
        candidates.push({
          kind: "objective",
          id: o.id,
          title: o.title,
          reason: `Meta em ${daysTo}d · progresso ${Math.round(o.progressPercent)}%`,
          href: `/okr/objectives/${o.id}`,
          severity: daysTo <= 7 ? "high" : "medium",
          score: 78 - Math.min(14, daysTo),
          progressPercent: o.progressPercent,
          status: o.status,
        });
      }
    }

    for (const kr of o.keyResults) {
      if (kr.status === "completed") continue;

      if (kr.status === "off_track") {
        candidates.push({
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
      } else if (kr.status === "at_risk") {
        candidates.push({
          kind: "key_result",
          id: kr.id,
          title: kr.title,
          reason: "KR em risco",
          href: `/okr/key-results/${kr.id}`,
          severity: "high",
          score: 87,
          progressPercent: kr.progressPercent,
          status: kr.status,
          objectiveTitle: o.title,
        });
      }

      const daysSince = differenceInDays(now, new Date(kr.updatedAt));
      if (daysSince >= ATTENTION_STALE_DAYS) {
        candidates.push({
          kind: "key_result",
          id: kr.id,
          title: kr.title,
          reason: `Sem atualização há ${daysSince} dias`,
          href: `/okr/key-results/${kr.id}`,
          severity: daysSince >= 28 ? "high" : "medium",
          score: 58 + Math.min(22, daysSince),
          progressPercent: kr.progressPercent,
          status: kr.status,
          objectiveTitle: o.title,
        });
      }

      const conf = kr.confidence ?? 50;
      if (conf < ATTENTION_LOW_CONFIDENCE && kr.status !== "draft") {
        candidates.push({
          kind: "key_result",
          id: kr.id,
          title: kr.title,
          reason: `Confiança baixa (${conf}%)`,
          href: `/okr/key-results/${kr.id}`,
          severity: "medium",
          score: 52,
          progressPercent: kr.progressPercent,
          status: kr.status,
          objectiveTitle: o.title,
        });
      }
    }
  }

  const best = new Map<string, DashboardAttentionItem>();
  for (const c of candidates) {
    const key = `${c.kind}:${c.id}`;
    const prev = best.get(key);
    if (!prev || c.score > prev.score) best.set(key, c);
  }

  return Array.from(best.values())
    .sort((a, b) => b.score - a.score || b.progressPercent - a.progressPercent)
    .slice(0, 12);
}

async function enrichRecentKrUpdates(
  raw: OkrKeyResultUpdate[],
  userNameById: Map<string, string>,
): Promise<RecentKrUpdateWithContext[]> {
  if (raw.length === 0) return [];
  const krIds = [...new Set(raw.map((u) => u.keyResultId))];
  const krs = await okrRepo.findKeyResultsByIds(krIds);
  const krMap = new Map(krs.map((k) => [k.id, k]));
  const objIds = [...new Set(krs.map((k) => k.objectiveId))];
  const objs = await okrRepo.findObjectivesByIds(objIds);
  const objMap = new Map(objs.map((x) => [x.id, x]));

  return raw.map((u) => {
    const kr = krMap.get(u.keyResultId);
    const obj = kr ? objMap.get(kr.objectiveId) : undefined;
    return {
      ...u,
      keyResultTitle: kr?.title ?? "Key result",
      objectiveId: kr?.objectiveId ?? "",
      objectiveTitle: obj?.title ?? "Objetivo",
      updatedByName: userNameById.get(u.updatedBy) ?? null,
    };
  });
}

export async function getDashboard(
  user: AuthenticatedUser,
  cycleId?: string,
): Promise<DashboardData> {
  const [allCycles, activeCycle, stats, objectives] = await Promise.all([
    okrRepo.findCyclesByWorkspace(user.workspaceId),
    cycleId ? okrRepo.findCycleById(cycleId) : okrRepo.findActiveCycle(user.workspaceId),
    okrRepo.getDashboardStats(user.workspaceId, cycleId),
    listObjectives(user, cycleId ? { cycleId } : undefined),
  ]);

  const resolvedCycleId = cycleId ?? activeCycle?.id;
  const [rawUpdates, workspaceUsers] = await Promise.all([
    okrRepo.findRecentKrUpdates(user.workspaceId, resolvedCycleId, 12),
    usersRepo.findUsersByWorkspace(user.workspaceId),
  ]);

  const userNameById = new Map(workspaceUsers.map((u) => [u.id, u.name]));
  const objectivesForDashboard: ObjectiveWithKRsForDashboard[] = objectives.map((o) => ({
    ...o,
    ownerDisplayName: o.ownerUserId ? (userNameById.get(o.ownerUserId) ?? null) : null,
  }));

  const attentionItems = buildAttentionItems(objectives);
  const recentUpdates = await enrichRecentKrUpdates(rawUpdates, userNameById);
  const cyclePace = buildCyclePace(activeCycle ?? null, stats.avgKrProgress);

  return {
    activeCycle: activeCycle ?? null,
    allCycles,
    stats,
    attentionItems,
    recentUpdates,
    objectives: objectivesForDashboard,
    cyclePace,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function refreshObjectiveProgress(user: AuthenticatedUser, objectiveId: string) {
  const krs = await okrRepo.findKeyResultsByObjectiveIds([objectiveId]);
  const progress = okrRepo.calcObjectiveProgress(krs);
  await okrRepo.updateObjective(objectiveId, {
    progressPercent: progress,
    updatedBy: user.id,
  });
}
