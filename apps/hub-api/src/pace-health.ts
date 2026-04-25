/**
 * Pace-based health: compare progress % vs calendar elapsed % in a date window.
 * Used for OKR objectives/KRs, projects, and milestones (with inherited dates).
 */

export const PACE_HEALTH_BAND_PP = 8;
export const PACE_HEALTH_OFF_TRACK_PP = 20;

export type PaceHealthSlug =
  | "draft"
  | "no_dates"
  | "not_started"
  | "ahead"
  | "on_track"
  | "at_risk"
  | "off_track"
  | "completed_legacy";

export type PaceHealthKind = "okr_objective" | "okr_key_result" | "project" | "milestone";

export type HealthInsightDto = {
  slug: PaceHealthSlug;
  labelPt: string;
  diff: number | null;
  elapsedPercent: number | null;
  progressPercent: number;
  band: number;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  locked: boolean;
  explanationPt: string;
};

type SnapshotV1 = {
  v: 1;
  computedAt: string;
  slug: PaceHealthSlug;
  labelPt: string;
  diff: number | null;
  elapsedPercent: number | null;
  progressPercent: number;
  band: number;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  explanationPt: string;
};

/** Calendar-day based, aligned with hub web `calcCycleTimeProgress` / OKR cycle pace. */
export function calcElapsedPercent(
  startDateStr: string,
  endDateStr: string,
  now = new Date(),
): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (now.getTime() < start.getTime()) return 0;
  if (now.getTime() > end.getTime()) return 100;
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const totalDays = Math.max(0, (day(end) - day(start)) / 86400000);
  const elapsedDays = Math.max(0, (day(now) - day(start)) / 86400000);
  if (totalDays === 0) return 100;
  return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
}

