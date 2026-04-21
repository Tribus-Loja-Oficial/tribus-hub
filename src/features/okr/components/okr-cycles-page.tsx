"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  CalendarRange,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  RotateCcw,
  Archive,
  XCircle,
  Loader2,
  LayoutGrid,
  Search,
  Filter,
  Sparkles,
  Target,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { Input } from "@/components/ui/input";
import type { OkrCycle } from "@/lib/types/domain";
import type {
  CycleCardStats,
  OkrCycleWithStats,
  ObjectiveWithKRs,
} from "@/lib/services/okr.service";
import { OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar } from "./okr-progress-bar";
import { CreateCycleDialog } from "./create-cycle-dialog";
import { differenceInDays, isAfter, isBefore, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";

type SortKey = "start_desc" | "start_asc" | "end_desc" | "end_asc";
type StatusFilter = "all" | OkrCycle["status"];

/** Cache antigo do React Query ou respostas parciais podem vir sem `stats`. */
const EMPTY_CYCLE_STATS: CycleCardStats = {
  objectiveCount: 0,
  keyResultCount: 0,
  objectivesCompleted: 0,
  krsCompleted: 0,
  objectivesAtRisk: 0,
  objectivesOffTrack: 0,
  krsAtRisk: 0,
  krsOffTrack: 0,
  avgKrProgress: 0,
};

function resolveCycleStats(cycle: { stats?: CycleCardStats }): CycleCardStats {
  return cycle.stats ?? EMPTY_CYCLE_STATS;
}

function formatD(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy", { locale: ptBR });
}

function formatShort(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM", { locale: ptBR });
}

/** Progresso temporal 0–100 e texto contextual (independente do status administrativo). */
function getTemporalLine(cycle: OkrCycle): { progress: number; caption: string } {
  const now = new Date();
  const start = new Date(cycle.startDate);
  const end = new Date(cycle.endDate);
  if (isBefore(now, start)) {
    const days = differenceInDays(start, now);
    return {
      progress: 0,
      caption: days <= 0 ? "Começa hoje" : `Começa em ${days} dia(s)`,
    };
  }
  if (isAfter(now, end)) {
    const daysSince = differenceInDays(now, end);
    if (daysSince === 0) return { progress: 100, caption: "Último dia do período" };
    return { progress: 100, caption: `Período encerrado há ${daysSince} dia(s)` };
  }
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  const progress = total === 0 ? 100 : Math.min(100, Math.round((elapsed / total) * 100));
  const daysLeft = differenceInDays(end, now);
  if (daysLeft === 0) return { progress, caption: `${progress}% do tempo · último dia` };
  return {
    progress,
    caption: `${progress}% do tempo decorrido · faltam ${daysLeft} dia(s)`,
  };
}

function cycleCardTone(status: OkrCycle["status"]): string {
  switch (status) {
    case "active":
      return "border-primary/35 bg-gradient-to-br from-primary/[0.06] to-card shadow-sm ring-1 ring-primary/15";
    case "planned":
      return "border-border bg-card hover:border-muted-foreground/25";
    case "closed":
      return "border-border/80 bg-muted/25";
    case "archived":
      return "border-dashed border-border/90 bg-muted/15 opacity-[0.92]";
    default:
      return "border-border bg-card";
  }
}

export function OkrCyclesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("start_desc");
  const [quickOnlyActive, setQuickOnlyActive] = useState(false);
  const [quickOnlyPlanned, setQuickOnlyPlanned] = useState(false);
  /** Ciclo com lista de objetivos expandida (um por vez). */
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: OkrCycleWithStats[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
  });

  useEffect(() => {
    function closeMenu(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-cycle-menu]")) setMenuOpen(null);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const patchMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/okr/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar ciclo");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okr/cycles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover ciclo");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const cycles = data?.data ?? [];

  const activeCycle = useMemo(() => cycles.find((c) => c.status === "active"), [cycles]);

  const activeStats = useMemo(
    () => (activeCycle ? resolveCycleStats(activeCycle) : null),
    [activeCycle],
  );

  const nextPlanned = useMemo(() => {
    const now = new Date();
    const planned = cycles
      .filter((c) => c.status === "planned")
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return planned.find((c) => isAfter(new Date(c.startDate), now)) ?? planned[0];
  }, [cycles]);

  const filteredSorted = useMemo(() => {
    let list = [...cycles];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q));
    if (quickOnlyActive) list = list.filter((c) => c.status === "active");
    else if (quickOnlyPlanned) list = list.filter((c) => c.status === "planned");
    else if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

    const sortFn = (a: OkrCycleWithStats, b: OkrCycleWithStats) => {
      const as = new Date(a.startDate).getTime();
      const bs = new Date(b.startDate).getTime();
      const ae = new Date(a.endDate).getTime();
      const be = new Date(b.endDate).getTime();
      switch (sortKey) {
        case "start_asc":
          return as - bs;
        case "start_desc":
          return bs - as;
        case "end_asc":
          return ae - be;
        case "end_desc":
          return be - ae;
        default:
          return 0;
      }
    };
    list.sort(sortFn);
    return list;
  }, [cycles, search, statusFilter, sortKey, quickOnlyActive, quickOnlyPlanned]);

  function requestActivate(id: string) {
    if (
      activeCycle &&
      activeCycle.id !== id &&
      !confirm(
        `Ativar este ciclo encerrará o ciclo ativo atual (“${activeCycle.title}”). Continuar?`,
      )
    ) {
      return;
    }
    patchMutation.mutate({ id, status: "active" });
  }

  function requestClose(id: string, title: string) {
    if (!confirm(`Encerrar o ciclo “${title}”?`)) return;
    patchMutation.mutate({ id, status: "closed" });
  }

  function requestArchive(id: string, title: string) {
    if (!confirm(`Arquivar o ciclo “${title}”? Ele ficará disponível apenas para consulta.`))
      return;
    patchMutation.mutate({ id, status: "archived" });
  }

  return (
    <div className="max-w-6xl space-y-8">
      {/* ── Header executivo ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-muted/40 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="bg-primary/12 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-primary/20">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Ciclos OKR</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Gerencie os períodos estratégicos que organizam objetivos e resultados-chave. Um
                ciclo ativo define o contexto padrão do OKR Manager e dos filtros do módulo.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {cycles.length} ciclo{cycles.length !== 1 ? "s" : ""} cadastrado
                  {cycles.length !== 1 ? "s" : ""}
                </span>
                {activeCycle && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle className="h-3 w-3" />
                    Ativo: {activeCycle.title}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1.5 shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Novo ciclo
          </Button>
        </div>
      </div>

      <PageGuide title="O que são Ciclos OKR?">
        <p>
          Um <strong className="text-foreground">ciclo</strong> é o período estratégico que organiza
          seus OKRs — pode ser mensal, trimestral ou por fase de trabalho.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cada ciclo agrupa objetivos e KRs de um período específico;",
              "apenas um ciclo pode estar ativo por vez — ele define o contexto padrão do OKR Manager;",
              "ciclos encerrados ficam arquivados para consulta histórica;",
              "ao clicar em um ciclo você vê seus OKRs detalhados.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {/* ── Resumo rápido ───────────────────────────────────────────── */}
      {!isLoading && cycles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Ciclo ativo"
            icon={CheckCircle}
            iconClass="text-emerald-600 dark:text-emerald-400"
            empty={!activeCycle}
            emptyLabel="Nenhum ciclo ativo"
          >
            {activeCycle && (
              <>
                <p className="truncate font-semibold text-foreground">{activeCycle.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatShort(activeCycle.startDate)} → {formatShort(activeCycle.endDate)}
                </p>
                <div className="mt-2">
                  <OkrStatusBadge status={activeCycle.status} />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Tempo: {getTemporalLine(activeCycle).progress}%
                </div>
              </>
            )}
          </SummaryCard>

          <SummaryCard
            title="Total de ciclos"
            icon={CalendarRange}
            iconClass="text-sky-600 dark:text-sky-400"
          >
            <p className="text-2xl font-bold tabular-nums text-foreground">{cycles.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inclui planejados, ativos e encerrados
            </p>
          </SummaryCard>

          <SummaryCard
            title="Próximo planejado"
            icon={Clock}
            iconClass="text-amber-600 dark:text-amber-400"
            empty={!nextPlanned}
            emptyLabel="Nenhum ciclo planejado"
          >
            {nextPlanned && (
              <>
                <p className="truncate font-semibold text-foreground">{nextPlanned.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Início previsto {formatD(nextPlanned.startDate)}
                </p>
              </>
            )}
          </SummaryCard>

          <SummaryCard
            title="Execução no ciclo ativo"
            icon={Target}
            iconClass="text-violet-600 dark:text-violet-400"
            empty={!activeCycle}
            emptyLabel="Sem ciclo ativo"
          >
            {activeCycle && activeStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Objetivos</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeStats.objectiveCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Key results</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeStats.keyResultCount}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Em risco</p>
                  <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                    {activeStats.objectivesAtRisk + activeStats.objectivesOffTrack > 0
                      ? `${activeStats.objectivesAtRisk + activeStats.objectivesOffTrack} obj.`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Média KRs</p>
                  <p className="font-semibold tabular-nums text-foreground">
                    {activeStats.avgKrProgress}%
                  </p>
                </div>
              </div>
            )}
          </SummaryCard>
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────── */}
      {!isLoading && cycles.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 bg-background pl-8 text-sm"
              placeholder="Buscar por nome do ciclo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setQuickOnlyActive(false);
                setQuickOnlyPlanned(false);
              }}
            >
              <option value="all">Todos os status</option>
              <option value="planned">Planejado</option>
              <option value="active">Ativo</option>
              <option value="closed">Encerrado</option>
              <option value="archived">Arquivado</option>
            </select>
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="start_desc">Início · mais recente</option>
              <option value="start_asc">Início · mais antigo</option>
              <option value="end_desc">Término · mais recente</option>
              <option value="end_asc">Término · mais antigo</option>
            </select>
            <Button
              type="button"
              variant={quickOnlyActive ? "secondary" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setQuickOnlyActive((v) => !v);
                setQuickOnlyPlanned(false);
                setStatusFilter("all");
              }}
            >
              Só ativo
            </Button>
            <Button
              type="button"
              variant={quickOnlyPlanned ? "secondary" : "outline"}
              size="sm"
              className="h-9 text-xs"
              onClick={() => {
                setQuickOnlyPlanned((v) => !v);
                setQuickOnlyActive(false);
                setStatusFilter("all");
              }}
            >
              Só planejados
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80">
            <CalendarRange className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">Nenhum ciclo ainda</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Os ciclos definem em qual janela de tempo seus OKRs valem. Crie o primeiro para começar
            a alinhar objetivos e key results ao ritmo da empresa.
          </p>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Criar primeiro ciclo
          </Button>
        </div>
      )}

      {/* ── Lista principal ─────────────────────────────────────────── */}
      {!isLoading && cycles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Todos os ciclos</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {filteredSorted.length} exibido{filteredSorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredSorted.length === 0 && (
            <p className="rounded-xl border border-border bg-card py-8 text-center text-sm text-muted-foreground">
              Nenhum ciclo corresponde aos filtros.{" "}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setQuickOnlyActive(false);
                  setQuickOnlyPlanned(false);
                }}
              >
                Limpar filtros
              </button>
            </p>
          )}

          {filteredSorted.map((cycle) => {
            const { progress, caption } = getTemporalLine(cycle);
            const isPatchingThis =
              patchMutation.isPending &&
              (patchMutation.variables as { id: string })?.id === cycle.id;
            const s = resolveCycleStats(cycle);
            const riskObj = s.objectivesAtRisk + s.objectivesOffTrack;
            const riskKr = s.krsAtRisk + s.krsOffTrack;

            return (
              <div
                key={cycle.id}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all",
                  cycleCardTone(cycle.status),
                )}
              >
                <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-stretch lg:gap-6">
                  {/* A — Identidade */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <button
                        type="button"
                        aria-expanded={expandedCycleId === cycle.id}
                        aria-label={
                          expandedCycleId === cycle.id
                            ? "Recolher objetivos do ciclo"
                            : "Ver objetivos do ciclo"
                        }
                        onClick={() =>
                          setExpandedCycleId((id) => (id === cycle.id ? null : cycle.id))
                        }
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                          expandedCycleId === cycle.id &&
                            "border-primary/40 bg-primary/5 text-primary",
                        )}
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            expandedCycleId === cycle.id && "rotate-90",
                          )}
                        />
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/okr/cycles/${cycle.id}`}
                            className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {cycle.title}
                          </Link>
                          {cycle.externalRef && (
                            <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {cycle.externalRef}
                            </span>
                          )}
                          <CycleStatusBadge status={cycle.status} />
                          {cycle.status === "active" && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                              Ciclo em foco
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="tabular-nums">{formatD(cycle.startDate)}</span>
                          <span className="mx-1.5 text-muted-foreground/60">→</span>
                          <span className="tabular-nums">{formatD(cycle.endDate)}</span>
                        </p>
                        {cycle.description && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {cycle.description}
                          </p>
                        )}
                        <Link
                          href={`/okr/cycles/${cycle.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Ver detalhes do ciclo
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* B — Tempo */}
                  <div className="w-full shrink-0 space-y-2 lg:w-[220px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Tempo do período</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <OkrProgressBar
                      percent={progress}
                      size="sm"
                      status={cycle.status === "active" ? "on_track" : undefined}
                      className={cycle.status === "archived" ? "opacity-80" : undefined}
                    />
                    <p className="text-[11px] leading-snug text-muted-foreground">{caption}</p>
                  </div>

                  {/* C — OKRs */}
                  <div className="w-full shrink-0 lg:w-[240px]">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Resumo no ciclo
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <StatChip label="Objetivos" value={s.objectiveCount} />
                      <StatChip label="Key results" value={s.keyResultCount} />
                      <StatChip label="Obj. concl." value={s.objectivesCompleted} muted />
                      <StatChip label="KRs concl." value={s.krsCompleted} muted />
                      <StatChip
                        label="Em risco"
                        value={riskObj + riskKr > 0 ? `${riskObj}o · ${riskKr}kr` : "0"}
                        warn={riskObj + riskKr > 0}
                      />
                      <StatChip label="Média KRs" value={`${s.avgKrProgress}%`} />
                    </div>
                  </div>

                  {/* D — Ações */}
                  <div
                    className="flex shrink-0 flex-col items-stretch justify-center gap-2 border-t border-border/60 pt-4 lg:w-[148px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
                    data-cycle-menu
                  >
                    {cycle.status === "planned" && (
                      <Button
                        size="sm"
                        className="w-full justify-center gap-1.5"
                        disabled={isPatchingThis}
                        onClick={() => requestActivate(cycle.id)}
                      >
                        {isPatchingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Ativar
                      </Button>
                    )}
                    {cycle.status === "active" && (
                      <>
                        <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          Ciclo ativo
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={isPatchingThis}
                          onClick={() => requestClose(cycle.id, cycle.title)}
                        >
                          {isPatchingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Encerrar
                        </Button>
                      </>
                    )}
                    {cycle.status === "closed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={isPatchingThis}
                        onClick={() => requestArchive(cycle.id, cycle.title)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Arquivar
                      </Button>
                    )}
                    {cycle.status === "archived" && (
                      <p className="px-1 text-center text-[11px] text-muted-foreground">
                        Arquivado — use o menu para reabrir se necessário.
                      </p>
                    )}

                    <div className="relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setMenuOpen(menuOpen === cycle.id ? null : cycle.id)}
                      >
                        <MoreHorizontal className="mr-1 h-4 w-4" />
                        Mais ações
                      </Button>
                      {menuOpen === cycle.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-popover py-1 shadow-lg">
                          <Link
                            href={`/okr/cycles/${cycle.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                            onClick={() => setMenuOpen(null)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            Ver detalhes
                          </Link>
                          <div className="my-1 border-t border-border" />
                          <p className="px-3 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                            Status
                          </p>
                          {cycle.status !== "planned" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                patchMutation.mutate({ id: cycle.id, status: "planned" });
                                setMenuOpen(null);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Planejado
                            </button>
                          )}
                          {cycle.status !== "active" && cycle.status !== "archived" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                requestActivate(cycle.id);
                                setMenuOpen(null);
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Ativar
                            </button>
                          )}
                          {cycle.status !== "closed" && cycle.status !== "archived" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                requestClose(cycle.id, cycle.title);
                                setMenuOpen(null);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Encerrar
                            </button>
                          )}
                          {cycle.status !== "archived" && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                requestArchive(cycle.id, cycle.title);
                                setMenuOpen(null);
                              }}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Arquivar
                            </button>
                          )}
                          {(cycle.status === "closed" || cycle.status === "archived") && (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Reabrir “${cycle.title}” como planejado? Revise as datas se o período já passou.`,
                                  )
                                ) {
                                  patchMutation.mutate({ id: cycle.id, status: "planned" });
                                }
                                setMenuOpen(null);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reabrir (planejado)
                            </button>
                          )}
                          <div className="my-1 border-t border-border" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted/50"
                            onClick={() => {
                              if (
                                confirm(
                                  "Remover este ciclo? Objetivos vinculados podem ficar sem ciclo.",
                                )
                              )
                                deleteMutation.mutate(cycle.id);
                              setMenuOpen(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <CycleExpandedObjectives
                  cycleId={cycle.id}
                  open={expandedCycleId === cycle.id}
                  objectiveCount={s.objectiveCount}
                />
              </div>
            );
          })}
        </div>
      )}

      <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

