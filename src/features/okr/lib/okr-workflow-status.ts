import type { WorkflowStatusInsight } from "@/lib/types/domain";
import { parseCivilDateInput, startOfLocalDay } from "@/lib/date/civil-date";

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
 *
 * Comparações por **dia civil** no fuso local (sem deslocar `yyyy-MM-dd` para UTC).
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
  const today = startOfLocalDay(now);
  /** Datas do próprio registo (formulário) vencem a janela preenchida da API, que às vezes reflete só o ciclo. */
  const windowStartRaw =
    input.startDate != null && String(input.startDate).trim() !== ""
      ? String(input.startDate)
      : (base.windowStart ?? null);
  const windowEndRaw =
    input.targetDate != null && String(input.targetDate).trim() !== ""
      ? String(input.targetDate)
      : (base.windowEnd ?? null);
  const start = parseCivilDateInput(windowStartRaw);
  const end = parseCivilDateInput(windowEndRaw);

  if (end && today.getTime() > startOfLocalDay(end).getTime()) {
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

  if (start && today.getTime() < startOfLocalDay(start).getTime()) {
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
