"use client";

import type { ComponentProps, ReactNode } from "react";
import { HealthInsightHint, PaceHealthBadge } from "@/components/pace-health-badge";
import type { HealthInsight } from "@/lib/types/domain";
import { tableChipBoxStyle } from "@/lib/ui/chip-width-tokens";
import { cn } from "@/lib/utils/cn";

const chip =
  "items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: {
    label: "Baixa",
    className:
      "border-border/70 bg-muted/50 text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground",
  },
  medium: {
    label: "Média",
    className:
      "border-primary/18 bg-primary/[0.07] text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-blue-100",
  },
  high: {
    label: "Alta",
    className:
      "border-amber-600/22 bg-amber-500/[0.09] text-amber-950/85 dark:border-amber-500/28 dark:bg-amber-500/10 dark:text-amber-100",
  },
  urgent: {
    label: "Urgente",
    className:
      "border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100",
  },
};

function Badge({
  className,
  children,
  style,
}: {
  className: string;
  children: ReactNode;
  style?: ComponentProps<"span">["style"];
}) {
  return (
    <span className={cn("inline-flex", chip, className)} style={style}>
      {children}
    </span>
  );
}

/** Saúde por ritmo (hub-api); sem insight mostra traço. */
export function ProjectHealthRow({
  insight,
  /** Em tabelas: badge à esquerda, ícone à direita da célula (ícones alinhados entre linhas). */
  tableCellLayout = false,
  badgeWidthClass,
  tableChipWidthPx,
}: {
  insight?: HealthInsight | null;
  tableCellLayout?: boolean;
  badgeWidthClass?: string;
  tableChipWidthPx?: number;
}) {
  if (!insight) {
    return (
      <span
        className={cn(
          "text-[11px] text-muted-foreground/40",
          tableCellLayout && "flex w-full justify-start",
        )}
      >
        —
      </span>
    );
  }
  if (tableCellLayout) {
    const hasFixedWidth = typeof tableChipWidthPx === "number";
    return (
      <span className="flex w-full min-w-0 items-center justify-between gap-1.5">
        <span
          className={cn(
            "flex justify-start overflow-hidden",
            hasFixedWidth ? cn("shrink-0", badgeWidthClass) : "min-w-0 shrink",
          )}
          style={hasFixedWidth ? tableChipBoxStyle(tableChipWidthPx) : undefined}
        >
          <PaceHealthBadge
            insight={insight}
            className={cn(
              "min-w-0 max-w-full",
              hasFixedWidth && "flex w-full min-w-0 max-w-full justify-center text-center",
            )}
          />
        </span>
        <HealthInsightHint insight={insight} className="shrink-0" />
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1">
      <PaceHealthBadge
        insight={insight}
        tableChipWidthPx={tableChipWidthPx}
        className={cn(
          typeof tableChipWidthPx === "number" &&
            "w-full min-w-0 max-w-full justify-center text-center",
        )}
      />
      <HealthInsightHint insight={insight} />
    </span>
  );
}

export const MilestoneHealthRow = ProjectHealthRow;

export function PriorityBadge({
  priority,
  className,
  tableChipWidthPx,
}: {
  priority: string;
  className?: string;
  tableChipWidthPx?: number;
}) {
  const cfg = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  const hasFixed = typeof tableChipWidthPx === "number";
  return (
    <Badge
      className={cn(
        cfg.className,
        hasFixed && "flex w-full min-w-0 max-w-full justify-center text-center",
        className,
      )}
      style={hasFixed ? tableChipBoxStyle(tableChipWidthPx) : undefined}
    >
      {cfg.label}
    </Badge>
  );
}
