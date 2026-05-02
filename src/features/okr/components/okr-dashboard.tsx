"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Target,
  Plus,
  TrendingUp,
  CalendarRange,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ChevronRight,
  Gauge,
  User,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nativeSelectSmClassName } from "@/components/ui/form-control-classes";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OkrCycle, OkrKeyResult } from "@/lib/types/domain";
import type {
  ObjectiveWithKRsForDashboard,
  DashboardData,
  DashboardAttentionItem,
  RecentKrUpdateWithContext,
} from "@/lib/services/okr.service";
import { OkrEntityStatusRow, OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar, MiniProgressRing } from "./okr-progress-bar";
import { CreateCycleDialog } from "./create-cycle-dialog";
import { CreateObjectiveDialog } from "./create-objective-dialog";
import { CreateKeyResultDialog } from "./create-key-result-dialog";
import {
  differenceInCalendarDays,
  differenceInDays,
  isAfter,
  isBefore,
  formatDistanceToNow,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCivilDate, parseCivilDateInput, startOfLocalDay } from "@/lib/date/civil-date";
import { cn } from "@/lib/utils/cn";
import { reconcileOkrHealthInsightForDisplay } from "@/features/okr/lib/okr-pace-health-local";

/** Filtro padrão: mesmo escopo que o backend sem query — ciclo com status em andamento. */
const DASHBOARD_FILTER_ACTIVE = "__dashboard_active_cycle__";
/** Workspace inteiro (todos os ciclos). */
const DASHBOARD_FILTER_ALL = "__dashboard_all_cycles__";

function calcCycleTimeProgress(cycle: OkrCycle): number {
  const now = new Date();
  const start = parseCivilDateInput(cycle.startDate);
  const end = parseCivilDateInput(cycle.endDate);
  if (!start || !end) return 0;
  if (isBefore(now, start)) return 0;
  if (isAfter(now, end)) return 100;
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  if (total === 0) return 100;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return formatCivilDate(d, "dd MMM yyyy") || "—";
}

function formatShortDate(d: string | null | undefined) {
  if (!d) return "—";
  return formatCivilDate(d, "dd MMM") || "—";
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  iconClassName?: string;
  href?: string;
}