/** Lista de objetivos do ciclo (carrega só ao expandir). */
function CycleExpandedObjectives({
  cycleId,
  open,
  objectiveCount,
}: {
  cycleId: string;
  open: boolean;
  objectiveCount: number;
}) {
  const { data, isLoading, isError } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives", "by-cycle", cycleId],
    queryFn: () =>
      fetch(`/api/okr/objectives?cycleId=${encodeURIComponent(cycleId)}`).then((r) => r.json()),
    enabled: open,
    staleTime: 30_000,
  });

  if (!open) return null;

  const list = data?.data ?? [];

  return (
    <div className="border-t border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Objetivos neste ciclo
        </p>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {objectiveCount} cadastrado{objectiveCount !== 1 ? "s" : ""}
        </span>
      </div>
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/80" />
          ))}
        </div>
      )}
      {isError && (
        <p className="text-xs text-destructive">
          Não foi possível carregar os objetivos. Tente novamente.
        </p>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum objetivo vinculado a este ciclo.{" "}
          <Link href="/okr/okrs" className="font-medium text-primary hover:underline">
            Criar na lista de OKRs
          </Link>
        </p>
      )}
      {!isLoading && !isError && list.length > 0 && (
        <ul className="space-y-2">
          {list.map((obj) => (
            <li key={obj.id}>
              <Link
                href={`/okr/objectives/${obj.id}`}
                className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {obj.title}
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <OkrStatusBadge status={obj.status} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(obj.progressPercent)}% · {obj.keyResults.length} KR
                    {obj.keyResults.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  iconClass,
  children,
  empty,
  emptyLabel,
}: {
  title: string;
  icon: React.ElementType;
  iconClass?: string;
  children?: React.ReactNode;
  empty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="mt-3">
        {empty ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : children}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  muted,
  warn,
}: {
  label: string;
  value: string | number;
  muted?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className={cn("text-[10px] text-muted-foreground", muted && "opacity-90")}>{label}</p>
      <p
        className={cn(
          "font-semibold tabular-nums text-foreground",
          warn && "text-amber-700 dark:text-amber-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Badge mais explícito que o genérico para estados de ciclo. */
function CycleStatusBadge({ status }: { status: OkrCycle["status"] }) {
  const cfg: Record<OkrCycle["status"], { label: string; className: string }> = {
    planned: {
      label: "Planejado",
      className:
        "bg-slate-100 text-slate-700 ring-slate-300/40 dark:bg-slate-900/50 dark:text-slate-300",
    },
    active: {
      label: "Ativo",
      className:
        "bg-emerald-100 text-emerald-900 ring-emerald-400/50 dark:bg-emerald-950/60 dark:text-emerald-200",
    },
    closed: {
      label: "Encerrado",
      className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300",
    },
    archived: {
      label: "Arquivado",
      className: "bg-zinc-50 text-zinc-500 ring-dashed ring-zinc-300/60 dark:bg-zinc-900/40",
    },
  };
  const c = cfg[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        c.className,
      )}
    >
      {c.label}
    </span>
  );
}
