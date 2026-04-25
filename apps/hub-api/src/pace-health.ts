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
    `${dateSourcePt} Período considerado: de ${windowStart} até ${windowEnd}. ` +
    `Seu progresso está em ${progressPercent}% e o tempo já \"corrido\" dentro do prazo está em ${elapsedPercent}% ` +
    `(diferença de ${diff} pontos percentuais: progresso menos a parte do tempo que já passou). ` +
    `Como lemos isso: acima de +${band} p.p. = adiantado; entre -${band} e +${band} p.p. = no rumo; ` +
    `entre -${offTrack} e -${band} p.p. = em risco; ` +
    `-${offTrack} p.p. ou pior = fora do rumo.`;
  if (locked) return `${base} Saúde travada no momento em que foi concluído.`;
  const verdict =
    slug === "ahead"
      ? "No fim das contas: você está à frente do que o calendário sugeriria."
      : slug === "on_track"
        ? "No fim das contas: está alinhado com o tempo que já passou."
        : slug === "at_risk"
          ? "No fim das contas: um pouco atrás do que o calendário sugeriria."
          : slug === "off_track"
            ? "No fim das contas: bem atrás do que o calendário sugeriria."
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
        "Salvamos como estava a saúde quando você marcou como concluído; depois disso não recalculamos sozinhos.",
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
      "Este item foi concluído antes de guardarmos o detalhe da saúde. Não dá para refazer a conta com precisão; mostramos só o progresso final do cadastro como referência.",
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
      labelPt: "Rascunho",
      diff: null,
      elapsedPercent: null,
      progressPercent: input.progressPercent,
      band,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      dateSourcePt: input.dateSourcePt,
      locked: false,
      explanationPt:
        "Enquanto estiver em rascunho, não calculamos saúde por ritmo. Depois de publicar, passamos a usar as datas e o progresso no ciclo.",
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
      explanationPt: `${input.dateSourcePt} Falta início e fim claros no calendário, então não dá para comparar progresso com o tempo que já passou.`,
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
      explanationPt: `${input.dateSourcePt} Contando por dia em UTC, a data de início ainda não chegou — o prazo oficial nem começou.`,
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
      ? `Datas usadas no cálculo: ${parts.join(" · ")}.`
      : "Datas usadas no cálculo: não há datas no objetivo nem no ciclo.";
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
      ? `Datas usadas no cálculo: ${parts.join(" · ")}.`
      : "Datas usadas no cálculo: não há datas no KR, no objetivo nem no ciclo.";
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
      "Datas usadas no cálculo: início e fim cadastrados no projeto (não há item pai acima no modelo atual).",
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
    `Datas usadas no cálculo: início vem do projeto${ptitle}; ` +
    (milestone.due_date
      ? "fim é a data do marco."
      : "fim vem do projeto quando o marco não tem data própria.");
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
      explanationPt: `${insight.explanationPt} Valores fixados quando foi marcado como concluído (${computedAt}).`,
    },
    computedAt,
  );
}
