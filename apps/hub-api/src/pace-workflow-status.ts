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
import { effectiveOkrStatusForPaceAndWorkflow } from "./okr-pace-integrity";

export type WorkflowStatusSlug =
  | "planned"
  | "in_progress"
  | "blocked"
  | "completed"
  | "successful"
  | "partially_successful"
  | "failed"
  | "cancelled";

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
  if (kind === "project" || kind === "milestone") return false;
  return dbStatus === "completed";
}

export function computeWorkflowStatus(input: {
  kind: PaceHealthKind;
  dbStatus: string;
  progressPercent?: number;
  /** Projects: permite bloqueio manual via health_status = blocked. */
  isManuallyBlocked?: boolean;
  /** OKR: draft uses Planejado + explanation */
  isDraft?: boolean;
  windowStart: string | null;
  windowEnd: string | null;
  dateSourcePt: string;
  now?: Date;
}): WorkflowStatusInsightDto {
  const now = input.now ?? new Date();
  const { kind, dbStatus } = input;
  const progressPercent = Number(input.progressPercent ?? 0);

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

  if (kind === "project" || kind === "milestone") {
    if (dbStatus === "completed") {
      return {
        slug: "successful",
        labelPt: "Bem Sucedido",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: true,
        explanationPt:
          `${kind === "project" ? "Projeto" : "Marco"} marcado como concluido no cadastro. ` +
          'No fluxo operacional de Projetos/Marcos, esse encerramento equivale a "Bem Sucedido".',
      };
    }
    if (dbStatus === "cancelled") {
      return {
        slug: "cancelled",
        labelPt: "Cancelado",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: true,
        explanationPt: `${kind === "project" ? "Projeto" : "Marco"} cancelado manualmente no cadastro. O status operacional permanece "Cancelado".`,
      };
    }
    if (dbStatus === "blocked" || dbStatus === "on_hold" || input.isManuallyBlocked) {
      return {
        slug: "blocked",
        labelPt: "Bloqueado",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: false,
        explanationPt: `${kind === "project" ? "Projeto" : "Marco"} bloqueado manualmente. O status operacional fica em "Bloqueado" até desbloquear.`,
      };
    }
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
  if (afterEnd && (kind === "project" || kind === "milestone")) {
    if (progressPercent >= 100) {
      return {
        slug: "successful",
        labelPt: "Bem Sucedido",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: true,
        explanationPt: `${input.dateSourcePt} O prazo encerrou e o progresso chegou a ${Math.round(progressPercent)}% (>=100%). Resultado final: "Bem Sucedido".`,
      };
    }
    if (progressPercent >= 80) {
      return {
        slug: "partially_successful",
        labelPt: "Parcialmente Bem Sucedido",
        dateSourcePt: input.dateSourcePt,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        locked: true,
        explanationPt: `${input.dateSourcePt} O prazo encerrou com ${Math.round(progressPercent)}% (>=80% e <100%). Resultado final: "Parcialmente Bem Sucedido".`,
      };
    }
    return {
      slug: "failed",
      labelPt: "Falhou",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: true,
      explanationPt: `${input.dateSourcePt} O prazo encerrou com ${Math.round(progressPercent)}% (<80%). Resultado final: "Falhou".`,
    };
  }

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
  const raw = String(objective.status ?? "draft");
  const p = Number(objective.progress_percent ?? 0);
  return computeWorkflowStatus({
    kind: "okr_objective",
    dbStatus: effectiveOkrStatusForPaceAndWorkflow(raw, p),
    isDraft: raw === "draft",
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
  const raw = String(kr.status ?? "draft");
  const p = Number(kr.progress_percent ?? 0);
  return computeWorkflowStatus({
    kind: "okr_key_result",
    dbStatus: effectiveOkrStatusForPaceAndWorkflow(raw, p),
    isDraft: raw === "draft",
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
    progressPercent: Number(raw.progress_percent ?? 0),
    isManuallyBlocked:
      String(raw.health_status ?? "") === "blocked" || String(raw.status ?? "") === "on_hold",
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}

export function workflowStatusForMilestoneRow(
  milestone: Record<string, unknown>,
  projectRaw: Record<string, unknown>,
  taskProgressPercent?: number,
) {
  const w = resolveMilestoneWindow(milestone, projectRaw);
  const progress =
    String(milestone.status ?? "") === "completed" ? 100 : Number(taskProgressPercent ?? 0);
  return computeWorkflowStatus({
    kind: "milestone",
    dbStatus: String(milestone.status ?? "pending"),
    progressPercent: Math.max(0, Math.min(100, progress)),
    isManuallyBlocked: String(milestone.status ?? "") === "missed",
    windowStart: w.start,
    windowEnd: w.end,
    dateSourcePt: w.dateSourcePt,
  });
}
