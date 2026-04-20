import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ProjectHierarchyItem } from "@/lib/repositories/projects.repository";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  active: "Em andamento",
  on_hold: "Em pausa",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const HEALTH_LABELS: Record<string, string> = {
  on_track: "No rumo",
  at_risk: "Em risco",
  blocked: "Bloqueado",
  needs_attention: "Atenção",
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

  const parts: string[] = [
    project.title,
    project.summary ?? "",
    STATUS_LABELS[project.status] ?? project.status,
    project.status,
    HEALTH_LABELS[project.healthStatus ?? ""] ?? project.healthStatus ?? "",
    project.healthStatus ?? "",
    PRIORITY_LABELS[project.priority] ?? project.priority,
    project.priority,
    ...dateChunks(project.targetDate),
  ];

  for (const ms of project.milestones) {
    parts.push(
      ms.title,
      ms.description ?? "",
      MILESTONE_STATUS_LABELS[ms.status] ?? ms.status,
      ms.status,
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
