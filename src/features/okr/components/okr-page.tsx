"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Target,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  TrendingUp,
  ChevronsUpDown,
  ChevronsDownUp,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageGuide, GuideSection, GuideList, GuideExamples } from "@/components/ui/page-guide";
import type { OkrCycle, OkrKeyResult } from "@/lib/types/domain";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { ProjectHealthRow } from "@/features/projects/components/project-badges";
import { OkrProgressBar } from "./okr-progress-bar";
import { CreateObjectiveDialog } from "./create-objective-dialog";
import { CreateKeyResultDialog } from "./create-key-result-dialog";
import { UpdateKeyResultDialog } from "./update-key-result-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  okrObjectiveMatchesSearchQuery,
  type ObjectiveWithKRs,
} from "@/features/okr/lib/okr-okrs-list-search";
import {
  sortOkrObjectivesForList,
  type OkrListSortField,
} from "@/features/okr/lib/okr-okrs-list-sort";
import { cn } from "@/lib/utils/cn";
import { useResizableGridColumns, GridColResizeHandle } from "@/hooks/use-resizable-grid-columns";
import { EntityQuickViewEyeButton } from "@/components/entity-quick-view-dialog";

function OkrListHeaderCell({
  children,
  className,
  resizeIndex,
  startResize,
}: {
  children: ReactNode;
  className?: string;
  resizeIndex: number;
  startResize: (leftIndex: number, e: ReactMouseEvent) => void;
}) {
  return (
    <div className={cn("relative flex min-w-0 items-center", className)}>
      {children}
      <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2">
        <GridColResizeHandle onMouseDown={(e) => startResize(resizeIndex, e)} />
      </div>
    </div>
  );
}

// Left accent colors by status (inline style — safe for dynamic values)
const STATUS_ACCENT: Record<string, string> = {
  draft: "#94a3b8",
  on_track: "#34d399",
  at_risk: "#fbbf24",
  off_track: "#f87171",
  completed: "#60a5fa",
  archived: "#e2e8f0",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), "dd MMM", { locale: ptBR });
}

function fmtMetric(kr: OkrKeyResult): string {
  if (kr.metricType === "boolean") return kr.currentValue >= 1 ? "Concluído" : "Pendente";
  const unit = kr.unit ?? "";
  const pre = kr.metricType === "currency" ? `${unit} ` : "";
  const suf = kr.metricType === "currency" ? "" : unit ? ` ${unit}` : "";
  return `${pre}${kr.currentValue}${suf} / ${pre}${kr.targetValue}${suf}`;
}

/** Chevron | título | ciclo | status | health | métrica | progresso | meta | ações — larguras via `gridTpl` */
const OKR_LIST_GRID_BASE =
  "grid w-full items-center gap-x-0 [&>*]:min-w-0 [&>*]:border-r [&>*]:border-border/70 [&>*]:px-3 [&>*:last-child]:border-r-0";

