import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProjectHierarchyItem } from "@/lib/types/pm-hierarchy";
import { paceHealthLabel, workflowStatusLabel } from "@/lib/pace-health-display";

/** Status operacional no cadastro (ainda pesquisável). */
const STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  active: "Em andamento",
  on_hold: "Em pausa",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const MILESTONE_STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function dateChunks(d: string | null | undefined): string[] {
  if (!d) return [];
  try {
    const dt = new Date(d);
    return [
      format(dt, "dd MMM", { locale: ptBR }),
      format(dt, "dd MMM yy", { locale: ptBR }),
      format(dt, "d/M/yyyy"),
    ];
  } catch {
    return [d];
  }
}

export function projectMatchesSearch(project: ProjectHierarchyItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = norm(query);

  const wf = project.workflowStatusInsight?.slug;
  const parts: string[] = [
    project.title,
    project.summary ?? "",
    STATUS_LABELS[project.status] ?? project.status,
    project.status,
    wf ? workflowStatusLabel(wf) : "",
    wf ?? "",
    project.healthInsight?.slug ? paceHealthLabel(project.healthInsight.slug) : "",
    project.healthInsight?.slug ?? "",
    PRIORITY_LABELS[project.priority] ?? project.priority,
    project.priority,
    ...dateChunks(project.targetDate),
  ];

  for (const ms of project.milestones) {
    const mwf = ms.workflowStatusInsight?.slug;
    parts.push(
      ms.title,
      ms.description ?? "",
      MILESTONE_STATUS_LABELS[ms.status] ?? ms.status,
      ms.status,
      mwf ? workflowStatusLabel(mwf) : "",
      mwf ?? "",
      ms.healthInsight?.slug ? paceHealthLabel(ms.healthInsight.slug) : "",
      ms.healthInsight?.slug ?? "",
      PRIORITY_LABELS[ms.priority] ?? ms.priority,
      ...dateChunks(ms.dueDate),
    );
    for (const task of ms.tasks) {
      parts.push(
        task.title,
        task.columnName,
        task.columnSlug,
        PRIORITY_LABELS[task.priority] ?? task.priority,
        task.priority,
      );
    }
  }

  const haystack = norm(parts.filter(Boolean).join("\n"));
  return haystack.includes(q);
}
