/**
 * Datas "civis" (só o dia) para pace / workflow de prazo.
 * O Worker nao sabe o fuso do browser; usamos um fuso de referencia (default Brasil)
 * para o calendario "hoje" e o tempo decorrido, alinhado ao `Intl` e ao produto.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

/** IANA. Default Brazil; pode mudar com env no futuro. */
export const PACE_CIVIL_TIMEZONE_DEFAULT = "America/Sao_Paulo";

/**
 * Primeiros 10 caracteres YYYY-MM-DD de `yyyy-MM-dd` ou `yyyy-MM-ddTHH...`.
 * Evita tratar a instante UTC de `T00:00:00.000Z` como outro "dia" na comparacao.
 */
export function tryExtractCivilYmd(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  const m = t.match(YMD);
  return m ? m[0] : null;
}

/** "Hoje" no calendario do fuso, como YYYY-MM-DD. Compativel com Cloudflare Workers (Intl). */
export function civilYmdForInstantInTimeZone(instant: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !d) return instant.toISOString().slice(0, 10);
  return `${y}-${mo}-${d}`;
}

function civilDayOrdinal(ymd: string): number {
  const m = ymd.match(YMD);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/** Ainda nao e o dia de inicio (civil) ou anterior. */
export function isCivilCalendarBeforePrazoStart(
  windowStart: string,
  now: Date,
  timeZone: string,
): boolean {
  const startY = tryExtractCivilYmd(windowStart);
  if (!startY) return false;
  const todayY = civilYmdForInstantInTimeZone(now, timeZone);
  return todayY < startY;
}

/**
 * Passou o ultimo dia (inclusivo) do fim? Ex.: fim 29/04, "hoje" 30/04 no fuso.
 */
export function isCivilCalendarStrictlyAfterPrazoEnd(
  windowEnd: string,
  now: Date,
  timeZone: string,
): boolean {
  const endY = tryExtractCivilYmd(windowEnd);
  if (!endY) return false;
  const todayY = civilYmdForInstantInTimeZone(now, timeZone);
  return todayY > endY;
}

/**
 * Percentual de tempo (0–100) no intervalo [start, end] inclusive nos dias civil,
 * "hoje" no fuso dado. Mesma ideia que `date-fns` `differenceInCalendarDays` / front.
 */
export function calcElapsedPercentCivilInTimeZone(
  startDateStr: string,
  endDateStr: string,
  now: Date,
  timeZone: string,
): number {
  const startY = tryExtractCivilYmd(startDateStr);
  const endY = tryExtractCivilYmd(endDateStr);
  if (!startY || !endY) return 0;
  const todayY = civilYmdForInstantInTimeZone(now, timeZone);
  if (todayY < startY) return 0;
  if (todayY > endY) return 100;
  const s = civilDayOrdinal(startY);
  const e = civilDayOrdinal(endY);
  const t = civilDayOrdinal(todayY);
  if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(t)) return 0;
  const totalDays = Math.max(0, e - s);
  const elapsedDays = Math.max(0, t - s);
  if (totalDays === 0) return 100;
  return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
}
