/**
 * Ciclo OKR — status de governança a partir de datas civis (YYYY-MM-DD).
 *
 * Política de "hoje": **data civil em UTC** (getUTC*), igual a comparar ISO date strings no Worker.
 * Pode diferir até 1 dia do calendário local do navegador; documentado aqui por design para
 * consistência servidor ↔ D1 sem timezone por workspace na API atual.
 */

export type CycleGovernanceDerived = "planned" | "active" | "closed";

/** YYYY-MM-DD do instante atual em UTC (civil). */
export function utcCivilDateToday(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Mesma regra conceitual do inferCycleStatus do front (`create-cycle-dialog.tsx`):
 * - end < today → closed
 * - start > today → planned
 * - senão → active (janela [start, end] cobre today)
 *
 * Retorna null se falta start ou end (não força derivar).
 */
export function deriveCycleGovernanceStatusFromDates(
  startYmd: string | null | undefined,
  endYmd: string | null | undefined,
  todayYmd: string,
): CycleGovernanceDerived | null {
  const sd = normalizeYmd(startYmd);
  const ed = normalizeYmd(endYmd);
  if (!sd || !ed || !isValidYmd(todayYmd)) return null;
  if (ed < sd) return null;
  if (ed < todayYmd) return "closed";
  if (sd > todayYmd) return "planned";
  return "active";
}

function normalizeYmd(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t;
}

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * POST /v1/okr/cycles: quando ambas as datas existem e derivam um status, ele manda
 * exceto se o cliente pediu `closed` explicitamente (ex.: encerrar retroativo).
 */
export function resolveCycleStatusForCreate(
  requested: CycleGovernanceDerived,
  derived: CycleGovernanceDerived | null,
): CycleGovernanceDerived {
  if (!derived) return requested;
  if (requested === "closed") return "closed";
  return derived;
}

/**
 * PATCH ciclo (alinhado a v1-okr-write): status explícito vence derivação; `closed` sem PATCH de status é pegajoso.
 */
export function resolveCycleStatusAfterPatch(input: {
  hasExplicitStatus: boolean;
  explicitStatus: CycleGovernanceDerived | null;
  curStatus: string;
  mergedStart: string | null;
  mergedEnd: string | null;
  todayYmd: string;
}): string {
  if (input.hasExplicitStatus && input.explicitStatus != null) {
    return input.explicitStatus;
  }
  if (input.curStatus === "closed") {
    return "closed";
  }
  const d = deriveCycleGovernanceStatusFromDates(
    input.mergedStart,
    input.mergedEnd,
    input.todayYmd,
  );
  return d ?? input.curStatus;
}
