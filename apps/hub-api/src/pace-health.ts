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
export function calcElapsedPercent(startDateStr: string, endDateStr: string, now = new Date()): number {
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

function labelForSlug(slug: PaceHealthSlug): string {
  switch (slug) {
    case "draft":
      return "Rascunho";
    case "no_dates":
      return "Indefinido";
    case "not_started":
      return "Não iniciado";
    case "ahead":
      return "Adiantado";
    case "on_track":
      return "No rumo";
    case "at_risk":
      return "Em risco";
    case "off_track":
      return "Fora do rumo";
    case "completed_legacy":
      return "Concluído";
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
  const { slug, progressPercent, elapsedPercent, diff, band, offTrack, windowStart, windowEnd, dateSourcePt, locked } =
    params;
  const base =
    `${dateSourcePt} Janela: ${windowStart} → ${windowEnd}. ` +
    `Progresso ${progressPercent}% vs tempo decorrido no prazo ${elapsedPercent}% ` +
    `(Δ = ${diff} pontos percentuais: progresso menos % do tempo). ` +
    `Faixas: acima de +${band} pp = Adiantado; entre -${band} e +${band} pp = No rumo; ` +
    `abaixo de -${band} pp até -${offTrack} pp (exclusive) = Em risco; ` +
    `-${offTrack} pp ou menos = Fora do rumo.`;
  if (locked) return `${base} Saúde congelada no encerramento.`;
  const verdict =
    slug === "ahead"
      ? "Resultado: adiantado em relação ao calendário."
      : slug === "on_track"
        ? "Resultado: alinhado ao tempo."
        : slug === "at_risk"
          ? "Resultado: atraso moderado frente ao tempo."
          : slug === "off_track"
            ? "Resultado: atraso forte frente ao tempo."
            : "";
  return `${base} ${verdict}`.trim();
}

export function insightFromSnapshotJson(json: string | null | undefined): HealthInsightDto | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as SnapshotV1;
    if (o?.v !== 1 || typeof o.slug !== "string") return null;
    return {
      slug: o.slug,
      labelPt: o.labelPt ?? labelForSlug(o.slug),
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
        "Saúde registrada no momento em que o item foi concluído; não é recalculada automaticamente.",
    };
  } catch {
    return null;
  }
}

export function serializeHealthSnapshot(insight: Omit<HealthInsightDto, "locked">, computedAt: string): string {
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
    labelPt: "Concluído",
    diff: null,
    elapsedPercent: null,
    progressPercent,
    band: PACE_HEALTH_BAND_PP,
    windowStart: null,
    windowEnd: null,
    dateSourcePt: "—",
    locked: true,
    explanationPt:
      "Item concluído antes do registro de snapshot de saúde. Não é possível reconstruir o racional exato; o progresso final no registro é usado apenas como referência.",
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

  if ((input.kind === "okr_objective" || input.kind === "okr_key_result") && input.status === "draft") {
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
        "Em rascunho: a saúde por ritmo só é calculada após sair do rascunho (datas e progresso passam a contar no ciclo publicado).",
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
        `${input.dateSourcePt} Não há data de início e fim efetivas; sem janela não dá para comparar progresso com o tempo decorrido.`,
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
      explanationPt:
        `${input.dateSourcePt} A data de início da janela ainda não chegou (comparando por dia em UTC); o prazo oficial ainda não começou.`,
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
  const start = (objective.start_date as string | null | undefined) ?? (cycle?.start_date as string | null) ?? null;
  const end =
    (objective.target_date as string | null | undefined) ?? (cycle?.end_date as string | null) ?? null;
  const parts: string[] = [];
  if (objective.start_date) parts.push("início próprio do objetivo");
  else if (cycle?.start_date) parts.push(`início do ciclo${cycle.title ? ` «${cycle.title}»` : ""}`);
  if (objective.target_date) parts.push("fim próprio do objetivo");
  else if (cycle?.end_date) parts.push(`fim do ciclo${cycle.title ? ` «${cycle.title}»` : ""}`);
  const dateSourcePt =
    parts.length > 0
      ? `Datas efetivas: ${parts.join("; ")}.`
      : "Datas efetivas: nenhuma definida no objetivo nem no ciclo.";
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
  if (kr.start_date) parts.push("início próprio do KR");
  else if (objective.start_date) parts.push("início do objetivo");
  else if (cycle?.start_date) parts.push(`início do ciclo${cycle.title ? ` «${cycle.title}»` : ""}`);
  if (kr.target_date) parts.push("fim próprio do KR");
  else if (objective.target_date) parts.push("fim do objetivo");
  else if (cycle?.end_date) parts.push(`fim do ciclo${cycle.title ? ` «${cycle.title}»` : ""}`);
  const dateSourcePt =
    parts.length > 0
      ? `Datas efetivas: ${parts.join("; ")}.`
      : "Datas efetivas: nenhuma no KR, objetivo ou ciclo.";
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
    dateSourcePt: "Datas efetivas: datas de início e fim do projeto (sem elemento pai no modelo atual).",
  };
}

export function resolveMilestoneWindow(
  milestone: { due_date?: string | null },
  project: { start_date?: string | null; target_date?: string | null; title?: string | null },
): { start: string | null; end: string | null; dateSourcePt: string } {
  const start = (project.start_date as string | null | undefined) ?? null;
  const end =
    (milestone.due_date as string | null | undefined) ?? (project.target_date as string | null | undefined) ?? null;
  const ptitle = project.title ? ` «${project.title}»` : "";
  const dateSourcePt =
    `Datas efetivas: início herdado do projeto${ptitle}; ` +
    (milestone.due_date ? "fim = data do marco." : "fim herdado do projeto (sem due_date no marco).");
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
      explanationPt: `${insight.explanationPt} Valor congelado ao marcar como concluído em ${computedAt}.`,
    },
    computedAt,
  );
}
