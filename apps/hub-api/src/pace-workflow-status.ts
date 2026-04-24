/**
 * Unified workflow status (Planejado / Em progresso / Concluído) from calendar window + DB state.
 * Uses the same effective date windows as pace-health (inheritance rules live in pace-health).
 */

import type { PaceHealthKind } from "./pace-health";
import {
  resolveMilestoneWindow,
  resolveOkrKrWindow,
  resolveOkrObjectiveWindow,
  resolveProjectWindow,
} from "./pace-health";

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

function dayUtc(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isBeforeStart(windowStart: string | null, now: Date): boolean {
  if (!windowStart) return false;
  const start = new Date(windowStart);
  if (Number.isNaN(start.getTime())) return false;
  return dayUtc(now) < dayUtc(start);
}

function isStrictlyAfterEnd(windowEnd: string | null, now: Date): boolean {
  if (!windowEnd) return false;
  const end = new Date(windowEnd);
  if (Number.isNaN(end.getTime())) return false;
  return dayUtc(now) > dayUtc(end);
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
        "Status «Concluído»: o item está marcado como encerrado no cadastro. Não é recalculado automaticamente pelo calendário.",
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
        "Status «Planejado»: ainda em rascunho. Ao publicar, o calendário (início/fim efetivos) passa a controlar Em progresso.",
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
          "Projeto cancelado no registro. Na vista unificada aparece como «Planejado»; detalhe administrativo permanece no cadastro.",
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
          "Projeto «Em espera» no cadastro: na vista unificada tratado como «Planejado» até voltar a ativo.",
      };
    }
  }

  if (kind === "milestone" && dbStatus === "missed") {
    return {
      slug: "in_progress",
      labelPt: "Em progresso",
      dateSourcePt: input.dateSourcePt,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      locked: false,
      explanationPt:
        "Marco marcado como perdido/atrasado no cadastro; na vista unificada segue «Em progresso» até conclusão explícita.",
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
      explanationPt:
        `${input.dateSourcePt} Sem data de início e fim efetivas no calendário: permanece «Planejado» até haver janela.`,
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
      explanationPt:
        `${input.dateSourcePt} Hoje (UTC) ainda é antes do início (${input.windowStart}); a janela oficial ainda não começou.`,
    };
  }

  const afterEnd = isStrictlyAfterEnd(input.windowEnd, now);
  return {
    slug: "in_progress",
    labelPt: "Em progresso",
    dateSourcePt: input.dateSourcePt,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    locked: false,
    explanationPt: afterEnd
      ? `${input.dateSourcePt} O fim da janela (${input.windowEnd}) já passou em calendário (UTC), mas o item não está concluído no cadastro; permanece «Em progresso».`
      : `${input.dateSourcePt} Dentro da janela oficial (${input.windowStart} → ${input.windowEnd}, dias em UTC).`,
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
