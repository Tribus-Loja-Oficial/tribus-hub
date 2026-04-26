import type { WorkflowStatusInsight } from "@/lib/types/domain";

function dayUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasReachedGoal(progressPercent: number | null | undefined): boolean {
  if (typeof progressPercent !== "number") return false;
  return progressPercent >= 100;
}

export function isFinalOkrWorkflowStatus(
  slug: WorkflowStatusInsight["slug"] | null | undefined,
): boolean {
  return slug === "achieved" || slug === "not_achieved";
}

/**
 * Regra de status para Objetivos/KRs (coluna operacional):
 * - Planejado: antes da data inicial
 * - Em progresso: dentro da janela
 * - Atingido / Não Atingido: após data final, conforme progresso
 */
export function deriveOkrWorkflowStatusInsight(input: {
  workflowStatusInsight?: WorkflowStatusInsight | null;
  startDate?: string | null;
  targetDate?: string | null;
  progressPercent?: number | null;
  now?: Date;
}): WorkflowStatusInsight | null {
  const base = input.workflowStatusInsight;
  if (!base) return null;

  const now = input.now ?? new Date();
  const nowDay = dayUtc(now);
  const windowStartRaw = base.windowStart ?? input.startDate ?? null;
  const windowEndRaw = base.windowEnd ?? input.targetDate ?? null;
  const start = parseDate(windowStartRaw);
  const end = parseDate(windowEndRaw);

  if (end && nowDay > dayUtc(end)) {
    const achieved = hasReachedGoal(input.progressPercent);
    return {
      ...base,
      slug: achieved ? "achieved" : "not_achieved",
      labelPt: achieved ? "Atingido" : "Não Atingido",
      windowStart: windowStartRaw,
      windowEnd: windowEndRaw,
      locked: true,
      explanationPt: achieved
        ? "A data final passou e a meta foi atingida."
        : "A data final passou e a meta não foi atingida.",
    };
  }

  if (start && nowDay < dayUtc(start)) {
    return {
      ...base,
      slug: "planned",
      labelPt: "Planejado",
      windowStart: windowStartRaw,
      windowEnd: windowEndRaw,
      locked: false,
      explanationPt: "A janela ainda não começou.",
    };
  }

  return {
    ...base,
    slug: "in_progress",
    labelPt: "Em Progresso",
    windowStart: windowStartRaw,
    windowEnd: windowEndRaw,
    locked: false,
    explanationPt: "Estamos dentro da janela planejada.",
  };
}
