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

const YMD_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/** Prefixo YYYY-MM-DD de strings ISO; fallbacks para células e API. */
function ymd10(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  const m = t.match(YMD_PREFIX);
  return m ? m[0] : null;
}

/**
 * A API reúne a janela a partir de KR → objetivo → ciclo. Quando a resposta
 * ainda traz o intervalo do ciclo (ex. 20–24) mas o registo exibe início/metas
 * próprios (ex. 21–29), o tooltip pedia a janela errada. Priorizamos as datas
 * do próprio registo (onde existirem) e recalculamos o ritmo no calendário
 * local, alinhado a `deriveOkrWorkflowStatusInsight` e a `fmtWindowDate`.
 */
export function resolveEffectiveOkrWindowForDisplay(
  insight: HealthInsight,
  options: { startDate?: string | null; targetDate?: string | null } = {},
): { start: string | null; end: string | null } {
  const start = ymd10(options.startDate) ?? ymd10(insight.windowStart) ?? null;
  const end = ymd10(options.targetDate) ?? ymd10(insight.windowEnd) ?? null;
  return { start, end };
}

function computeOkrPaceWithLocalCivilWindow(
  insight: HealthInsight,
  windowStart: string,
  windowEnd: string,
  now: Date,
): HealthInsight {
  if (isBeforeWindowStartLocalCivil(windowStart, now)) {
    return {
      ...insight,
      windowStart,
      windowEnd,
      slug: "not_started",
      labelPt: paceHealthLabel("not_started"),
      diff: null,
      elapsedPercent: 0,
      explanationPt:
        "A janela ainda nao comecou no teu fuso, segundo as datas do prazo. " +
        (insight.explanationPt ?? ""),
    };
  }
  const elapsedPercent = calcElapsedPercentLocalCivil(windowStart, windowEnd, now);
  const diff = round1(insight.progressPercent - elapsedPercent);
  const slug = mapDiffToSlug(diff);
  return {
    ...insight,
    windowStart,
    windowEnd,
    slug,
    labelPt: paceHealthLabel(slug),
    diff,
    elapsedPercent,
    explanationPt:
      "Ritmo calculado com o mesmo calendario local que a coluna Status, usando o inicio e a meta exibidos no formulario. " +
      (insight.explanationPt ?? ""),
  };
}

/**
 * - Corrige desvio UTC do hub-api.
 * - Quando `startDate` / `targetDate` (cadastro) existem, substituem
 *   `windowStart` / `windowEnd` do payload para badge e tooltip.
 */
export function reconcileOkrHealthInsightForDisplay(
  insight: HealthInsight | null | undefined,
  options: {
    startDate?: string | null;
    targetDate?: string | null;
    now?: Date;
  } = {},
): HealthInsight | null {
  if (!insight) return null;
  if (insight.locked) return insight;
  if (insight.slug === "draft") return insight;

  const now = options.now ?? new Date();
  const { start, end } = resolveEffectiveOkrWindowForDisplay(insight, {
    startDate: options.startDate,
    targetDate: options.targetDate,
  });
  if (!start || !end) return insight;

  return computeOkrPaceWithLocalCivilWindow(insight, start, end, now);
}
