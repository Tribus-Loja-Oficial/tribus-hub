import type { HealthInsight, PaceHealthSlug } from "@/lib/types/domain";
import { parseCivilDateInput, startOfLocalDay } from "@/lib/date/civil-date";
import { differenceInCalendarDays } from "date-fns";
import { paceHealthLabel } from "@/lib/pace-health-display";

/** Alinhado a hub-api `PACE_HEALTH_*`. */
const PACE_BAND_PP = 8;
const PACE_OFF_PP = 20;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function mapDiffToSlug(diff: number): PaceHealthSlug {
  if (diff > PACE_BAND_PP) return "ahead";
  if (diff >= -PACE_BAND_PP) return "on_track";
  if (diff > -PACE_OFF_PP) return "at_risk";
  return "off_track";
}

/** Janela começou no calendário local (igual a `deriveOkrWorkflowStatusInsight`), não no dia UTC. */
export function isBeforeWindowStartLocalCivil(
  windowStart: string,
  now: Date = new Date(),
): boolean {
  const start = parseCivilDateInput(windowStart);
  if (!start) return false;
  return startOfLocalDay(now).getTime() < startOfLocalDay(start).getTime();
}

export function calcElapsedPercentLocalCivil(
  startDateStr: string,
  endDateStr: string,
  now: Date = new Date(),
): number {
  const start = parseCivilDateInput(startDateStr);
  const end = parseCivilDateInput(endDateStr);
  if (!start || !end) return 0;
  const t = startOfLocalDay(now);
  const s = startOfLocalDay(start);
  const e = startOfLocalDay(end);
  if (t.getTime() < s.getTime()) return 0;
  if (t.getTime() > e.getTime()) return 100;
  const total = Math.max(0, differenceInCalendarDays(e, s));
  const elapsed = Math.max(0, differenceInCalendarDays(t, s));
  if (total === 0) return 100;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

/**
 * A API (hub) usa o dia de calendário em UTC para `not_started`; a coluna "Status" OKR
 * (`deriveOkrWorkflowStatusInsight`) usa dia civil no fuso local. Num intervalo
 * (ex.: manhã no Brasil no 20, UTC ainda no 19) o Health pedia "Não Iniciado" e
 * o status "Em Progresso". Aqui o Health é recalculado com a **mesma** regra
 * de janela que o Status quando o slug da API é `not_started` mas, no local,
 * a janela já começou.
 */
export function reconcileOkrHealthInsightForDisplay(
  insight: HealthInsight | null | undefined,
  now: Date = new Date(),
): HealthInsight | null {
  if (!insight) return null;
  if (insight.slug !== "not_started") return insight;
  if (!insight.windowStart || !insight.windowEnd) return insight;
  if (isBeforeWindowStartLocalCivil(insight.windowStart, now)) {
    return insight;
  }
  const elapsedPercent = calcElapsedPercentLocalCivil(insight.windowStart, insight.windowEnd, now);
  const diff = round1(insight.progressPercent - elapsedPercent);
  const slug = mapDiffToSlug(diff);
  return {
    ...insight,
    slug,
    labelPt: paceHealthLabel(slug),
    diff,
    elapsedPercent,
    explanationPt:
      "Health recalculado com o mesmo calendário local que o status: a janela de prazo já começou. " +
      (insight.explanationPt ?? ""),
  };
}