function dayUtc(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isBeforeWindowStart(windowStart: string, now: Date): boolean {
  const start = new Date(windowStart);
  if (Number.isNaN(start.getTime())) return false;
  return dayUtc(now) < dayUtc(start);
}

/** Rótulos unificados (PT-BR) para todos os tipos de item com saúde por ritmo. */
function labelForSlug(slug: PaceHealthSlug): string {
  switch (slug) {
    case "draft":
    case "no_dates":
    case "not_started":
      return "Não Iniciado";
    case "ahead":
      return "Adiantado";
    case "on_track":
      return "No Rumo";
    case "at_risk":
      return "Em Risco";
    case "off_track":
      return "Fora do Rumo";
    case "completed_legacy":
      return "No Rumo";
    default:
      return slug;
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function mapDiffToSlug(diff: number, band: number, offTrack: number): PaceHealthSlug {
  if (diff > band) return "ahead";
  if (diff >= -band) return "on_track";
  if (diff > -offTrack) return "at_risk";
  return "off_track";
}

function buildExplanationPt(params: {
  slug: PaceHealthSlug;
  progressPercent: number;
  elapsedPercent: number;
  diff: number;
  band: number;
  offTrack: number;
  windowStart: string;
  windowEnd: string;
  dateSourcePt: string;
  locked: boolean;
}): string {
  const {
    slug,
    progressPercent,
    elapsedPercent,
    diff,
    band,
    offTrack,
    windowStart,
    windowEnd,
    dateSourcePt,
    locked,
  } = params;
  const base =
    `${dateSourcePt} ` +
    `O badge de Health é sempre um destes cinco (mesma lógica para objetivo, KR, projeto ou marco): Não Iniciado, Adiantado, No Rumo, Em Risco ou Fora do Rumo. ` +
    `Pegamos seu progresso em ${progressPercent}% e comparamos com o tempo já decorrido dentro do prazo (${elapsedPercent}%): a diferença é ${diff} pontos percentuais (p.p.), ou seja, progresso menos o “tempo gasto” do prazo. ` +
    `Janela usada: de ${windowStart} até ${windowEnd}. ` +
    `Regras dos badges: diferença maior que +${band} p.p. → \"Adiantado\"; entre -${band} p.p. e +${band} p.p. (inclusive) → \"No Rumo\"; ` +
    `pior que -${band} p.p. porém ainda melhor que -${offTrack} p.p. → \"Em Risco\"; -${offTrack} p.p. ou pior → \"Fora do Rumo\".`;
  if (locked) return `${base} Valores fixados quando o item foi concluído.`;
  const verdict =
    slug === "ahead"
      ? 'Com esses números, o resultado cai no badge "Adiantado".'
      : slug === "on_track"
        ? 'Com esses números, o resultado cai no badge "No Rumo".'
        : slug === "at_risk"
          ? 'Com esses números, o resultado cai no badge "Em Risco".'
          : slug === "off_track"
            ? 'Com esses números, o resultado cai no badge "Fora do Rumo".'
            : "";
  return `${base} ${verdict}`.trim();
}

const PACE_HEALTH_SLUGS: readonly PaceHealthSlug[] = [
  "draft",
  "no_dates",
  "not_started",
  "ahead",
  "on_track",
  "at_risk",
  "off_track",
  "completed_legacy",
] as const;

function coercePaceHealthSlug(raw: unknown): PaceHealthSlug {
  return typeof raw === "string" && (PACE_HEALTH_SLUGS as readonly string[]).includes(raw)
    ? (raw as PaceHealthSlug)
    : "on_track";
}

export function insightFromSnapshotJson(json: string | null | undefined): HealthInsightDto | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as SnapshotV1;
    if (o?.v !== 1 || typeof o.slug !== "string") return null;
    const slug = coercePaceHealthSlug(o.slug);
    return {
      slug,
      labelPt: labelForSlug(slug),
      diff: typeof o.diff === "number" ? o.diff : null,
      elapsedPercent: typeof o.elapsedPercent === "number" ? o.elapsedPercent : null,
      progressPercent: Number(o.progressPercent ?? 0),
      band: Number(o.band ?? PACE_HEALTH_BAND_PP),
      windowStart: o.windowStart ?? null,
      windowEnd: o.windowEnd ?? null,
      dateSourcePt: o.dateSourcePt ?? "",
      locked: true,
      explanationPt:
        o.explanationPt ??
        "Health congelado: guardamos o cálculo no momento em que marcou como concluído. " +
          "O badge segue a mesma escala (Não Iniciado, Adiantado, No Rumo, Em Risco, Fora do Rumo); não recalculamos sozinhos depois disso.",
    };
  } catch {
    return null;
  }
}

export function serializeHealthSnapshot(
  insight: Omit<HealthInsightDto, "locked">,
  computedAt: string,
): string {
  const payload: SnapshotV1 = {
    v: 1,
    computedAt,
    slug: insight.slug,
    labelPt: insight.labelPt,
    diff: insight.diff,
    elapsedPercent: insight.elapsedPercent,
    progressPercent: insight.progressPercent,
    band: insight.band,
    windowStart: insight.windowStart,
    windowEnd: insight.windowEnd,
    dateSourcePt: insight.dateSourcePt,
    explanationPt: insight.explanationPt,
  };
  return JSON.stringify(payload);
}

function completedLegacyInsight(progressPercent: number): HealthInsightDto {
  return {
    slug: "completed_legacy",
    labelPt: labelForSlug("completed_legacy"),
    diff: null,
    elapsedPercent: null,
    progressPercent,
    band: PACE_HEALTH_BAND_PP,
    windowStart: null,
    windowEnd: null,
    dateSourcePt: "—",
    locked: true,
    explanationPt:
      "Concluído antes de existir registro detalhado de Health. " +
      'Mostramos o badge "No Rumo" como referência neutra e o progresso final do cadastro; não dá para refazer a conta de ritmo com precisão.',
  };
}

export function isCompletedStatus(kind: PaceHealthKind, status: string): boolean {
  if (kind === "project") return status === "completed";
  if (kind === "milestone") return status === "completed";
  return status === "completed";
}

export function computePaceHealth(input: {
  kind: PaceHealthKind;
  status: string;
  progressPercent: number;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  completedAt: string | null;
  healthSnapshotJson: string | null;
  now?: Date;
}): HealthInsightDto {
  const now = input.now ?? new Date();
  const band = PACE_HEALTH_BAND_PP;
  const offTrack = PACE_HEALTH_OFF_TRACK_PP;

  if (isCompletedStatus(input.kind, input.status)) {
    const snap = insightFromSnapshotJson(input.healthSnapshotJson);
    if (snap) return snap;
    return completedLegacyInsight(input.progressPercent);
  }

  if (
    (input.kind === "okr_objective" || input.kind === "okr_key_result") &&
    input.status === "draft"
  ) {
    return {
      slug: "draft",
      labelPt: labelForSlug("draft"),
      diff: null,
      elapsedPercent: null,
      progressPercent: input.progressPercent,
      band,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      dateSourcePt: input.dateSourcePt,
      locked: false,
      explanationPt:
        'Badge "Não Iniciado": em OKR ainda em rascunho não rodamos a conta de ritmo (progresso vs tempo). ' +
        "Depois de publicar, as mesmas datas do ciclo passam a valer para Health e para o status Planejado / Em Progresso / Concluído.",
    };
  }

  if (!input.windowStart || !input.windowEnd) {
    return {
      slug: "no_dates",
      labelPt: labelForSlug("no_dates"),
      diff: null,
      elapsedPercent: null,
      progressPercent: input.progressPercent,
      band,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      dateSourcePt: input.dateSourcePt,
      locked: false,
      explanationPt:
        `${input.dateSourcePt} Badge \"Não Iniciado\": sem início e fim de prazo no calendário não dá para comparar progresso com o tempo; ` +
        "vale para objetivo, KR, projeto ou marco da mesma forma.",
    };
  }

  if (isBeforeWindowStart(input.windowStart, now)) {
    return {
      slug: "not_started",
      labelPt: labelForSlug("not_started"),
      diff: null,
      elapsedPercent: 0,
      progressPercent: input.progressPercent,
      band,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      dateSourcePt: input.dateSourcePt,
      locked: false,
      explanationPt: `${input.dateSourcePt} Badge \"Não Iniciado\": contando por dia em UTC, a data de início do prazo ainda não chegou, então o relógio do ritmo nem começou.`,
    };
  }

  const elapsedPercent = calcElapsedPercent(input.windowStart, input.windowEnd, now);
  const diff = round1(input.progressPercent - elapsedPercent);
  const slug = mapDiffToSlug(diff, band, offTrack);
  const labelPt = labelForSlug(slug);
  const explanationPt = buildExplanationPt({
    slug,
    progressPercent: input.progressPercent,
    elapsedPercent,
    diff,
    band,
    offTrack,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    dateSourcePt: input.dateSourcePt,
    locked: false,
  });

  return {
    slug,
    labelPt,
    diff,
    elapsedPercent,
    progressPercent: input.progressPercent,
    band,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    dateSourcePt: input.dateSourcePt,
    locked: false,
    explanationPt,
  };
}

/** Effective window + PT note for OKR objective (inherits from cycle). */
export function resolveOkrObjectiveWindow(
  objective: {
    start_date?: string | null;
    target_date?: string | null;
    cycle_id?: string | null;
  },
  cycle: { start_date?: string | null; end_date?: string | null; title?: string | null } | null,
): { start: string | null; end: string | null; dateSourcePt: string } {
  const start =
    (objective.start_date as string | null | undefined) ??
    (cycle?.start_date as string | null) ??
    null;
  const end =
    (objective.target_date as string | null | undefined) ??
    (cycle?.end_date as string | null) ??
    null;
  const parts: string[] = [];
  if (objective.start_date) parts.push("início vem da data do próprio objetivo");
  else if (cycle?.start_date)
    parts.push(`início vem do ciclo${cycle.title ? ` \"${cycle.title}\"` : ""}`);
  if (objective.target_date) parts.push("fim (meta) vem da data do próprio objetivo");
  else if (cycle?.end_date)
    parts.push(`fim vem do ciclo${cycle.title ? ` \"${cycle.title}\"` : ""}`);
  const dateSourcePt =
    parts.length > 0
      ? `Mesma janela de datas para status (Planejado / Em Progresso / Concluído) e para Health: ${parts.join(" · ")}.`
      : "Sem datas no objetivo nem no ciclo: não há janela para status unificado nem para Health por ritmo.";
  return { start, end, dateSourcePt };
}

export function resolveOkrKrWindow(
  kr: { start_date?: string | null; target_date?: string | null },
  objective: { start_date?: string | null; target_date?: string | null },
  cycle: { start_date?: string | null; end_date?: string | null; title?: string | null } | null,
): { start: string | null; end: string | null; dateSourcePt: string } {
  const start =
    (kr.start_date as string | null | undefined) ??
    (objective.start_date as string | null | undefined) ??
    (cycle?.start_date as string | null) ??
    null;
  const end =
    (kr.target_date as string | null | undefined) ??
    (objective.target_date as string | null | undefined) ??
    (cycle?.end_date as string | null) ??
    null;
  const parts: string[] = [];
  if (kr.start_date) parts.push("início vem da data do próprio KR");
  else if (objective.start_date) parts.push("início vem do objetivo");
  else if (cycle?.start_date)
    parts.push(`início vem do ciclo${cycle.title ? ` \"${cycle.title}\"` : ""}`);
  if (kr.target_date) parts.push("fim (meta) vem da data do próprio KR");
  else if (objective.target_date) parts.push("fim vem do objetivo");
  else if (cycle?.end_date)
    parts.push(`fim vem do ciclo${cycle.title ? ` \"${cycle.title}\"` : ""}`);
  const dateSourcePt =
    parts.length > 0
      ? `Mesma janela de datas para status e Health (Não Iniciado / Adiantado / No Rumo / Em Risco / Fora do Rumo): ${parts.join(" · ")}.`
      : "Sem datas no KR, no objetivo nem no ciclo: não há janela para comparar ritmo nem para status por calendário.";
  return { start, end, dateSourcePt };
}

export function resolveProjectWindow(project: {
  start_date?: string | null;
  target_date?: string | null;
}): { start: string | null; end: string | null; dateSourcePt: string } {
  const start = (project.start_date as string | null | undefined) ?? null;
  const end = (project.target_date as string | null | undefined) ?? null;
  return {
    start,
    end,
    dateSourcePt:
      "Projeto: início e fim do cadastro definem a mesma janela para o status unificado (Planejado / Em Progresso / Concluído) e para o Health por ritmo.",
  };
}

export function resolveMilestoneWindow(
  milestone: { due_date?: string | null },
  project: { start_date?: string | null; target_date?: string | null; title?: string | null },
): { start: string | null; end: string | null; dateSourcePt: string } {
  const start = (project.start_date as string | null | undefined) ?? null;
  const end =
    (milestone.due_date as string | null | undefined) ??
    (project.target_date as string | null | undefined) ??
    null;
  const ptitle = project.title ? ` \"${project.title}\"` : "";
  const dateSourcePt =
    `Marco: mesma janela para status e Health — início herdado do projeto${ptitle}; ` +
    (milestone.due_date
      ? "fim = data do marco."
      : "fim herdado do projeto se o marco não tiver data própria.");
  return { start, end, dateSourcePt };
}

/**
 * Build snapshot JSON when transitioning into "completed".
 * Pass the **previous** (still active) status so pace is computed once, then frozen.
 */
export function buildCompletionSnapshotFromPreCompleteRow(input: {
  kind: PaceHealthKind;
  previousStatus: string;
  progressPercent: number;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  existingSnapshot: string | null;
  now?: Date;
}): string | null {
  if (input.existingSnapshot) return null;
  if (isCompletedStatus(input.kind, input.previousStatus)) return null;
  const insight = computePaceHealth({
    kind: input.kind,
    status: input.previousStatus,
    progressPercent: input.progressPercent,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    dateSourcePt: input.dateSourcePt,
    completedAt: null,
    healthSnapshotJson: null,
    now: input.now,
  });
  const computedAt = (input.now ?? new Date()).toISOString();
  return serializeHealthSnapshot(
    {
      slug: insight.slug,
      labelPt: insight.labelPt,
      diff: insight.diff,
      elapsedPercent: insight.elapsedPercent,
      progressPercent: insight.progressPercent,
      band: insight.band,
      windowStart: insight.windowStart,
      windowEnd: insight.windowEnd,
      dateSourcePt: insight.dateSourcePt,
      explanationPt: `${insight.explanationPt} Texto e números fixados ao marcar como concluído (${computedAt}); os cinco badges de Health continuam válidos para leitura do que foi salvo.`,
    },
    computedAt,
  );
}
