/**
 * Rótulos de UI alinhados ao hub-api (`pace-health.ts`, `pace-workflow-status.ts`).
 * Usar slug como fonte da verdade para texto exibido em badges.
 */
import type { PaceHealthSlug, WorkflowStatusSlug } from "@/lib/types/domain";

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatusSlug, string> = {
  planned: "Planejado",
  in_progress: "Em Progresso",
  completed: "Concluído",
};

/** Cinco estados de saúde por ritmo exibidos na UI (slug interno pode variar). */
export const PACE_HEALTH_LABELS: Record<PaceHealthSlug, string> = {
  draft: "Não Iniciado",
  no_dates: "Não Iniciado",
  not_started: "Não Iniciado",
  ahead: "Adiantado",
  on_track: "No Rumo",
  at_risk: "Em Risco",
  off_track: "Fora do Rumo",
  completed_legacy: "No Rumo",
};

export function workflowStatusLabel(slug: WorkflowStatusSlug | string | null | undefined): string {
  if (!slug) return "";
  return WORKFLOW_STATUS_LABELS[slug as WorkflowStatusSlug] ?? String(slug);
}

export function paceHealthLabel(slug: PaceHealthSlug | string | null | undefined): string {
  if (!slug) return "";
  return PACE_HEALTH_LABELS[slug as PaceHealthSlug] ?? String(slug);
}

/** Agrupa slugs internos para a mesma paleta de badge (5 saúdes visíveis). */
export function paceHealthBadgeToneSlug(slug: PaceHealthSlug): PaceHealthSlug {
  if (slug === "draft" || slug === "no_dates" || slug === "not_started") return "not_started";
  if (slug === "completed_legacy") return "on_track";
  return slug;
}