const STATUS_FILTER_OPTIONS = [
  { value: "planned", label: "Planejado" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "completed", label: "Concluído" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OkrPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prevExpandParam = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  /** Vazio = todos. Vários valores = OR (união). */
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(() => new Set());
  const [filterCycleIds, setFilterCycleIds] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<{
    field: OkrListSortField | null;
    dir: "asc" | "desc";
  }>({ field: null, dir: "asc" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [createObjOpen, setCreateObjOpen] = useState(false);
  const [createKrOpen, setCreateKrOpen] = useState(false);
  const [createKrForObj, setCreateKrForObj] = useState<string | undefined>();
  const [updateKrOpen, setUpdateKrOpen] = useState(false);
  const [selectedKr, setSelectedKr] = useState<OkrKeyResult | null>(null);
  const [objMenu, setObjMenu] = useState<string | null>(null);
  const [krMenu, setKrMenu] = useState<string | null>(null);

  const { widths, startResize } = useResizableGridColumns(
    "hub:okr-page-list-cols-v3",
    /** Últimas colunas: data da meta precisa ~72px+; ações precisam ~100px+ (olho + 2 ícones). */
    [24, 220, 128, 128, 128, 132, 184, 96, 112],
  );
  const okrListGridTpl = widths.map((w) => `${w}px`).join(" ");

  useEffect(() => {
    function closeMenus(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-menu]")) {
        setObjMenu(null);
        setKrMenu(null);
      }
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  const {
    data,
    isLoading,
    isError: objectivesLoadError,
    error: objectivesLoadErrorDetail,
    refetch: refetchObjectives,
  } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives"],
    queryFn: async () => {
      const res = await fetch("/api/okr/objectives");
      const json = (await res.json()) as {
        data?: ObjectiveWithKRs[];
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? `Falha ao carregar objetivos (${res.status})`);
      }
      return { data: json.data ?? [] };
    },
    placeholderData: keepPreviousData,
  });

  const {
    data: cyclesRes,
    isError: cyclesLoadError,
    error: cyclesLoadErrorDetail,
  } = useQuery<{
    data: OkrCycle[];
  }>({
    queryKey: ["okr-cycles"],
    queryFn: async () => {
      const res = await fetch("/api/okr/cycles");
      const json = (await res.json()) as { data?: OkrCycle[]; error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? `Falha ao carregar ciclos (${res.status})`);
      }
      return { data: json.data ?? [] };
    },
  });

  const deleteObjMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/okr/objectives/${id}`, { method: "DELETE" });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["okr-objectives"] });
      const prev = queryClient.getQueryData(["okr-objectives"]);
      queryClient.setQueryData(
        ["okr-objectives"],
        (old: { data: ObjectiveWithKRs[] } | undefined) =>
          old ? { ...old, data: old.data.filter((o) => o.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["okr-objectives"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const deleteKrMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/okr/key-results/${id}`, { method: "DELETE" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const allObjectives = data?.data ?? [];
  const cycles = cyclesRes?.data ?? [];
  const cycleMap = new Map(cycles.map((c) => [c.id, c]));

  const afterScopeFilters = useMemo(() => {
    let list = allObjectives;
    if (filterStatuses.size > 0) {
      list = list.filter((o) => {
        const slug = o.workflowStatusInsight?.slug ?? "planned";
        return filterStatuses.has(slug);
      });
    }
    if (filterCycleIds.size > 0) {
      list = list.filter((o) => o.cycleId != null && filterCycleIds.has(o.cycleId));
    }
    return list;
  }, [allObjectives, filterStatuses, filterCycleIds]);

  const filtered = useMemo(() => {
    const map = new Map(cycles.map((c) => [c.id, c]));
    return afterScopeFilters.filter((o) =>
      okrObjectiveMatchesSearchQuery(search, {
        objective: o,
        cycleTitle: o.cycleId ? map.get(o.cycleId)?.title : undefined,
      }),
    );
  }, [afterScopeFilters, search, cycles]);

  const sortedFiltered = useMemo(
    () => sortOkrObjectivesForList(filtered, sort.field, sort.dir),
    [filtered, sort.field, sort.dir],
  );

  useEffect(() => {
    const cur = searchParams.get("expand");
    if (cur === "all" && sortedFiltered.length > 0) {
      setExpanded(new Set(sortedFiltered.map((o) => o.id)));
    } else if (prevExpandParam.current === "all" && cur !== "all") {
      setExpanded(new Set());
    }
    prevExpandParam.current = cur;
  }, [searchParams, sortedFiltered]);

  const hasNonDefaultTableState = Boolean(
    filterStatuses.size > 0 || filterCycleIds.size > 0 || search.trim() || sort.field !== null,
  );

  /** Cabeçalhos visíveis com filtros/ordenação ativos ou quando há linhas (busca incluída). */
  const showColumnHeaders = !isLoading && (filtered.length > 0 || hasNonDefaultTableState);

  const totalKrs = sortedFiltered.reduce((s, o) => s + o.keyResults.length, 0);
  const allExpanded = sortedFiltered.length > 0 && sortedFiltered.every((o) => expanded.has(o.id));

  function handleSortClick(field: OkrListSortField) {
    setSort((prev) =>
      prev.field !== field
        ? { field, dir: "asc" }
        : { field, dir: prev.dir === "asc" ? "desc" : "asc" },
    );
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setAllExpanded(!allExpanded);
  }

  function setAllExpanded(expand: boolean) {
    setExpanded(expand ? new Set(sortedFiltered.map((o) => o.id)) : new Set());
  }

  function openAddKr(objectiveId: string) {
    setCreateKrForObj(objectiveId);
    setCreateKrOpen(true);
  }

  function clearAllFiltersAndSort() {
    setFilterStatuses(new Set());
    setFilterCycleIds(new Set());
    setSearch("");
    setSort({ field: null, dir: "asc" });
  }

  return (
    <div className="max-w-[1120px] space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">OKRs</h1>
            {!isLoading && !objectivesLoadError && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sortedFiltered.length} objetivo{sortedFiltered.length !== 1 ? "s" : ""} ·{" "}
                {totalKrs} key result{totalKrs !== 1 ? "s" : ""}
              </p>
            )}
            {!isLoading && objectivesLoadError && (
              <p className="mt-0.5 text-xs text-destructive">Erro ao carregar dados</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateObjOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Objetivo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateKrForObj(undefined);
              setCreateKrOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Key Result
          </Button>
        </div>
      </div>

      <PageGuide title="O que são OKRs nesta tela?">
        <p className="text-foreground/95">
          <strong className="text-foreground">OKR</strong> é uma forma prática de transformar
          prioridade em acompanhamento.
        </p>
        <GuideSection>
          <p>
            <strong className="text-foreground">Objetivo:</strong> descreve o que a Tribus quer
            alcançar.
          </p>
          <p>
            <strong className="text-foreground">Key results (KRs):</strong> mostram, com números ou
            métricas, se esse avanço está acontecendo.
          </p>
          <p>
            <strong className="text-foreground">Ciclo:</strong> é o período em que esses OKRs são
            acompanhados, como um mês, trimestre ou fase de trabalho.
          </p>
        </GuideSection>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cada objetivo aparece como item principal;",
              "ao expandir, você vê os KRs ligados a ele;",
              "o progresso do objetivo depende do avanço dos seus KRs;",
              "o ciclo ajuda a organizar e filtrar os OKRs por período.",
            ]}
          />
        </GuideSection>
        <GuideExamples>
          <div>
            <p className="font-medium text-foreground">
              Objetivo: aumentar as vendas da loja no trimestre
            </p>
            <p className="mt-0.5">
              <span className="text-foreground/90">KRs:</span> faturar R$ X, vender Y peças,
              aumentar a taxa de conversão do site.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">
              Objetivo: estruturar melhor a operação da marca
            </p>
            <p className="mt-0.5">
              <span className="text-foreground/90">KRs:</span> cadastrar 100% dos produtos no padrão
              definido, concluir a documentação dos processos principais.
            </p>
          </div>
        </GuideExamples>
      </PageGuide>

      {objectivesLoadError && (
        <div
          className="rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-destructive">Não foi possível carregar os objetivos</p>
          <p className="mt-1 text-muted-foreground">
            {objectivesLoadErrorDetail instanceof Error
              ? objectivesLoadErrorDetail.message
              : "Erro desconhecido"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Confirme se o hub-api está acessível, as variáveis de ambiente (ex.:{" "}
            <code className="rounded bg-muted px-1">HUB_API_URL</code>) e se as migrações D1 foram
            aplicadas (ex.: coluna{" "}
            <code className="rounded bg-muted px-1">health_snapshot_json</code>
            ).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetchObjectives()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {cyclesLoadError && !objectivesLoadError && (
        <div
          className="rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-900 dark:text-amber-100">Ciclos não carregaram</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cyclesLoadErrorDetail instanceof Error
              ? cyclesLoadErrorDetail.message
              : "Erro desconhecido"}
            {" — "}
            Os objetivos podem aparecer sem título de ciclo.
          </p>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 w-48 pl-8 text-sm"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {hasNonDefaultTableState && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={clearAllFiltersAndSort}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
        {sortedFiltered.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={toggleAll}
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-3.5 w-3.5" /> Recolher todos
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-3.5 w-3.5" /> Expandir todos
              </>
            )}
          </Button>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[54px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* ── Lista: cabeçalhos sempre que filtros/ordem/dados existirem; vazio encaixado abaixo ─ */}
      {!isLoading && showColumnHeaders && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/50 shadow-sm">
          <div
            className="border-b border-primary/15 bg-gradient-to-b from-muted/55 via-muted/25 to-background shadow-[inset_0_1px_0_0_hsl(var(--border)/0.45)]"
            role="row"
          >
            <div
              className={cn(OKR_LIST_GRID_BASE, "min-h-[44px] px-4 py-2")}
              style={{ gridTemplateColumns: okrListGridTpl }}
            >
              <OkrListHeaderCell resizeIndex={0} startResize={startResize} className="pr-2">
                <span className="sr-only">Coluna expandir</span>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={1} startResize={startResize} className="px-1">
                <div className="flex min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => handleSortClick("title")}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-background/80",
                      sort.field === "title" && "bg-background/90 shadow-sm ring-1 ring-border/60",
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/75">
                      Objetivo / KR
                    </span>
                    {sort.field === "title" ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown
                        className="h-3 w-3 shrink-0 text-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                  </button>
                </div>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={2} startResize={startResize} className="min-w-0 px-1">
                <div className="flex w-full min-w-0 items-center justify-between gap-1">
                  <span className="whitespace-nowrap pl-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/60">
                    Ciclo
                  </span>
                  <DropdownMenu.Root>
                    <div className="relative shrink-0">
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground",
                            filterCycleIds.size > 0
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border/60 bg-background/40",
                          )}
                          aria-label="Filtrar por ciclo"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {filterCycleIds.size > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                              {filterCycleIds.size}
                            </span>
                          ) : null}
                        </button>
                      </DropdownMenu.Trigger>
                    </div>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-[200] min-w-[13rem] rounded-lg border border-border bg-popover p-1 shadow-lg"
                        sideOffset={4}
                        align="end"
                        data-menu
                      >
                        <DropdownMenu.Item
                          className="cursor-pointer rounded px-2 py-1.5 text-xs outline-none hover:bg-accent"
                          onSelect={() => setFilterCycleIds(new Set())}
                        >
                          Limpar seleção
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        {cycles.map((c) => (
                          <DropdownMenu.CheckboxItem
                            key={c.id}
                            className={cn(
                              "relative flex items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-xs",
                              filterCycleIds.has(c.id) &&
                                "bg-primary/12 font-medium text-foreground",
                            )}
                            checked={filterCycleIds.has(c.id)}
                            onCheckedChange={(checked) => {
                              setFilterCycleIds((prev) => {
                                const n = new Set(prev);
                                if (checked) n.add(c.id);
                                else n.delete(c.id);
                                return n;
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="absolute left-2 flex h-4 w-4 items-center justify-center text-primary">
                              <DropdownMenu.ItemIndicator>
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </DropdownMenu.ItemIndicator>
                            </span>
                            <span className="truncate">{c.title}</span>
                          </DropdownMenu.CheckboxItem>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={3} startResize={startResize} className="min-w-0 px-1">
                <div className="flex w-full min-w-0 items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleSortClick("status")}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-1 transition-colors hover:bg-background/80",
                      sort.field === "status" && "bg-background/90 shadow-sm ring-1 ring-border/60",
                    )}
                  >
                    <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/75">
                      Status
                    </span>
                    {sort.field === "status" ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown
                        className="h-3 w-3 shrink-0 text-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                  </button>
                  <DropdownMenu.Root>
                    <div className="relative shrink-0">
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground",
                            filterStatuses.size > 0
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border/60 bg-background/40",
                          )}
                          aria-label="Filtrar por status"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          {filterStatuses.size > 0 ? (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                              {filterStatuses.size}
                            </span>
                          ) : null}
                        </button>
                      </DropdownMenu.Trigger>
                    </div>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-[200] min-w-[12rem] rounded-lg border border-border bg-popover p-1 shadow-lg"
                        sideOffset={4}
                        align="end"
                        data-menu
                      >
                        <DropdownMenu.Item
                          className="cursor-pointer rounded px-2 py-1.5 text-xs outline-none hover:bg-accent"
                          onSelect={() => setFilterStatuses(new Set())}
                        >
                          Limpar seleção
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="my-1 h-px bg-border" />
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                          <DropdownMenu.CheckboxItem
                            key={opt.value}
                            className={cn(
                              "relative flex items-center rounded-sm py-1.5 pl-8 pr-2 text-xs",
                              filterStatuses.has(opt.value) &&
                                "bg-primary/12 font-medium text-foreground",
                            )}
                            checked={filterStatuses.has(opt.value)}
                            onCheckedChange={(checked) => {
                              setFilterStatuses((prev) => {
                                const n = new Set(prev);
                                if (checked) n.add(opt.value);
                                else n.delete(opt.value);
                                return n;
                              });
                            }}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="absolute left-2 flex h-4 w-4 items-center justify-center text-primary">
                              <DropdownMenu.ItemIndicator>
                                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </DropdownMenu.ItemIndicator>
                            </span>
                            {opt.label}
                          </DropdownMenu.CheckboxItem>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </OkrListHeaderCell>
              <OkrListHeaderCell
                resizeIndex={4}
                startResize={startResize}
                className="min-w-0 justify-start px-2"
              >
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/55">
                  Health
                </span>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={5} startResize={startResize} className="min-w-0 px-2">
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/55">
                  Métrica
                </span>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={6} startResize={startResize} className="min-w-0 px-1">
                <div className="flex w-full min-w-0 items-center">
                  <button
                    type="button"
                    onClick={() => handleSortClick("progress")}
                    className={cn(
                      "flex w-full items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-background/80",
                      sort.field === "progress" &&
                        "bg-background/90 shadow-sm ring-1 ring-border/60",
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/75">
                      Progresso
                    </span>
                    {sort.field === "progress" ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown
                        className="h-3 w-3 shrink-0 text-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                  </button>
                </div>
              </OkrListHeaderCell>
              <OkrListHeaderCell resizeIndex={7} startResize={startResize} className="min-w-0 px-1">
                <div className="flex w-full min-w-0 items-center">
                  <button
                    type="button"
                    onClick={() => handleSortClick("meta")}
                    className={cn(
                      "flex w-full items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-background/80",
                      sort.field === "meta" && "bg-background/90 shadow-sm ring-1 ring-border/60",
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/75">
                      Meta
                    </span>
                    {sort.field === "meta" ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown
                        className="h-3 w-3 shrink-0 text-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                  </button>
                </div>
              </OkrListHeaderCell>
              <div className="relative flex min-w-0 items-center justify-end" aria-hidden />
            </div>
          </div>

          {sortedFiltered.length === 0 ? (
            <div className="border-t border-border bg-background px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Target className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">Nenhum resultado</p>
              <p className="mx-auto mb-4 max-w-xs text-xs text-muted-foreground">
                Tente ajustar os filtros ou{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  onClick={clearAllFiltersAndSort}
                >
                  limpar filtros e ordenação
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 border-t border-border bg-background/50 p-1 pt-1.5">
              {sortedFiltered.map((obj) => (
                <ObjectiveBlock
                  key={obj.id}
                  gridTpl={okrListGridTpl}
                  objective={obj}
                  cycle={obj.cycleId ? cycleMap.get(obj.cycleId) : undefined}
                  isExpanded={expanded.has(obj.id)}
                  onToggle={() => toggle(obj.id)}
                  objMenuOpen={objMenu === obj.id}
                  onObjMenuToggle={() => setObjMenu(objMenu === obj.id ? null : obj.id)}
                  krMenuOpen={krMenu}
                  onKrMenuToggle={(id) => setKrMenu(krMenu === id ? null : id)}
                  onDeleteObj={() => {
                    if (confirm("Remover este objetivo e todos seus key results?"))
                      deleteObjMutation.mutate(obj.id);
                    setObjMenu(null);
                  }}
                  onDeleteKr={(id) => {
                    if (confirm("Remover este key result?")) deleteKrMutation.mutate(id);
                    setKrMenu(null);
                  }}
                  onAddKr={() => openAddKr(obj.id)}
                  onUpdateKr={(kr) => {
                    setSelectedKr(kr);
                    setUpdateKrOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty (workspace sem objetivos e sem filtros) ───────────────── */}
      {!isLoading && !objectivesLoadError && !showColumnHeaders && sortedFiltered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Target className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">Nenhum objetivo ainda</p>
          <p className="mb-6 max-w-xs text-xs text-muted-foreground">
            Crie seu primeiro objetivo estratégico e adicione key results para acompanhar o
            progresso.
          </p>
          <Button size="sm" onClick={() => setCreateObjOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Criar primeiro objetivo
          </Button>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CreateObjectiveDialog open={createObjOpen} onOpenChange={setCreateObjOpen} />
      <CreateKeyResultDialog
        key={createKrForObj ?? "__global__"}
        open={createKrOpen}
        onOpenChange={setCreateKrOpen}
        defaultObjectiveId={createKrForObj}
      />
      <UpdateKeyResultDialog
        open={updateKrOpen}
        onOpenChange={setUpdateKrOpen}
        keyResult={selectedKr}
      />
    </div>
  );
}

// ─── Objective block ──────────────────────────────────────────────────────────

interface ObjectiveBlockProps {
  gridTpl: string;
  objective: ObjectiveWithKRs;
  cycle?: OkrCycle;
  isExpanded: boolean;
  onToggle: () => void;
  objMenuOpen: boolean;
  onObjMenuToggle: () => void;
  krMenuOpen: string | null;
  onKrMenuToggle: (id: string) => void;
  onDeleteObj: () => void;
  onDeleteKr: (id: string) => void;
  onAddKr: () => void;
  onUpdateKr: (kr: OkrKeyResult) => void;
}

function ObjectiveBlock({
  gridTpl,
  objective,
  cycle,
  isExpanded,
  onToggle,
  objMenuOpen,
  onObjMenuToggle,
  krMenuOpen,
  onKrMenuToggle,
  onDeleteObj,
  onDeleteKr,
  onAddKr,
  onUpdateKr,
}: ObjectiveBlockProps) {
  const krs = objective.keyResults;
  const krCount = krs.length;
  const completedKrs = krs.filter((k) => k.status === "completed").length;
  const accentColor = STATUS_ACCENT[objective.status] ?? STATUS_ACCENT.draft;
  const targetDate = fmtDate(objective.targetDate);

  return (
    <div
      className={`rounded-xl border border-border transition-shadow ${
        isExpanded ? "shadow-sm" : ""
      }`}
    >
      {/* Objective header row — mesmo grid do cabeçalho da tabela */}
      <div
        className={cn(
          OKR_LIST_GRID_BASE,
          "cursor-pointer select-none rounded-xl px-4 py-3 transition-colors",
          isExpanded ? "rounded-b-none bg-muted/30" : "bg-card hover:bg-muted/20",
        )}
        style={{
          borderLeft: `3px solid ${accentColor}`,
          gridTemplateColumns: gridTpl,
        }}
        onClick={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest("a, button, [data-menu]")) return;
          onToggle();
        }}
      >
        <div className="flex items-center justify-center pr-2">
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-150 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
        </div>

        <div className="flex min-w-0 flex-col items-start justify-center gap-0.5 self-start px-1">
          <Link
            href={`/okr/objectives/${objective.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block max-w-full truncate text-left align-top text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
          >
            {objective.title}
          </Link>
          {objective.externalRef && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Ref: {objective.externalRef}
            </p>
          )}
          {objective.descriptionText && (
            <p className="w-full max-w-full truncate text-xs leading-tight text-muted-foreground">
              {objective.descriptionText}
            </p>
          )}
        </div>

        <div className="flex min-w-0 items-center px-1">
          <span className="w-full truncate text-xs text-muted-foreground">
            {cycle?.title ?? "—"}
          </span>
        </div>

        <div className="flex w-full min-w-0 items-center justify-start overflow-hidden px-1 pr-0.5">
          <WorkflowStatusRow insight={objective.workflowStatusInsight} tableCellLayout />
        </div>

        <div className="flex w-full min-w-0 items-center justify-start overflow-hidden px-1 pr-0.5">
          <ProjectHealthRow insight={objective.healthInsight} tableCellLayout />
        </div>

        <div className="flex min-w-0 items-center justify-center px-2">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {completedKrs}/{krCount} KR{krCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2.5 px-1">
          <OkrProgressBar
            percent={objective.progressPercent}
            status={objective.status}
            size="xs"
            className="min-w-0 flex-1"
          />
          <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-foreground/70">
            {Math.round(objective.progressPercent)}%
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-center overflow-hidden px-1">
          <span
            className="min-w-0 max-w-full truncate whitespace-nowrap text-xs tabular-nums text-muted-foreground"
            title={targetDate ?? undefined}
          >
            {targetDate ?? "—"}
          </span>
        </div>

        <div
          data-menu
          className="relative flex min-w-0 shrink-0 items-center justify-end gap-1.5 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <EntityQuickViewEyeButton entity={{ kind: "objective", id: objective.id }} />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Adicionar Key Result"
            onClick={onAddKr}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onObjMenuToggle}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {objMenuOpen && (
            <div
              data-menu
              className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg"
            >
              <Link
                href={`/okr/objectives/${objective.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted/60"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                Ver detalhes
              </Link>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                onClick={onAddKr}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                Adicionar KR
              </button>
              <div className="my-1 border-t border-border" />
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-muted/60"
                onClick={onDeleteObj}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover objetivo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KR rows (expanded) */}
      {isExpanded && (
        <div className="overflow-hidden rounded-b-xl border-t border-border/60">
          {krs.length === 0 ? (
            <div className="flex items-center gap-3 bg-muted/10 px-4 py-4 pl-12">
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/60">
                Nenhum key result ainda.{" "}
                <button className="font-medium text-primary hover:underline" onClick={onAddKr}>
                  Adicionar o primeiro
                </button>
              </p>
            </div>
          ) : (
            <>
              {krs.map((kr, idx) => (
                <KrRow
                  key={kr.id}
                  gridTpl={gridTpl}
                  kr={kr}
                  isLast={idx === krs.length - 1}
                  menuOpen={krMenuOpen === kr.id}
                  onMenuToggle={() => onKrMenuToggle(kr.id)}
                  onUpdate={() => onUpdateKr(kr)}
                  onDelete={() => onDeleteKr(kr.id)}
                />
              ))}
              {/* Inline add KR */}
              <div className="flex items-center gap-2 border-t border-border/30 bg-muted/5 px-4 py-2 pl-12">
                <button
                  onClick={onAddKr}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/60 transition-colors hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar key result
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KR row ──────────────────────────────────────────────────────────────────

interface KrRowProps {
  gridTpl: string;
  kr: OkrKeyResult;
  isLast: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

function KrRow({ gridTpl, kr, isLast, menuOpen, onMenuToggle, onUpdate, onDelete }: KrRowProps) {
  const metric = fmtMetric(kr);
  const targetDate = fmtDate(kr.targetDate);

  return (
    <div
      className={cn(
        OKR_LIST_GRID_BASE,
        "bg-muted/5 py-2.5 transition-colors hover:bg-muted/15",
        !isLast ? "border-b border-border/30" : "",
      )}
      style={{ gridTemplateColumns: gridTpl }}
    >
      <div className="flex items-center justify-center pr-2 text-muted-foreground/40">
        <TrendingUp className="h-3 w-3" />
      </div>

      <div className="min-w-0 self-start px-1 pl-3">
        <Link
          href={`/okr/key-results/${kr.id}`}
          className="block truncate text-sm leading-snug text-foreground/80 transition-colors hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          {kr.title}
        </Link>
        {kr.externalRef && (
          <p className="font-mono text-[10px] text-muted-foreground">Ref: {kr.externalRef}</p>
        )}
      </div>

      <div className="flex items-center px-1" aria-hidden />

      <div className="flex w-full min-w-0 items-center justify-start overflow-hidden px-1 pr-0.5">
        <WorkflowStatusRow insight={kr.workflowStatusInsight} tableCellLayout />
      </div>

      <div className="flex w-full min-w-0 items-center justify-start overflow-hidden px-1 pr-0.5">
        <ProjectHealthRow insight={kr.healthInsight} tableCellLayout />
      </div>

      <div className="flex min-w-0 items-center justify-center px-2">
        <span className="block truncate text-xs tabular-nums text-muted-foreground" title={metric}>
          {metric}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-center gap-2.5 px-1">
        <OkrProgressBar
          percent={kr.progressPercent}
          status={kr.status}
          size="xs"
          className="min-w-0 flex-1"
        />
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round(kr.progressPercent)}%
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-center overflow-hidden px-1">
        <span
          className="min-w-0 max-w-full truncate whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          title={targetDate ?? undefined}
        >
          {targetDate ?? "—"}
        </span>
      </div>

      <div
        data-menu
        className="relative flex min-w-0 shrink-0 items-center justify-end gap-1.5 overflow-hidden"
      >
        <EntityQuickViewEyeButton entity={{ kind: "keyResult", id: kr.id }} />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Atualizar progresso"
          onClick={onUpdate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMenuToggle}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {menuOpen && (
          <div
            data-menu
            className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            <Link
              href={`/okr/key-results/${kr.id}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted/60"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              Ver detalhes
            </Link>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
              onClick={onUpdate}
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              Atualizar progresso
            </button>
            <div className="my-1 border-t border-border" />
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-muted/60"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover KR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