function StatCard({ label, value, sub, icon: Icon, iconClassName, href }: StatCardProps) {
  const inner = (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName ?? "bg-muted"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

interface OkrDashboardProps {
  initialCycleId?: string;
}

export function OkrDashboard({ initialCycleId }: OkrDashboardProps) {
  const [cycleFilter, setCycleFilter] = useState<string>(initialCycleId ?? DASHBOARD_FILTER_ACTIVE);
  const [createCycleOpen, setCreateCycleOpen] = useState(false);
  const [createObjectiveOpen, setCreateObjectiveOpen] = useState(false);
  const [createKrOpen, setCreateKrOpen] = useState(false);

  const queryParams = useMemo(() => {
    if (cycleFilter === DASHBOARD_FILTER_ALL) return "?allCycles=1";
    if (cycleFilter === DASHBOARD_FILTER_ACTIVE) return "";
    return `?cycleId=${encodeURIComponent(cycleFilter)}`;
  }, [cycleFilter]);

  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ["okr-dashboard", cycleFilter],
    queryFn: () => fetch(`/api/okr/dashboard${queryParams}`).then((r) => r.json()),
  });

  const dashboard = data?.data;
  const activeCycle = dashboard?.activeCycle;
  const stats = dashboard?.stats;
  const allCycles = dashboard?.allCycles ?? [];
  const objectives = dashboard?.objectives ?? [];
  const attentionItems = dashboard?.attentionItems ?? [];
  const recentUpdates = dashboard?.recentUpdates ?? [];
  const cyclePace = dashboard?.cyclePace ?? null;

  const scopeIsAllCycles = cycleFilter === DASHBOARD_FILTER_ALL;
  const scopeIsActiveDefault = cycleFilter === DASHBOARD_FILTER_ACTIVE;

  const headerScopeBadge = useMemo(() => {
    if (scopeIsAllCycles) return "Todos os ciclos";
    if (scopeIsActiveDefault) return activeCycle?.title ?? null;
    return allCycles.find((c) => c.id === cycleFilter)?.title ?? null;
  }, [scopeIsAllCycles, scopeIsActiveDefault, activeCycle?.title, allCycles, cycleFilter]);

  const headerScopeDescription = scopeIsAllCycles
    ? "Métricas de todos os objetivos e key results do workspace, em todos os ciclos."
    : scopeIsActiveDefault
      ? "Métricas do ciclo em andamento."
      : "Métricas e riscos filtrados para o ciclo selecionado.";

  const defaultCycleIdForCreates = scopeIsAllCycles
    ? undefined
    : scopeIsActiveDefault
      ? activeCycle?.id
      : cycleFilter;

  const cycleTimeProgress = activeCycle ? calcCycleTimeProgress(activeCycle) : null;
  const daysLeft = activeCycle
    ? (() => {
        const end = parseCivilDateInput(activeCycle.endDate);
        return end != null
          ? Math.max(0, differenceInDays(startOfLocalDay(end), startOfLocalDay(new Date())))
          : null;
      })()
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">OKR Manager</h1>
              {headerScopeBadge && (
                <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                  {headerScopeBadge}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{headerScopeDescription}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allCycles.length > 0 && (
            <select
              className={cn(nativeSelectSmClassName, "h-9 min-w-[12rem]")}
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              aria-label="Filtrar por ciclo"
            >
              <option value={DASHBOARD_FILTER_ACTIVE}>
                {activeCycle ? `Ciclo em andamento (${activeCycle.title})` : "Ciclo em andamento"}
              </option>
              <option value={DASHBOARD_FILTER_ALL}>Todos os ciclos</option>
              {allCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.status === "active" ? " (em andamento)" : ""}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => setCreateCycleOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Ciclo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateObjectiveOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Objetivo
          </Button>
          <Button size="sm" onClick={() => setCreateKrOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Key Result
          </Button>
        </div>
      </div>

      <PageGuide title="O que é o Dashboard OKR?">
        <p>
          Visão executiva do health estratégico do workspace. Mostra indicadores consolidados de
          todos os objetivos e key results.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "cartões de métricas resumem o total de objetivos, KRs e progresso geral;",
              "o painel de atenção destaca OKRs em risco ou atrasados;",
              "o gráfico de progresso mostra a evolução ao longo do ciclo;",
              'o filtro no canto superior direito começa no ciclo em andamento; escolha "Todos os ciclos" para ver o workspace inteiro.',
            ]}
          />
        </GuideSection>
      </PageGuide>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {!isLoading && (
        <>
          {activeCycle && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <CalendarRange className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{activeCycle.title}</span>
                      <OkrStatusBadge status={activeCycle.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activeCycle.startDate)} → {formatDate(activeCycle.endDate)}
                      {daysLeft !== null && daysLeft > 0 && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="font-medium text-foreground">
                            {daysLeft} dias restantes
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-muted-foreground">
                        Tempo decorrido do ciclo
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {cycleTimeProgress}%
                      </span>
                    </div>
                    <OkrProgressBar percent={cycleTimeProgress ?? 0} size="sm" />
                  </div>
                  <Link href={`/okr/cycles/${activeCycle.id}`}>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Objetivos"
                  value={stats.totalObjectives}
                  sub={`${stats.onTrackObjectives} no rumo · ${stats.atRiskObjectives} em risco · ${stats.offTrackObjectives} fora`}
                  icon={Target}
                  iconClassName="bg-primary/10 text-primary"
                  href="/okr/okrs"
                />
                <StatCard
                  label="Key Results"
                  value={stats.totalKeyResults}
                  sub={`${stats.completedKrs} de ${stats.totalKeyResults} KRs concluídos`}
                  icon={TrendingUp}
                  iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  href="/okr/okrs?expand=all"
                />
                <StatCard
                  label="Progresso médio (KRs)"
                  value={`${stats.avgKrProgress}%`}
                  sub={
                    scopeIsAllCycles
                      ? "Média de todos os KRs no workspace (todos os ciclos)"
                      : "Média de progresso dos KRs no escopo do filtro"
                  }
                  icon={Activity}
                  iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                />
                <StatCard
                  label="Concluídos"
                  value={`${stats.completedObjectives} / ${stats.totalObjectives}`}
                  sub={`Objetivos · ${stats.completedKrs}/${stats.totalKeyResults} KRs`}
                  icon={CheckCircle2}
                  iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                />
              </div>

              <div className="rounded-xl border border-border bg-gradient-to-b from-muted/40 to-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    Health dos objetivos
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scopeIsAllCycles
                      ? "(health por ritmo · todos os ciclos no escopo; concluídos à parte)"
                      : "(health por ritmo no escopo do filtro; concluídos à parte)"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <HealthPill label="No rumo" value={stats.onTrackObjectives} tone="emerald" />
                  <HealthPill label="Em risco" value={stats.atRiskObjectives} tone="amber" />
                  <HealthPill label="Fora do rumo" value={stats.offTrackObjectives} tone="rose" />
                  <HealthPill label="Planejado" value={stats.draftObjectives} tone="slate" />
                  <HealthPill label="Concluídos" value={stats.completedObjectives} tone="sky" />
                </div>
                <p className="mt-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  KRs: {stats.onTrackKrs} no rumo · {stats.atRiskKrs} em risco · {stats.offTrackKrs}{" "}
                  fora · {stats.draftKrs} planejados / sem ritmo / antes do início
                </p>
              </div>

              {cyclePace && activeCycle && (
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Ritmo do ciclo</p>
                        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                          Compara o tempo já consumido no ciclo com o progresso médio dos key
                          results. Se o progresso está muito abaixo do tempo decorrido, o ciclo
                          tende a atraso.
                        </p>
                      </div>
                    </div>
                    <CyclePaceBadge verdict={cyclePace.verdict} diff={cyclePace.diff} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Tempo do ciclo</span>
                        <span className="font-medium tabular-nums">
                          {cyclePace.elapsedPercent}%
                        </span>
                      </div>
                      <OkrProgressBar percent={cyclePace.elapsedPercent} size="sm" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso médio dos KRs</span>
                        <span className="font-medium tabular-nums">{cyclePace.avgKrProgress}%</span>
                      </div>
                      <OkrProgressBar percent={Math.min(100, cyclePace.avgKrProgress)} size="sm" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-sm font-medium leading-tight text-foreground">
                      Objetivos e KRs em atenção
                    </span>
                  </div>
                  <p className="pl-6 text-[11px] leading-snug text-muted-foreground">
                    Fora do rumo ou em risco no escopo atual
                  </p>
                </div>
                <Link
                  href="/okr/okrs"
                  className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {attentionItems.length === 0 ? (
                  <div className="space-y-2 px-5 py-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/80" />
                    <p className="text-sm font-medium text-foreground">
                      Nenhum item crítico no escopo atual
                    </p>
                    <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Não encontramos objetivos fora do rumo, KRs estagnados ou prazos iminentes com
                      progresso baixo. Quando algo precisar de ação, aparecerá aqui com prioridade.
                    </p>
                  </div>
                ) : (
                  attentionItems.map((item) => (
                    <AttentionRow key={`${item.kind}-${item.id}`} item={item} />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Atualizações recentes</span>
              </div>
              <div className="max-h-[min(420px,50vh)] divide-y divide-border overflow-y-auto">
                {recentUpdates.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atualização de progresso ainda.
                    </p>
                  </div>
                ) : (
                  recentUpdates.map((upd) => <UpdateRow key={upd.id} update={upd} />)
                )}
              </div>
            </div>
          </div>

          {objectives.length > 0 && <KrPerformanceSection objectives={objectives} />}

          {objectives.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-gradient-to-b from-muted/45 to-muted/10 px-5 py-3">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {scopeIsAllCycles ? "Objetivos no escopo" : "Objetivos do ciclo"}
                  </span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {scopeIsAllCycles
                      ? "Todos os ciclos · resumo com dono, prazo e progresso"
                      : "Resumo rápido com dono, prazo e progresso"}
                  </p>
                </div>
                <Link
                  href="/okr/okrs"
                  className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {objectives.slice(0, 8).map((obj) => (
                  <ObjectiveRow key={obj.id} objective={obj} />
                ))}
              </div>
            </div>
          )}

          {!stats?.totalObjectives && !allCycles.length && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Target className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="mb-1 text-base font-semibold text-foreground">Comece pelos ciclos</h2>
              <p className="mx-auto mb-6 max-w-xs text-sm text-muted-foreground">
                Crie um ciclo (ex.: 1Q2025), adicione objetivos e defina key results para
                acompanhar.
              </p>
              <Button onClick={() => setCreateCycleOpen(true)}>
                <Plus className="h-4 w-4" />
                Criar primeiro ciclo
              </Button>
            </div>
          )}
        </>
      )}

      <CreateCycleDialog open={createCycleOpen} onOpenChange={setCreateCycleOpen} />
      <CreateObjectiveDialog
        open={createObjectiveOpen}
        onOpenChange={setCreateObjectiveOpen}
        defaultCycleId={defaultCycleIdForCreates}
      />
      <CreateKeyResultDialog
        open={createKrOpen}
        onOpenChange={setCreateKrOpen}
        defaultCycleId={defaultCycleIdForCreates}
      />
    </div>
  );
}

function HealthPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "slate" | "sky";
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-900 dark:text-rose-100",
    slate: "border-border bg-muted/50 text-foreground",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CyclePaceBadge({
  verdict,
  diff,
}: {
  verdict: "ahead" | "aligned" | "behind";
  diff: number;
}) {
  const copy = {
    ahead: {
      label: "Adiantado",
      className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
    },
    aligned: { label: "Alinhado ao tempo", className: "bg-muted text-foreground" },
    behind: {
      label: "Atrasado",
      className: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
    },
  }[verdict];
  return (
    <div className={cn("shrink-0 rounded-lg px-3 py-2 text-xs font-semibold", copy.className)}>
      {copy.label}
      <span className="mt-0.5 block font-normal tabular-nums opacity-90">
        Δ progresso − tempo: {diff > 0 ? "+" : ""}
        {diff} pp
      </span>
    </div>
  );
}

function AttentionRow({ item }: { item: DashboardAttentionItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
    >
      {item.kind === "objective" ? (
        <MiniProgressRing percent={item.progressPercent} size={32} status={item.status} />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-[11px] font-medium",
              item.severity === "high"
                ? "text-amber-700 dark:text-amber-300"
                : "text-muted-foreground",
            )}
          >
            {item.reason}
          </span>
          {item.objectiveTitle && item.kind === "key_result" && (
            <span className="truncate text-[11px] text-muted-foreground">
              · {item.objectiveTitle}
            </span>
          )}
        </div>
      </div>
      <OkrStatusBadge status={item.status} />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function UpdateRow({ update }: { update: RecentKrUpdateWithContext }) {
  const delta = update.newValue - update.previousValue;
  const sign = delta >= 0 ? "+" : "";
  const rel = formatDistanceToNow(new Date(update.createdAt), { locale: ptBR, addSuffix: true });
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Activity className="h-3 w-3 text-primary" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium leading-snug text-foreground">
          <Link
            href={`/okr/key-results/${update.keyResultId}`}
            className="hover:text-primary hover:underline"
          >
            {update.keyResultTitle}
          </Link>
          <span className="font-normal text-muted-foreground"> · </span>
          <Link
            href={`/okr/objectives/${update.objectiveId}`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {update.objectiveTitle}
          </Link>
        </p>
        {update.comment && (
          <p className="line-clamp-2 text-xs text-foreground/90">{update.comment}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs tabular-nums text-muted-foreground">
            {update.previousValue} → {update.newValue}
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            ({sign}
            {delta})
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {rel}
          {update.updatedByName && <> · {update.updatedByName}</>}
        </p>
      </div>
    </div>
  );
}

/** Dias de calendário locais sem alteração ao registo do KR (> STALE_DAYS = copy "mais de 14 dias"). */
const STALE_DAYS = 14;

function KrPerformanceSection({ objectives }: { objectives: ObjectiveWithKRsForDashboard[] }) {
  const { atRisk, topProgress, recent, stale } = useMemo(() => {
    const flat: { kr: OkrKeyResult; objectiveTitle: string }[] = [];
    for (const o of objectives) {
      for (const kr of o.keyResults) {
        flat.push({ kr, objectiveTitle: o.title });
      }
    }
    const now = new Date();
    /** Mesmo ritmo que badges/listas (`reconcileOkrHealthInsightForDisplay`); o slug cru da API pode divergir por UTC vs calendário local. */
    const krIsPaceRisk = (kr: OkrKeyResult) => {
      if (kr.status === "completed") return false;
      const reconciled = reconcileOkrHealthInsightForDisplay(kr.healthInsight, {
        startDate: kr.startDate,
        targetDate: kr.targetDate,
        now,
      });
      const slug = reconciled?.slug ?? kr.healthInsight?.slug;
      if (slug === "at_risk" || slug === "off_track") return true;
      return kr.status === "at_risk" || kr.status === "off_track";
    };
    const atRisk = flat.filter(({ kr }) => krIsPaceRisk(kr));
    const topProgress = [...flat]
      .filter(({ kr }) => kr.status !== "completed")
      .sort((a, b) => b.kr.progressPercent - a.kr.progressPercent)
      .slice(0, 5);
    const recent = [...flat]
      .sort((a, b) => new Date(b.kr.updatedAt).getTime() - new Date(a.kr.updatedAt).getTime())
      .slice(0, 5);
    const stale = flat.filter(({ kr }) => {
      if (kr.status === "completed") return false;
      const lastTouch = startOfLocalDay(new Date(kr.updatedAt));
      const today = startOfLocalDay(now);
      return differenceInCalendarDays(today, lastTouch) > STALE_DAYS;
    });
    return { atRisk, topProgress, recent, stale };
  }, [objectives]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Performance dos key results</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Segmentos rápidos para acompanhar risco, destaques e frescor das atualizações.
          <span className="mt-1 block text-[11px] text-muted-foreground/90">
            “Sem update” usa a última alteração ao KR (progresso ou edição na ficha), há mais de{" "}
            {STALE_DAYS} dias corridos no calendário local.
          </span>
        </p>
      </div>
      <Tabs defaultValue="risk" className="w-full">
        <div className="overflow-x-auto px-5 pt-2">
          <TabsList className="h-auto w-full flex-wrap gap-1 py-1 sm:w-auto">
            <TabsTrigger value="risk" className="text-xs">
              Em risco ({atRisk.length})
            </TabsTrigger>
            <TabsTrigger value="top" className="text-xs">
              Maior progresso
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">
              Atualizados recentemente
            </TabsTrigger>
            <TabsTrigger
              value="stale"
              className="text-xs"
              title={`KRs não concluídos sem alteração ao registo há mais de ${STALE_DAYS} dias (calendário local).`}
            >
              Sem update ({stale.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="risk" className="mt-0 px-0 pb-0">
          <KrPerfList rows={atRisk} empty="Nenhum KR em risco ou fora do rumo no escopo." />
        </TabsContent>
        <TabsContent value="top" className="mt-0 px-0 pb-0">
          <KrPerfList rows={topProgress} empty="Sem KRs para ranquear." />
        </TabsContent>
        <TabsContent value="recent" className="mt-0 px-0 pb-0">
          <KrPerfList rows={recent} empty="Sem atualizações registradas." showUpdated />
        </TabsContent>
        <TabsContent value="stale" className="mt-0 px-0 pb-0">
          <KrPerfList
            rows={stale}
            empty="Nenhum KR não concluído com mais de 14 dias sem alteração ao registo."
            showUpdated
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KrPerfList({
  rows,
  empty,
  showUpdated,
}: {
  rows: { kr: OkrKeyResult; objectiveTitle: string }[];
  empty: string;
  showUpdated?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="divide-y divide-border">
      {rows.map(({ kr, objectiveTitle }) => (
        <Link
          key={kr.id}
          href={`/okr/key-results/${kr.id}`}
          className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{kr.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{objectiveTitle}</p>
          </div>
          {showUpdated && (
            <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
              {formatDistanceToNow(new Date(kr.updatedAt), { locale: ptBR, addSuffix: true })}
            </span>
          )}
          <OkrEntityStatusRow
            status={kr.status}
            workflowStatusInsight={kr.workflowStatusInsight}
            healthInsight={kr.healthInsight}
            startDate={kr.startDate}
            targetDate={kr.targetDate}
            progressPercent={kr.progressPercent}
          />
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(kr.progressPercent)}%
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function ObjectiveRow({ objective }: { objective: ObjectiveWithKRsForDashboard }) {
  const krCount = objective.keyResults.length;
  const completedKrs = objective.keyResults.filter((k) => k.status === "completed").length;

  return (
    <Link
      href={`/okr/objectives/${objective.id}`}
      className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <MiniProgressRing percent={objective.progressPercent} size={36} status={objective.status} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{objective.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <OkrEntityStatusRow
              status={objective.status}
              workflowStatusInsight={objective.workflowStatusInsight}
              healthInsight={objective.healthInsight}
              startDate={objective.startDate}
              targetDate={objective.targetDate}
              progressPercent={objective.progressPercent}
            />
            <span className="text-xs text-muted-foreground">
              {completedKrs}/{krCount} KRs concluídos
            </span>
            {objective.ownerDisplayName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                {objective.ownerDisplayName}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Meta {formatShortDate(objective.targetDate)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
        <div className="flex w-full items-center gap-2 sm:w-36">
          <OkrProgressBar
            percent={objective.progressPercent}
            status={objective.status}
            size="xs"
            className="flex-1"
          />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(objective.progressPercent)}%
          </span>
        </div>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      </div>
    </Link>
  );
}
