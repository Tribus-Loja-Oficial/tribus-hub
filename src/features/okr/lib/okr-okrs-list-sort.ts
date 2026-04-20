import type { ObjectiveWithKRs } from "@/features/okr/lib/okr-okrs-list-search";

/** Ordem lógica de status (Rascunho → … → Concluído) */
export const OKR_OBJECTIVE_STATUS_RANK: Record<string, number> = {
  draft: 0,
  on_track: 1,
  at_risk: 2,
  off_track: 3,
  completed: 4,
};

export type OkrListSortField = "title" | "status" | "progress" | "meta";

function targetDateSortValue(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
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
      const ra = OKR_OBJECTIVE_STATUS_RANK[a.status] ?? 99;
      const rb = OKR_OBJECTIVE_STATUS_RANK[b.status] ?? 99;
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
