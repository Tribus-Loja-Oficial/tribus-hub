/**
 * Status operacional unificado: Planejado, Em Progresso ou Concluído (mesma regra para OKR, projeto e marco).
 * Combina janela de datas efetivas + estado no cadastro. Mesmas janelas que pace-health.
 */

import type { PaceHealthKind } from "./pace-health";
import {
  resolveMilestoneWindow,
  resolveOkrKrWindow,
  resolveOkrObjectiveWindow,
  resolveProjectWindow,
} from "./pace-health";
import {
  PACE_CIVIL_TIMEZONE_DEFAULT,
  isCivilCalendarBeforePrazoStart,
  isCivilCalendarStrictlyAfterPrazoEnd,
} from "./pace-civil-dates";

export type WorkflowStatusSlug = "planned" | "in_progress" | "completed";

export type WorkflowStatusInsightDto = {
  slug: WorkflowStatusSlug;
  labelPt: string;
  dateSourcePt: string;
  windowStart: string | null;
  windowEnd: string | null;
  locked: boolean;
  explanationPt: string;
};

function isBeforeStart(windowStart: string | null, now: Date): boolean {
  if (!windowStart) return false;
  return isCivilCalendarBeforePrazoStart(windowStart, now, PACE_CIVIL_TIMEZONE_DEFAULT);
}

function isStrictlyAfterEnd(windowEnd: string | null, now: Date): boolean {
  if (!windowEnd) return false;
  return isCivilCalendarStrictlyAfterPrazoEnd(windowEnd, now, PACE_CIVIL_TIMEZONE_DEFAULT);
}

function isDbCompleted(kind: PaceHealthKind, dbStatus: string): boolean {
  if (kind === "project") return dbStatus === "completed";
  if (kind === "milestone") return dbStatus === "completed";
  return dbStatus === "completed";
}

export function computeWorkflowStatus(input: {
  kind: PaceHealthKind;
  dbStatus: string;
  /** OKR: draft uses Planejado + explanation */
  isDraft?: boolean;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  now?: Date;
}): WorkflowStatusInsightDto {
  const now = input.now ?? new Date();
  const { kind, dbStatus } = input;

  if (isDbCompleted(kind, dbStatus)) {
    return {
      slug: "completed",
      labelPt: "Concluído",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: true,
      explanationPt:
        'Status "Concluído" (um dos três da coluna, igual para objetivo, KR, projeto ou marco): o cadastro já está encerrado. ' +
        "As datas não reabrem esse valor sozinhas.",
    };
  }

  if (input.isDraft) {
    return {
      slug: "planned",
      labelPt: "Planejado",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: false,
      explanationPt:
        'Status "Planejado": em OKR ainda em rascunho o item não entra no fluxo publicado; a coluna mostra Planejado. ' +
        'Depois de publicar, início e fim de prazo passam a definir quando o status vira "Em Progresso".',
    };
  }

  if (kind === "project") {
    if (dbStatus === "cancelled") {
      return {
        slug: "planned",
        labelPt: "Planejado",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: false,
        explanationPt:
          'Projeto cancelado no cadastro. Na coluna de status unificado ele aparece como "Planejado"; o cancelamento continua registrado nos detalhes do projeto.',
      };
    }
    if (dbStatus === "on_hold") {
      return {
        slug: "planned",
        labelPt: "Planejado",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: false,
        explanationPt:
          'Projeto em pausa no cadastro. O status unificado fica em "Planejado" até o projeto voltar a ficar ativo.',
      };
    }
  }

  if (kind === "milestone" && dbStatus === "missed") {
    return {
      slug: "in_progress",
      labelPt: "Em Progresso",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: false,
      explanationPt:
        'Marco marcado como atrasado/perdido no cadastro. O status unificado segue "Em Progresso" até ser marcado como concluído (aí vai para "Concluído").',
    };
  }

  if (!input.windowStart || !input.windowEnd) {
    return {
      slug: "planned",
      labelPt: "Planejado",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: false,
      explanationPt: `${input.dateSourcePt} Sem início e fim de prazo definidos, o status unificado fica em \"Planejado\" até existir uma janela com as duas datas.`,
    };
  }

  if (isBeforeStart(input.windowStart, now)) {
    return {
      slug: "planned",
      labelPt: "Planejado",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: false,
      explanationPt: `${input.dateSourcePt} No calendario civil do fuso ${PACE_CIVIL_TIMEZONE_DEFAULT}, ainda estamos antes de ${input.windowStart} — o status unificado fica em \"Planejado\".`,
    };
  }

  const afterEnd = isStrictlyAfterEnd(input.windowEnd, now);
  return {
    slug: "in_progress",
    labelPt: "Em Progresso",
    dateSourcePt: input.dateSourcePt,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    locked: false,
    explanationPt: afterEnd
      ? `${input.dateSourcePt} O fim do prazo (${input.windowEnd}) ja passou no calendario do fuso ${PACE_CIVIL_TIMEZONE_DEFAULT}, mas o cadastro ainda nao esta concluido — o status unificado continua \"Em Progresso\" ate encerrar.`
      : `${input.dateSourcePt} Estamos entre ${input.windowStart} e ${input.windowEnd} (calendario ${PACE_CIVIL_TIMEZONE_DEFAULT}): prazo em andamento, entao o status unificado e \"Em Progresso\".`,
  };
}

export function workflowStatusForOkrObjective(
  objective: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
) {
  const w = resolveOkrObjectiveWindow(objective, cycle);
  return computeWorkflowStatus({
    kind: "okr_objective",
    dbStatus: String(objective.status ?? "draft"),
    isDraft: String(objective.status ?? "") === "draft",
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}

export function workflowStatusForOkrKr(
  kr: Record<string, unknown>,
  objective: Record<string, unknown>,
  cycle: Record<string, unknown> | null,
) {
  const w = resolveOkrKrWindow(kr, objective, cycle);
  return computeWorkflowStatus({
    kind: "okr_key_result",
    dbStatus: String(kr.status ?? "draft"),
    isDraft: String(kr.status ?? "") === "draft",
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}

export function workflowStatusForProjectRow(raw: Record<string, unknown>) {
  const w = resolveProjectWindow(raw);
  return computeWorkflowStatus({
    kind: "project",
    dbStatus: String(raw.status ?? "planned"),
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}

export function workflowStatusForMilestoneRow(
  milestone: Record<string, unknown>,
  projectRaw: Record<string, unknown>,
) {
  const w = resolveMilestoneWindow(milestone, projectRaw);
  return computeWorkflowStatus({
    kind: "milestone",
    dbStatus: String(milestone.status ?? "pending"),
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}
