import { cn } from "@/lib/utils/cn";
import type { OkrObjectiveStatus, OkrKeyResultStatus, OkrCycleStatus } from "@/lib/types/domain";

type AnyStatus = OkrObjectiveStatus | OkrKeyResultStatus | OkrCycleStatus | string;

const CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Rascunho",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  planned: {
    label: "Planejado",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  on_track: {
    label: "No rumo",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  at_risk: {
    label: "Em risco",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  off_track: {
    label: "Fora do rumo",
    className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  completed: {
    label: "Concluído",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  active: {
    label: "Ativo",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  closed: {
    label: "Encerrado",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  },
  archived: {
    label: "Arquivado",
    className: "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600",
  },
};

interface OkrStatusBadgeProps {
  status: AnyStatus;
  size?: "sm" | "md";
  className?: string;
}

export function OkrStatusBadge({ status, size = "sm", className }: OkrStatusBadgeProps) {
  const config = CONFIG[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium ring-1 ring-inset ring-black/5",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

interface OkrPriorityBadgeProps {
  priority: string;
  className?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-zinc-100 text-zinc-500" },
  medium: { label: "Média", className: "bg-blue-50 text-blue-600" },
  high: { label: "Alta", className: "bg-orange-50 text-orange-600" },
  critical: { label: "Crítica", className: "bg-red-50 text-red-700" },
};

export function OkrPriorityBadge({ priority, className }: OkrPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ring-black/5",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
