import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { NotFoundError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";
import type { OkrCycle, OkrObjective, OkrKeyResult, OkrKeyResultUpdate } from "@/lib/db/schema";
import type {
  CreateCycleInput,
  UpdateCycleInput,
  CreateObjectiveInput,
  UpdateObjectiveInput,
  CreateKeyResultInput,
  UpdateKeyResultInput,
  CreateKeyResultUpdateInput,
} from "@/lib/schemas/okr.schemas";

// ─── Types (used by client components + API) ────────────────────────────────

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

export type CycleDashboardStats = {
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
};

export type DashboardData = {
  activeCycle: OkrCycle | null;
  allCycles: OkrCycle[];
  stats: CycleDashboardStats;
  attentionItems: DashboardAttentionItem[];
  recentUpdates: RecentKrUpdateWithContext[];
  objectives: ObjectiveWithKRsForDashboard[];
  cyclePace: CyclePace | null;
};

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

// ─── Cycles ──────────────────────────────────────────────────────────────────

export async function listCyclesWithStats(user: AuthenticatedUser): Promise<OkrCycleWithStats[]> {
  return hubApiFetch<OkrCycleWithStats[]>({
    path: "/v1/okr/cycles",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

export async function getCycle(user: AuthenticatedUser, id: string): Promise<OkrCycle> {
  try {
    return await hubApiFetch<OkrCycle>({
      path: `/v1/okr/cycles/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
  } catch {
    throw new NotFoundError("Cycle", id);
  }
}

export async function createCycle(user: AuthenticatedUser, input: CreateCycleInput): Promise<OkrCycle> {
  return hubApiFetch<OkrCycle>({
    method: "POST",
    path: "/v1/okr/cycles",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: input.title,
      description: input.description ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "planned",
    },
  });
}

export async function updateCycle(
  user: AuthenticatedUser,
  id: string,
  input: UpdateCycleInput,
): Promise<OkrCycle> {
  return hubApiFetch<OkrCycle>({
    method: "PATCH",
    path: `/v1/okr/cycles/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: input,
  });
}

export async function deleteCycle(user: AuthenticatedUser, id: string): Promise<void> {
  await hubApiFetch({
    method: "DELETE",
    path: `/v1/okr/cycles/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

// ─── Objectives ──────────────────────────────────────────────────────────────

export async function listObjectives(
  user: AuthenticatedUser,
  filters?: { cycleId?: string; status?: string },
): Promise<ObjectiveWithKRs[]> {
  const sp = new URLSearchParams();
  if (filters?.cycleId) sp.set("cycleId", filters.cycleId);
  if (filters?.status) sp.set("status", filters.status);
  const q = sp.toString();
  return hubApiFetch<ObjectiveWithKRs[]>({
    path: `/v1/okr/objectives${q ? `?${q}` : ""}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

export async function getObjective(user: AuthenticatedUser, id: string): Promise<ObjectiveWithKRs> {
  try {
    return await hubApiFetch<ObjectiveWithKRs>({
      path: `/v1/okr/objectives/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
  } catch {
    throw new NotFoundError("Objective", id);
  }
}

export async function createObjective(
  user: AuthenticatedUser,
  input: CreateObjectiveInput,
): Promise<OkrObjective> {
  return hubApiFetch<OkrObjective>({
    method: "POST",
    path: "/v1/okr/objectives",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: input.title,
      descriptionText: input.descriptionText ?? null,
      cycleId: input.cycleId,
      ownerUserId: input.ownerUserId,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate,
      targetDate: input.targetDate,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateObjective(
  user: AuthenticatedUser,
  id: string,
  input: UpdateObjectiveInput,
): Promise<OkrObjective> {
  return hubApiFetch<OkrObjective>({
    method: "PATCH",
    path: `/v1/okr/objectives/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: input,
  });
}

export async function deleteObjective(user: AuthenticatedUser, id: string): Promise<void> {
  await hubApiFetch({
    method: "DELETE",
    path: `/v1/okr/objectives/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

// ─── Key Results ─────────────────────────────────────────────────────────────

export async function listKeyResults(
  user: AuthenticatedUser,
  filters?: { cycleId?: string; objectiveId?: string; status?: string },
): Promise<OkrKeyResult[]> {
  const sp = new URLSearchParams();
  if (filters?.cycleId) sp.set("cycleId", filters.cycleId);
  if (filters?.objectiveId) sp.set("objectiveId", filters.objectiveId);
  if (filters?.status) sp.set("status", filters.status);
  const q = sp.toString();
  return hubApiFetch<OkrKeyResult[]>({
    path: `/v1/okr/key-results${q ? `?${q}` : ""}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

export async function getKeyResult(user: AuthenticatedUser, id: string): Promise<OkrKeyResult> {
  try {
    return await hubApiFetch<OkrKeyResult>({
      path: `/v1/okr/key-results/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
  } catch {
    throw new NotFoundError("Key Result", id);
  }
}

export async function createKeyResult(
  user: AuthenticatedUser,
  input: CreateKeyResultInput,
): Promise<OkrKeyResult> {
  return hubApiFetch<OkrKeyResult>({
    method: "POST",
    path: "/v1/okr/key-results",
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: {
      title: input.title,
      descriptionText: input.descriptionText ?? null,
      objectiveId: input.objectiveId,
      cycleId: input.cycleId,
      ownerUserId: input.ownerUserId,
      metricType: input.metricType,
      unit: input.unit,
      startValue: input.startValue,
      currentValue: input.currentValue,
      targetValue: input.targetValue,
      status: input.status,
      confidence: input.confidence,
      startDate: input.startDate,
      targetDate: input.targetDate,
      sortOrder: input.sortOrder,
    },
  });
}

export async function updateKeyResult(
  user: AuthenticatedUser,
  id: string,
  input: UpdateKeyResultInput,
): Promise<OkrKeyResult> {
  return hubApiFetch<OkrKeyResult>({
    method: "PATCH",
    path: `/v1/okr/key-results/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: input,
  });
}

export async function deleteKeyResult(user: AuthenticatedUser, id: string): Promise<void> {
  await hubApiFetch({
    method: "DELETE",
    path: `/v1/okr/key-results/${id}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

export async function updateKeyResultProgress(
  user: AuthenticatedUser,
  krId: string,
  input: CreateKeyResultUpdateInput,
): Promise<{ keyResult: OkrKeyResult; update: OkrKeyResultUpdate }> {
  return hubApiFetch({
    method: "POST",
    path: `/v1/okr/key-results/${krId}/updates`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    body: { newValue: input.newValue, comment: input.comment ?? null },
  });
}

export async function getKeyResultUpdates(
  user: AuthenticatedUser,
  krId: string,
): Promise<OkrKeyResultUpdate[]> {
  return hubApiFetch<OkrKeyResultUpdate[]>({
    path: `/v1/okr/key-results/${krId}/updates`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboard(
  user: AuthenticatedUser,
  cycleId?: string,
): Promise<DashboardData> {
  const q = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : "";
  return hubApiFetch<DashboardData>({
    path: `/v1/okr/dashboard${q}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}
