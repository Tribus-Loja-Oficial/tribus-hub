import type { Project, WorkflowStatusSlug } from "@/lib/types/domain";

/** Slug operacional unificado; usa API ou deriva do status de cadastro. */
export function projectWorkflowSlug(p: {
  workflowStatusInsight?: { slug: WorkflowStatusSlug } | null;
  status: Project["status"];
}): WorkflowStatusSlug {
  return (
    p.workflowStatusInsight?.slug ??
    (p.status === "cancelled"
      ? "cancelled"
      : p.status === "on_hold"
        ? "blocked"
        : p.status === "completed"
          ? "successful"
          : p.status === "planned"
            ? "planned"
            : "in_progress")
  );
}

/** Query `?status=` antiga (cadastro) → slug operacional usado nos filtros atuais. */
export function normalizeProjectListStatusQueryParam(raw: string): string {
  const map: Record<string, string> = {
    planned: "planned",
    active: "in_progress",
    on_hold: "blocked",
    completed: "successful",
    cancelled: "cancelled",
    in_progress: "in_progress",
  };
  return map[raw] ?? raw;
}
