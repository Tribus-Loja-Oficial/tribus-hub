"use client";

import { HealthInsightHint, PaceHealthBadge } from "@/components/pace-health-badge";
import type { HealthInsight } from "@/lib/types/domain";

const chip =
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

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

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`${chip} ${className}`}>{children}</span>;
}

/** Saúde por ritmo (hub-api); sem insight mostra traço. */
export function ProjectHealthRow({ insight }: { insight?: HealthInsight | null }) {
  if (!insight) {
    return <span className="text-[11px] text-muted-foreground/40">—</span>;
  }
  return (
    <span className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1">
      <PaceHealthBadge insight={insight} />
      <HealthInsightHint insight={insight} />
    </span>
  );
}

export const MilestoneHealthRow = ProjectHealthRow;

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
