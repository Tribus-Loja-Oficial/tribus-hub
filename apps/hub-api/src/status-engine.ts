export type UnifiedEntityKind =
  | "okr_objective"
  | "okr_key_result"
  | "project"
  | "milestone"
  | "cycle";

export type UnifiedStatusResult =
  | "planned"
  | "in_progress"
  | "completed"
  | "achieved"
  | "not_achieved"
  | "successful"
  | "partially_successful"
  | "failed"
  | "blocked"
  | "cancelled";

export function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, Number(v || 0)));
}

export function resolveUnifiedStatus(input: {
  kind: UnifiedEntityKind;
  dbStatus: string;
  progressPercent: number;
  windowStart: string | null;
  windowEnd: string | null;
  isBeforeStart: boolean;
  isAfterEnd: boolean;
  isDraft?: boolean;
  isManuallyBlocked?: boolean;
}): UnifiedStatusResult {
  const p = clampPercent(input.progressPercent);
  const hasWindow = Boolean(input.windowStart && input.windowEnd);
  const kind = input.kind;
  const dbStatus = String(input.dbStatus ?? "");

  if (input.isDraft) return "planned";

  if (kind === "cycle") {
    if (dbStatus === "closed") return "completed";
    if (!hasWindow) return dbStatus === "active" ? "in_progress" : "planned";
    if (input.isBeforeStart) return "planned";
    if (input.isAfterEnd) return "completed";
    return "in_progress";
  }

  if (kind === "project") {
    if (dbStatus === "cancelled") return "cancelled";
    if (dbStatus === "on_hold" || dbStatus === "blocked" || input.isManuallyBlocked)
      return "blocked";
    if (dbStatus === "completed") return "successful";
    if (!hasWindow || input.isBeforeStart) return "planned";
    if (!input.isAfterEnd) return "in_progress";
    if (p >= 100) return "successful";
    if (p >= 80) return "partially_successful";
    return "failed";
  }

  if (kind === "milestone") {
    if (dbStatus === "blocked" || input.isManuallyBlocked) return "blocked";
    if (dbStatus === "missed") return "failed";
    if (p >= 100) return "successful";
    if (!hasWindow || input.isBeforeStart) return "planned";
    if (!input.isAfterEnd) return "in_progress";
    if (p >= 80) return "partially_successful";
    return "failed";
  }

  // OKR objective / KR
  if (dbStatus === "completed" && p >= 100) return "completed";
  if (!hasWindow || input.isBeforeStart) return "planned";
  if (!input.isAfterEnd) return "in_progress";
  return p >= 80 ? "achieved" : "not_achieved";
}
