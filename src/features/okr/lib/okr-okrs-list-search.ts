import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OkrObjective, OkrKeyResult } from "@/lib/db/schema";

export type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

export type OkrOkrsListSearchArgs = {
  objective: ObjectiveWithKRs;
  /** Título do ciclo exibido na lista (ou undefined) */
  cycleTitle: string | undefined;
};

/**
 * Funções que devolvem trechos de texto pesquisáveis.
 * Para incluir novos critérios no futuro, acrescente entradas neste array.
 */
export type OkrOkrsSearchTextExtractor = (args: OkrOkrsListSearchArgs) => Iterable<string>;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Labels PT-BR alinhados ao que o usuário vê na UI (badges). */
const OBJECTIVE_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  on_track: "No rumo",
  at_risk: "Em risco",
  off_track: "Fora do rumo",
  completed: "Concluído",
};

const KR_STATUS_LABELS: Record<string, string> = {
  ...OBJECTIVE_STATUS_LABELS,
};

const METRIC_TYPE_LABELS: Record<string, string> = {
  percentage: "Percentual",
  number: "Número",
  currency: "Moeda",
  boolean: "Sim/Não",
  custom: "Personalizado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

function formatMetricLine(kr: OkrKeyResult): string {
  if (kr.metricType === "boolean") {
    return kr.currentValue >= 1 ? "Concluído" : "Pendente";
  }
  const unit = kr.unit ?? "";
  const pre = kr.metricType === "currency" ? `${unit} ` : "";
  const suf = kr.metricType === "currency" ? "" : unit ? ` ${unit}` : "";
  return `${pre}${kr.currentValue}${suf} / ${pre}${kr.targetValue}${suf}`;
}

function dateSearchChunks(d: string | null | undefined): string[] {
  if (!d) return [];
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return [d];
    return [
      d,
      format(dt, "dd MMM", { locale: ptBR }),
      format(dt, "dd MMM yy", { locale: ptBR }),
      format(dt, "dd MMM yyyy", { locale: ptBR }),
      format(dt, "d/M/yyyy"),
      format(dt, "yyyy-MM-dd"),
      String(dt.getDate()),
      String(dt.getFullYear()),
    ];
  } catch {
    return [d];
  }
}

function collectKeyResultSearchText(kr: OkrKeyResult): string[] {
  const parts: string[] = [
    kr.title,
    kr.slug,
    KR_STATUS_LABELS[kr.status] ?? kr.status,
    METRIC_TYPE_LABELS[kr.metricType] ?? kr.metricType,
    kr.metricType,
    formatMetricLine(kr),
    String(kr.currentValue),
    String(kr.targetValue),
    String(kr.startValue),
    String(Math.round(kr.progressPercent)),
  ];
  if (kr.unit) parts.push(kr.unit);
  if (kr.descriptionText) parts.push(kr.descriptionText);
  parts.push(...dateSearchChunks(kr.targetDate));
  parts.push(...dateSearchChunks(kr.startDate));
  return parts;
}

/** Extensível: cada função acrescenta strings ao índice de busca. */
export const OKR_OKRS_LIST_SEARCH_EXTRACTORS: OkrOkrsSearchTextExtractor[] = [
  ({ objective }) => [objective.title, objective.slug],
  ({ objective }) => (objective.descriptionText ? [objective.descriptionText] : []),
  ({ objective }) => [
    OBJECTIVE_STATUS_LABELS[objective.status] ?? objective.status,
    objective.status,
  ],
  ({ objective }) => [String(Math.round(objective.progressPercent)), String(objective.progressPercent)],
  ({ objective }) => [
    objective.priority,
    PRIORITY_LABELS[objective.priority] ?? objective.priority,
  ],
  ({ cycleTitle }) => (cycleTitle ? [cycleTitle] : []),
  ({ objective }) => [...dateSearchChunks(objective.targetDate), ...dateSearchChunks(objective.startDate)],
  ({ objective }) => objective.keyResults.flatMap((kr) => collectKeyResultSearchText(kr)),
];

function flattenSearchText(args: OkrOkrsListSearchArgs, extractors: OkrOkrsSearchTextExtractor[]): string {
  const chunks: string[] = [];
  for (const fn of extractors) {
    for (const s of fn(args)) {
      if (s != null && String(s).length > 0) chunks.push(String(s));
    }
  }
  return chunks.join("\n");
}

export function buildOkrOkrsListSearchIndex(
  args: OkrOkrsListSearchArgs,
  extractors: OkrOkrsSearchTextExtractor[] = OKR_OKRS_LIST_SEARCH_EXTRACTORS,
): string {
  return normalize(flattenSearchText(args, extractors));
}

export function okrObjectiveMatchesSearchQuery(
  query: string,
  args: OkrOkrsListSearchArgs,
  extractors: OkrOkrsSearchTextExtractor[] = OKR_OKRS_LIST_SEARCH_EXTRACTORS,
): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = buildOkrOkrsListSearchIndex(args, extractors);
  return haystack.includes(q);
}
