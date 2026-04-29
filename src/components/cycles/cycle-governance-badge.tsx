"use client";

import type { OkrCycleStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const CFG: Record<OkrCycleStatus, { label: string; className: string }> = {
  planned: {
    label: "Planejado",
    className:
      "border-sky-500/40 bg-sky-500/16 text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/22 dark:text-sky-50",
  },
  active: {
    label: "Em andamento",
    className:
      "border-emerald-500/45 bg-emerald-500/18 text-emerald-950 dark:border-emerald-400/40 dark:bg-emerald-500/22 dark:text-emerald-50",
  },
  closed: {
    label: "Encerrado",
    className:
      "border-violet-500/40 bg-violet-500/16 text-violet-950 dark:border-violet-400/35 dark:bg-violet-500/20 dark:text-violet-50",
  },
};

export function CycleGovernanceBadge({
  status,
  size = "sm",
  className,
}: {
  status: OkrCycleStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const c = CFG[status] ?? CFG.planned;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        c.className,
        className,
      )}
    >
      {c.label}
    </span>
  );
}
