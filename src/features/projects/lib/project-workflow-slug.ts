import type { Project, WorkflowStatusSlug } from "@/lib/types/domain";

/** Slug operacional unificado; usa API ou deriva do status de cadastro. */
export function projectWorkflowSlug(p: {
  workflowStatusInsight?: { slug: WorkflowStatusSlug } | null;
  status: Project["status"];
}): WorkflowStatusSlug {
  return (
    p.workflowStatusInsight?.slug ??
    (p.status === "completed"
      ? "completed"
      : p.status === "planned" || p.status === "on_hold" || p.status === "cancelled"
        ? "planned"
        : "in_progress")
  );
}

/** Query `?status=` antiga (cadastro) → slug operacional usado nos filtros atuais. */
export function normalizeProjectListStatusQueryParam(raw: string): string {
  const map: Record<string, string> = {
    planned: "planned",
    active: "in_progress",
    on_hold: "planned",
    completed: "completed",
    cancelled: "planned",
    in_progress: "in_progress",
  };
  return map[raw] ?? raw;
}
