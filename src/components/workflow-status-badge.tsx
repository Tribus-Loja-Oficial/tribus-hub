"use client";

import { Info } from "lucide-react";
import type { WorkflowStatusInsight, WorkflowStatusSlug } from "@/lib/types/domain";
import { workflowStatusLabel } from "@/lib/pace-health-display";
import { cn } from "@/lib/utils/cn";

const ring = "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const SLUG_CLASS: Record<WorkflowStatusSlug, string> = {
  planned: `border-border/75 bg-muted/65 text-muted-foreground dark:bg-muted/35 dark:text-muted-foreground ${ring}`,
  in_progress: `border-primary/22 bg-primary/[0.08] text-primary dark:border-primary/28 dark:bg-primary/14 dark:text-blue-100 ${ring}`,
  completed: `border-emerald-600/22 bg-emerald-600/[0.08] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100 ${ring}`,
};

export function WorkflowStatusHint({
  insight,
  className,
}: {
  insight: WorkflowStatusInsight;
  className?: string;
}) {
  const title = `${insight.explanationPt}\n\n${insight.dateSourcePt}`.trim();
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
        className,
      )}
      title={title}
      aria-label="Como calculamos o status de andamento"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

export function WorkflowStatusBadge({
  insight,
  size = "sm",
  className,
}: {
  insight: WorkflowStatusInsight;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        SLUG_CLASS[insight.slug] ?? SLUG_CLASS.planned,
        className,
      )}
    >
      {workflowStatusLabel(insight.slug)}
    </span>
  );
}

/** Badge + ícone de dica (explicação vinda do hub-api). */
export function WorkflowStatusRow({
  insight,
  size = "sm",
  className,
}: {
  insight?: WorkflowStatusInsight | null;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!insight) {
    return <span className="text-[11px] text-muted-foreground/40">—</span>;
  }
  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1", className)}
    >
      <WorkflowStatusBadge insight={insight} size={size} />
      <WorkflowStatusHint insight={insight} />
    </span>
  );
}
