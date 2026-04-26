import { format, type Locale } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Qualquer data vinda do backend no formato `yyyy-MM-dd` ou `yyyy-MM-ddT...` é uma **data civil**:
 * o dia deve ser o mesmo no fuso do usuário. `new Date("2025-04-25")` vira meia-noite **UTC** e
 * no Brasil vira 24/04 — por isse parseamos o prefixo Y-M-D e montamos `new Date(ano, mês, dia)` local.
 */
const YMD_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseCivilDateInput(value: string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  const m = s.match(YMD_PREFIX);
  if (m) {
    const y = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (Number.isFinite(y) && Number.isFinite(month) && Number.isFinite(day)) {
      const d = new Date(y, month - 1, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Formata data civil (início alvo, prazo, vencimentos) sem deslocamento UTC. */
export function formatCivilDate(
  value: string | null | undefined,
  pattern: string,
  options?: { locale?: Locale },
): string {
  const d = parseCivilDateInput(value);
  if (!d) return "";
  return format(d, pattern, { locale: options?.locale ?? ptBR });
}
