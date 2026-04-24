"use client";

import { HealthInsightHint, PaceHealthBadge } from "@/components/pace-health-badge";
import type { HealthInsight } from "@/lib/types/domain";

const chip =
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: {
    label: "Planejado",
    className:
      "border-border/80 bg-muted/60 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground",
  },
  active: {
    label: "Ativo",
    className:
      "border-primary/20 bg-primary/[0.08] text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-blue-100",
  },
  on_hold: {
    label: "Em espera",
    className:
      "border-amber-500/25 bg-amber-500/[0.09] text-amber-900/90 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  },
  completed: {
    label: "Concluído",
    className:
      "border-emerald-600/22 bg-emerald-600/[0.08] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100",
  },
  cancelled: {
    label: "Cancelado",
    className:
      "border-rose-500/22 bg-rose-500/[0.07] text-rose-900/90 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100",
  },
};

const HEALTH_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  on_track: {
    label: "No rumo",
    className:
      "border-emerald-600/22 bg-emerald-600/[0.07] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  at_risk: {
    label: "Em risco",
    className:
      "border-amber-600/22 bg-amber-500/[0.09] text-amber-950/85 dark:border-amber-500/28 dark:bg-amber-500/10 dark:text-amber-100",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  blocked: {
    label: "Bloqueado",
    className:
      "border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
  off_track: {
    label: "Fora do rumo",
    className:
      "border-orange-600/22 bg-orange-500/[0.08] text-orange-950/85 dark:border-orange-500/28 dark:bg-orange-500/10 dark:text-orange-100",
    dot: "bg-orange-600 dark:bg-orange-400",
  },
};

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

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className:
      "border-border/80 bg-muted/55 text-muted-foreground dark:bg-muted/35 dark:text-muted-foreground",
  },
  in_progress: {
    label: "Em progresso",
    className:
      "border-primary/20 bg-primary/[0.08] text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-blue-100",
  },
  completed: {
    label: "Concluído",
    className:
      "border-emerald-600/22 bg-emerald-600/[0.08] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100",
  },
  missed: {
    label: "Atrasado",
    className:
      "border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100",
  },
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`${chip} ${className}`}>{children}</span>;
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function ProjectHealthBadge({ health }: { health: string }) {
  const cfg = HEALTH_CONFIG[health] ?? {
    label: health,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  return (
    <Badge className={`${cfg.className} whitespace-nowrap`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

/** Saúde por ritmo (API) com dica; senão health manual legado. */
export function ProjectHealthRow({
  insight,
  healthStatus,
}: {
  insight?: HealthInsight | null;
  healthStatus?: string | null;
}) {
  if (insight) {
    return (
      <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1">
        <PaceHealthBadge insight={insight} />
        <HealthInsightHint insight={insight} />
      </span>
    );
  }
  if (healthStatus) return <ProjectHealthBadge health={healthStatus} />;
  return null;
}

export function MilestoneHealthRow({ insight }: { insight?: HealthInsight | null }) {
  if (!insight) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <PaceHealthBadge insight={insight} />
      <HealthInsightHint insight={insight} />
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function MilestoneStatusBadge({ status }: { status: string }) {
  const cfg = MILESTONE_STATUS_CONFIG[status] ?? {
    label: status,
    className: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
