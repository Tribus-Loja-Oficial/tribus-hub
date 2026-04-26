"use client";

import type { CSSProperties } from "react";
import { Info } from "lucide-react";
import type { WorkflowStatusInsight, WorkflowStatusSlug } from "@/lib/types/domain";
import { workflowStatusLabel } from "@/lib/pace-health-display";
import { parseCivilDateInput } from "@/lib/date/civil-date";
import { tableChipBoxStyle } from "@/lib/ui/chip-width-tokens";
import { cn } from "@/lib/utils/cn";

const ring = "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const SLUG_CLASS: Record<WorkflowStatusSlug, string> = {
  planned: `border-border/75 bg-muted/65 text-muted-foreground dark:bg-muted/35 dark:text-muted-foreground ${ring}`,
  in_progress: `border-primary/22 bg-primary/[0.08] text-primary dark:border-primary/28 dark:bg-primary/14 dark:text-blue-100 ${ring}`,
  completed: `border-emerald-600/22 bg-emerald-600/[0.08] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100 ${ring}`,
  achieved: `border-emerald-600/24 bg-emerald-500/[0.10] text-emerald-900/95 dark:border-emerald-500/30 dark:bg-emerald-500/14 dark:text-emerald-100 ${ring}`,
  not_achieved: `border-rose-600/24 bg-rose-500/[0.10] text-rose-900/95 dark:border-rose-500/30 dark:bg-rose-500/14 dark:text-rose-100 ${ring}`,
};

function fmtWindowDate(raw: string | null | undefined): string {
  const d = parseCivilDateInput(raw);
  if (!d) return "n/d";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

function workflowStatusTooltip(insight: WorkflowStatusInsight): string {
  const slugLine: Record<WorkflowStatusSlug, string> = {
    planned: "Esta janela ainda nao começou.",
    in_progress: "Estamos dentro da janela planejada.",
    completed: "A janela ja foi concluida/encerrada.",
    achieved: "A data final passou e a meta foi atingida.",
    not_achieved: "A data final passou e a meta nao foi atingida.",
  };

  const bullets = [
    `• Status atual: ${workflowStatusLabel(insight.slug)}`,
    `• ${slugLine[insight.slug] ?? "Status derivado da janela de datas."}`,
    `• Janela programada: ${fmtWindowDate(insight.windowStart)} a ${fmtWindowDate(insight.windowEnd)}`,
  ];
  return bullets.join("\n");
}

export function WorkflowStatusHint({
  insight,
  className,
}: {
  insight: WorkflowStatusInsight;
  className?: string;
}) {
  const title = workflowStatusTooltip(insight);
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
  style,
}: {
  insight: WorkflowStatusInsight;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center whitespace-nowrap rounded-md border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        SLUG_CLASS[insight.slug] ?? SLUG_CLASS.planned,
        className,
      )}
      style={style}
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
  /** Em tabelas: badge à esquerda, ícone à direita da célula (ícones alinhados entre linhas). */
  tableCellLayout = false,
  badgeWidthClass,
  /** Largura fixa (px) em células de tabela; use com `tableCellLayout` — aplica `style` inline. */
  tableChipWidthPx,
}: {
  insight?: WorkflowStatusInsight | null;
  size?: "sm" | "md";
  className?: string;
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
      <span
        className={cn(
          "flex w-full min-w-0 flex-nowrap items-center justify-start gap-2",
          className,
        )}
      >
        <span
          className={cn(
            "flex justify-start overflow-hidden",
            hasFixedWidth ? cn("shrink-0", badgeWidthClass) : "min-w-0 shrink",
          )}
          style={hasFixedWidth ? tableChipBoxStyle(tableChipWidthPx) : undefined}
        >
          <WorkflowStatusBadge
            insight={insight}
            size={size}
            className={cn(
              "min-w-0 max-w-full truncate",
              hasFixedWidth && "flex w-full min-w-0 max-w-full justify-center text-center",
            )}
          />
        </span>
        <WorkflowStatusHint insight={insight} className="shrink-0" />
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full flex-nowrap items-center gap-1", className)}
    >
      <WorkflowStatusBadge
        insight={insight}
        size={size}
        className={cn(
          typeof tableChipWidthPx === "number" &&
            "flex w-full min-w-0 max-w-full justify-center text-center",
          badgeWidthClass,
        )}
        style={
          typeof tableChipWidthPx === "number" ? tableChipBoxStyle(tableChipWidthPx) : undefined
        }
      />
      <WorkflowStatusHint insight={insight} />
    </span>
  );
}
