"use client";

import type { CSSProperties } from "react";
import { Info } from "lucide-react";
import type { HealthInsight, PaceHealthSlug } from "@/lib/types/domain";
import { parseCivilDateInput } from "@/lib/date/civil-date";
import { tableChipBoxStyle } from "@/lib/ui/chip-width-tokens";
import { cn } from "@/lib/utils/cn";
import { paceHealthBadgeToneSlug, paceHealthLabel } from "@/lib/pace-health-display";

/** Barra vertical à esquerda da linha (lista OKR / projetos), alinhada à saúde por ritmo. */
const ROW_ACCENT: Record<PaceHealthSlug, string> = {
  draft: "border-l-slate-400/50",
  no_dates: "border-l-slate-400/40",
  not_started: "border-l-slate-500/45",
  ahead: "border-l-emerald-500/55",
  on_track: "border-l-emerald-500/50",
  at_risk: "border-l-amber-500/55",
  off_track: "border-l-rose-500/55",
  completed_legacy: "border-l-blue-500/50",
};

export function healthRowAccentClass(slug?: PaceHealthSlug | null): string {
  if (!slug) return "border-l-transparent";
  const tone = paceHealthBadgeToneSlug(slug);
  return ROW_ACCENT[tone] ?? "border-l-transparent";
}

const ring = "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]";

const SLUG_CLASS: Record<PaceHealthSlug, string> = {
  draft: `border-border/75 bg-muted/70 text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground ${ring}`,
  no_dates: `border-border/70 bg-muted/55 text-muted-foreground dark:bg-muted/30 ${ring}`,
  not_started: `border-slate-500/20 bg-slate-500/10 text-slate-800 dark:text-slate-100 ${ring}`,
  ahead: `border-emerald-600/25 bg-emerald-500/15 text-emerald-950 dark:text-emerald-50 ${ring}`,
  on_track: `border-emerald-600/20 bg-emerald-600/[0.07] text-emerald-900/90 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-100 ${ring}`,
  at_risk: `border-amber-600/22 bg-amber-500/[0.09] text-amber-950/85 dark:border-amber-500/28 dark:bg-amber-500/10 dark:text-amber-100 ${ring}`,
  off_track: `border-rose-600/22 bg-rose-500/[0.08] text-rose-900/90 dark:border-rose-500/28 dark:bg-rose-500/12 dark:text-rose-100 ${ring}`,
  completed_legacy: `border-primary/20 bg-primary/[0.08] text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-blue-100 ${ring}`,
};

function fmtWindowDate(raw: string | null | undefined): string {
  const d = parseCivilDateInput(raw);
  if (!d) return "n/d";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

function healthTooltip(insight: HealthInsight): string {
  const slugLine: Record<PaceHealthSlug, string> = {
    draft: "Sem progresso relevante ainda.",
    no_dates: "Nao ha datas para calcular ritmo.",
    not_started: "Dentro do prazo, mas ainda nao iniciou.",
    ahead: "Acima do ritmo esperado.",
    on_track: "Dentro do ritmo esperado.",
    at_risk: "Abaixo do ritmo ideal; requer atencao.",
    off_track: "Fora do ritmo; risco alto de atraso.",
    completed_legacy: "Marcado como concluido no fluxo antigo.",
  };

  const progress =
    typeof insight.progressPercent === "number" ? `${Math.round(insight.progressPercent)}%` : "n/d";
  const elapsed =
    typeof insight.elapsedPercent === "number" ? `${Math.round(insight.elapsedPercent)}%` : "n/d";
  const diff = typeof insight.diff === "number" ? `${Math.round(insight.diff)} p.p.` : "n/d";

  const bullets = [
    `• Health atual: ${paceHealthLabel(insight.slug)}`,
    `• ${slugLine[insight.slug] ?? "Saude calculada pelo ritmo."}`,
    `• Datas consideradas: ${fmtWindowDate(insight.windowStart)} a ${fmtWindowDate(insight.windowEnd)}`,
    `• Progresso: ${progress} | Tempo decorrido: ${elapsed}`,
    `• Diferenca de ritmo: ${diff}`,
  ];
  return bullets.join("\n");
}

export function HealthInsightHint({
  insight,
  className,
}: {
  insight: HealthInsight;
  className?: string;
}) {
  const title = healthTooltip(insight);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground",
        className,
      )}
      title={title}
      aria-label="Como calculamos a saúde em relação ao prazo"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

export function PaceHealthBadge({
  insight,
  className,
  tableChipWidthPx,
  style,
}: {
  insight: HealthInsight;
  className?: string;
  /** Largura fixa (px) em tabelas; aplica `style` inline. */
  tableChipWidthPx?: number;
  style?: CSSProperties;
}) {
  const tone = paceHealthBadgeToneSlug(insight.slug);
  const label = paceHealthLabel(insight.slug);
  const hasFixed = typeof tableChipWidthPx === "number";
  const boxStyle: CSSProperties | undefined = hasFixed
    ? { ...tableChipBoxStyle(tableChipWidthPx), ...style }
    : style;
  return (
    <span
      className={cn(
        "items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium",
        hasFixed ? "flex w-full min-w-0 max-w-full justify-center text-center" : "inline-flex",
        SLUG_CLASS[tone] ?? SLUG_CLASS.no_dates,
        className,
      )}
      style={boxStyle}
    >
      {label}
    </span>
  );
}
