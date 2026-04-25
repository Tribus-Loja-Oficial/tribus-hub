import type { ObjectiveWithKRs } from "@/features/okr/lib/okr-okrs-list-search";

/** Ordem de status unificado (Planejado → Em Progresso → Concluído). */
export const OKR_WORKFLOW_STATUS_RANK: Record<string, number> = {
  planned: 0,
  in_progress: 1,
  completed: 2,
};

export type OkrListSortField = "title" | "status" | "progress" | "meta";

function targetDateSortValue(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function workflowRank(o: ObjectiveWithKRs): number {
  const slug = o.workflowStatusInsight?.slug ?? "planned";
  return OKR_WORKFLOW_STATUS_RANK[slug] ?? 99;
}

function compareObjectives(
  a: ObjectiveWithKRs,
  b: ObjectiveWithKRs,
  field: OkrListSortField,
): number {
  switch (field) {
    case "title":
      return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
    case "status": {
      const ra = workflowRank(a);
      const rb = workflowRank(b);
      return ra - rb;
    }
    case "progress":
      return a.progressPercent - b.progressPercent;
    case "meta":
      return targetDateSortValue(a.targetDate) - targetDateSortValue(b.targetDate);
    default:
      return 0;
  }
}

/**
 * Ordena a lista de objetivos no cliente.
 * `field === null` mantém a ordem recebida (ex.: API).
 */
export function sortOkrObjectivesForList(
  list: ObjectiveWithKRs[],
  field: OkrListSortField | null,
  direction: "asc" | "desc",
): ObjectiveWithKRs[] {
  if (!field || list.length <= 1) return [...list];
  const next = [...list];
  next.sort((a, b) => {
    const raw = compareObjectives(a, b, field);
    return direction === "asc" ? raw : -raw;
  });
  return next;
}
