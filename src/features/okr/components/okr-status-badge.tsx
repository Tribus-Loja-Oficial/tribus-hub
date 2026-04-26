import { HealthInsightHint, PaceHealthBadge } from "@/components/pace-health-badge";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { cn } from "@/lib/utils/cn";
import type {
  HealthInsight,
  OkrObjectiveStatus,
  OkrKeyResultStatus,
  OkrCycleStatus,
  WorkflowStatusInsight,
} from "@/lib/types/domain";
import {
  TABLE_HEALTH_CHIP_PX,
  TABLE_HEALTH_CHIP_WIDTH_CLASS,
  TABLE_STATUS_CHIP_PX,
  TABLE_STATUS_CHIP_WIDTH_CLASS,
} from "@/lib/ui/chip-width-tokens";
import { deriveOkrWorkflowStatusInsight } from "@/features/okr/lib/okr-workflow-status";
import { reconcileOkrHealthInsightForDisplay } from "@/features/okr/lib/okr-pace-health-local";

type AnyStatus = OkrObjectiveStatus | OkrKeyResultStatus | OkrCycleStatus | string;

const ring = "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Rascunho",
    className: `border-border/75 bg-muted/70 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground ${ring}`,
  },
  planned: {
    label: "Planejado",
    className: `border-border/75 bg-muted/60 text-muted-foreground dark:bg-muted/35 dark:text-muted-foreground ${ring}`,
  },
  on_track: {
    label: "No rumo",
    className: `border-emerald-600/20 bg-emerald-600/[0.07] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100 ${ring}`,
  },
  at_risk: {
    label: "Em risco",
    className: `border-amber-600/22 bg-amber-500/[0.09] text-amber-950/85 dark:border-amber-500/28 dark:bg-amber-500/10 dark:text-amber-100 ${ring}`,
  },
  off_track: {
    label: "Fora do rumo",
    className: `border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100 ${ring}`,
  },
  completed: {
    label: "Concluído",
    className: `border-primary/20 bg-primary/[0.08] text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-blue-100 ${ring}`,
  },
  active: {
    label: "Ativo",
    className: `border-emerald-600/20 bg-emerald-600/[0.07] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100 ${ring}`,
  },
  closed: {
    label: "Encerrado",
    className: `border-border/70 bg-muted/55 text-muted-foreground dark:bg-muted/30 ${ring}`,
  },
  archived: {
    label: "Arquivado",
    className: `border-border/60 bg-muted/40 text-muted-foreground/90 dark:bg-muted/25 ${ring}`,
  },
};

interface OkrStatusBadgeProps {
  status: AnyStatus;
  size?: "sm" | "md";
  className?: string;
}

export function OkrStatusBadge({ status, size = "sm", className }: OkrStatusBadgeProps) {
  const config = CONFIG[status] ?? {
    label: status,
    className: `border-border/70 bg-muted/60 text-muted-foreground ${ring}`,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

/** Status operacional (Planejado / Em progresso / Concluído) + saúde por ritmo quando a API envia insights. */
export function OkrEntityStatusRow({
  status,
  workflowStatusInsight,
  healthInsight,
  startDate,
  targetDate,
  progressPercent,
  size = "sm",
  className,
}: OkrStatusBadgeProps & {
  healthInsight?: HealthInsight | null;
  workflowStatusInsight?: WorkflowStatusInsight | null;
  startDate?: string | null;
  targetDate?: string | null;
  progressPercent?: number | null;
}) {
  const okrWorkflow = deriveOkrWorkflowStatusInsight({
    workflowStatusInsight,
    startDate,
    targetDate,
    progressPercent,
  });
  const health = reconcileOkrHealthInsightForDisplay(healthInsight, {
    startDate,
    targetDate,
  });
  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1.5", className)}
    >
      <WorkflowStatusRow
        insight={okrWorkflow}
        size={size}
        badgeWidthClass={TABLE_STATUS_CHIP_WIDTH_CLASS}
        tableChipWidthPx={TABLE_STATUS_CHIP_PX}
      />
      {health ? (
        <>
          <PaceHealthBadge
            insight={health}
            className={cn("justify-center text-center", TABLE_HEALTH_CHIP_WIDTH_CLASS)}
            tableChipWidthPx={TABLE_HEALTH_CHIP_PX}
          />
          <HealthInsightHint insight={health} />
        </>
      ) : null}
    </span>
  );
}

interface OkrPriorityBadgeProps {
  priority: string;
  className?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: {
    label: "Baixa",
    className: `border-border/70 bg-muted/55 text-muted-foreground dark:bg-muted/30 ${ring}`,
  },
  medium: {
    label: "Média",
    className: `border-primary/18 bg-primary/[0.07] text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-blue-100 ${ring}`,
  },
  high: {
    label: "Alta",
    className: `border-amber-600/22 bg-amber-500/[0.09] text-amber-950/85 dark:border-amber-500/28 dark:bg-amber-500/10 dark:text-amber-100 ${ring}`,
  },
  critical: {
    label: "Crítica",
    className: `border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100 ${ring}`,
  },
};

export function OkrPriorityBadge({ priority, className }: OkrPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: `border-border/70 bg-muted/55 text-muted-foreground ${ring}`,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
