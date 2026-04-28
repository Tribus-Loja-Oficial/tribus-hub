"use client";

import { useState, useEffect, useMemo, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import {
  Target,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Search,
  SlidersHorizontal,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OkrCycle, OkrObjective, OkrKeyResult } from "@/lib/types/domain";
import { healthRowAccentClass } from "@/components/pace-health-badge";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { ProjectHealthRow } from "@/features/projects/components/project-badges";
import { OkrProgressBar } from "./okr-progress-bar";
import { CreateObjectiveDialog } from "./create-objective-dialog";
import { UpdateKeyResultDialog } from "./update-key-result-dialog";
import { formatCivilDate } from "@/lib/date/civil-date";
import { reconcileOkrHealthInsightForDisplay } from "@/features/okr/lib/okr-pace-health-local";
import { useResizableGridColumns, GridColResizeHandle } from "@/hooks/use-resizable-grid-columns";
import { EntityQuickViewEyeButton } from "@/components/entity-quick-view-dialog";
import { cn } from "@/lib/utils/cn";
import { deriveOkrWorkflowStatusInsight } from "@/features/okr/lib/okr-workflow-status";
import {
  TABLE_HEALTH_CHIP_PX,
  TABLE_HEALTH_CHIP_WIDTH_CLASS,
  TABLE_STATUS_CHIP_PX,
  TABLE_STATUS_CHIP_WIDTH_CLASS,
} from "@/lib/ui/chip-width-tokens";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

/** Mesmo padrão da hierarquia de projetos: células esticadas, bordas verticais, sem “saltos” de alinhamento. */
const OKR_OBJECTIVES_TABLE_GRID =
  "grid w-full min-w-0 items-stretch gap-x-0 overflow-hidden [&>*]:min-h-0 [&>*]:min-w-0 [&>*]:border-r [&>*]:border-border/60 [&>*]:px-2 [&>*]:py-2 [&>*:last-child]:border-r-0";

const OKR_WORKFLOW_STATUS_QUERY = new Set(["planned", "in_progress", "achieved", "not_achieved"]);

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return formatCivilDate(d, "dd MMM yy") || null;
}

function OkrTableHeaderCell({
  children,
  className,
  resizeIndex,
  startResize,
}: {
  children: ReactNode;
  className?: string;
  resizeIndex: number;
  startResize: (leftIndex: number, e: MouseEvent) => void;
}) {
  return (
    <div className={cn("relative flex min-w-0 items-center justify-center", className)}>
      {children}
      <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2">
        <GridColResizeHandle onMouseDown={(e) => startResize(resizeIndex, e)} />
      </div>
    </div>
  );
}

export function OkrObjectivesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [filterHealth, setFilterHealth] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "status" | "cycle">("none");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updateKrOpen, setUpdateKrOpen] = useState(false);
  const [selectedKr, setSelectedKr] = useState<OkrKeyResult | null>(null);

  const { widths, startResize } = useResizableGridColumns(
    "hub:okr-objectives-cols-v6",
    [24, 300, 128, 176, 176, 64, 136, 48],
    { mode: "push" },
  );
  const okrGridTpl = widths.map((w) => `${w}px`).join(" ");
  const okrTableMinWidth = useMemo(
    () => Math.max(720, widths.reduce((a, b) => a + b, 0) + 24),
    [widths],
  );

  useEffect(() => {
    const s = searchParams.get("status");
    if (s && OKR_WORKFLOW_STATUS_QUERY.has(s)) setFilterStatus(s);
  }, [searchParams]);

  const params = new URLSearchParams();
  if (filterCycle) params.set("cycleId", filterCycle);

  const { data, isLoading } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives", filterStatus, filterCycle],
    queryFn: () => fetch(`/api/okr/objectives?${params}`).then((r) => r.json()),
    placeholderData: keepPreviousData,
  });

  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okr/objectives/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover objetivo");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["okr-objectives"] });
      const previous = queryClient.getQueryData(["okr-objectives", filterStatus, filterCycle]);
      queryClient.setQueryData(
        ["okr-objectives", filterStatus, filterCycle],
        (old: { data: ObjectiveWithKRs[] } | undefined) =>
          old ? { ...old, data: old.data.filter((o) => o.id !== id) } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["okr-objectives", filterStatus, filterCycle], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const allObjectives = data?.data ?? [];
  const cycles = cyclesRes?.data ?? [];
  const cycleMap = new Map(cycles.map((c) => [c.id, c.title]));

  const filtered = allObjectives.filter((o) => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus) {
      const derived = deriveOkrWorkflowStatusInsight({
        workflowStatusInsight: o.workflowStatusInsight,
        startDate: o.startDate,
        targetDate: o.targetDate,
        progressPercent: o.progressPercent,
      });
      const slug = derived?.slug ?? o.workflowStatusInsight?.slug ?? "planned";
      if (slug !== filterStatus) return false;
    }
    if (filterHealth) {
      const health = reconcileOkrHealthInsightForDisplay(o.healthInsight, o) ?? o.healthInsight;
      if ((health?.slug ?? "") !== filterHealth) return false;
    }
    return true;
  });

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Objetivos</h1>
          {!isLoading && <span className="text-sm text-muted-foreground">({filtered.length})</span>}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo objetivo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 w-52 pl-8 text-sm"
            placeholder="Buscar objetivos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="planned">Planejado</option>
          <option value="in_progress">Em Progresso</option>
          <option value="achieved">Atingido</option>
          <option value="not_achieved">Não Atingido</option>
        </select>

        <select
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
          value={filterCycle}
          onChange={(e) => setFilterCycle(e.target.value)}
        >
          <option value="">Todos os ciclos</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
          value={filterHealth}
          onChange={(e) => setFilterHealth(e.target.value)}
        >
          <option value="">Qualquer health</option>
          <option value="not_started">Não iniciado</option>
          <option value="ahead">Adiantado</option>
          <option value="on_track">No rumo</option>
          <option value="at_risk">Em risco</option>
          <option value="off_track">Fora do rumo</option>
        </select>

        <div className="ml-auto flex items-center gap-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
          >
            <option value="none">Sem agrupamento</option>
            <option value="status">Agrupar por status</option>
            <option value="cycle">Agrupar por ciclo</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="py-20 text-center">
          <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-30" />
          <p className="mb-4 text-sm text-muted-foreground">
            {search || filterStatus || filterCycle || filterHealth
              ? "Nenhum objetivo corresponde aos filtros."
              : "Nenhum objetivo criado ainda."}
          </p>
          {!search && !filterStatus && !filterCycle && !filterHealth && (
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4" />
              Criar primeiro objetivo
            </Button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="min-w-0" style={{ minWidth: okrTableMinWidth }}>
            {/* Table header */}
            <div
              className={cn(
                OKR_OBJECTIVES_TABLE_GRID,
                "border-b border-border bg-muted/30 [&>*]:py-1.5",
              )}
              style={{ gridTemplateColumns: okrGridTpl }}
            >
              <OkrTableHeaderCell resizeIndex={0} startResize={startResize}>
                <span />
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={1}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Objetivo
                </span>
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={2}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ciclo
                </span>
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={3}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </span>
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={4}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Health
                </span>
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={5}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  KRs
                </span>
              </OkrTableHeaderCell>
              <OkrTableHeaderCell
                resizeIndex={6}
                startResize={startResize}
                className="justify-start"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Progresso
                </span>
              </OkrTableHeaderCell>
              <div className="relative flex min-w-0 items-center justify-end" />
            </div>

            <div className="divide-y divide-border">
              {filtered.map((obj) => (
                <ObjectiveRow
                  key={obj.id}
                  gridTpl={okrGridTpl}
                  objective={obj}
                  cycleName={obj.cycleId ? (cycleMap.get(obj.cycleId) ?? "—") : "—"}
                  isExpanded={expanded.has(obj.id)}
                  onToggle={() => toggleExpanded(obj.id)}
                  menuOpen={menuOpen === obj.id}
                  onMenuToggle={() => setMenuOpen(menuOpen === obj.id ? null : obj.id)}
                  onDelete={() => {
                    if (confirm("Remover este objetivo?")) deleteMutation.mutate(obj.id);
                    setMenuOpen(null);
                  }}
                  onUpdateKr={(kr) => {
                    setSelectedKr(kr);
                    setUpdateKrOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <CreateObjectiveDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UpdateKeyResultDialog
        open={updateKrOpen}
        onOpenChange={setUpdateKrOpen}
        keyResult={selectedKr}
      />
    </div>
  );
}

interface ObjectiveRowProps {
  gridTpl: string;
  objective: ObjectiveWithKRs;
  cycleName: string;
  isExpanded: boolean;
  onToggle: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
  onUpdateKr: (kr: OkrKeyResult) => void;
}

function ObjectiveRow({
  gridTpl,
  objective,
  cycleName,
  isExpanded,
  onToggle,
  menuOpen,
  onMenuToggle,
  onDelete,
  onUpdateKr,
}: ObjectiveRowProps) {
  const krCount = objective.keyResults.length;
  const completedKrs = objective.keyResults.filter((kr) => kr.status === "completed").length;
  const hasKrs = krCount > 0;
  const objectiveWorkflow = deriveOkrWorkflowStatusInsight({
    workflowStatusInsight: objective.workflowStatusInsight,
    startDate: objective.startDate,
    targetDate: objective.targetDate,
    progressPercent: objective.progressPercent,
  });

  return (
    <div>
      {/* Objective row */}
      <div
        className={cn(
          OKR_OBJECTIVES_TABLE_GRID,
          "cursor-pointer border-l-[3px] transition-colors [&>*]:py-2.5",
          healthRowAccentClass(objective.healthInsight?.slug),
          isExpanded ? "bg-muted/20" : "hover:bg-muted/20",
        )}
        style={{ gridTemplateColumns: gridTpl }}
        onClick={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest("a, button")) return;
          onToggle();
        }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasKrs) onToggle();
          }}
          className={`flex h-full min-h-[40px] items-center justify-center rounded transition-colors ${
            hasKrs
              ? "cursor-pointer text-muted-foreground hover:text-foreground"
              : "cursor-default opacity-0"
          }`}
          tabIndex={hasKrs ? 0 : -1}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>

        {/* Title: só o texto do link navega; área vazia à direita expande/recolhe */}
        <div className="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden">
          <Link
            href={`/okr/objectives/${objective.id}`}
            onClick={(e) => e.stopPropagation()}
            className="line-clamp-2 min-w-0 break-words text-left text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary"
          >
            {objective.title}
          </Link>
          {objective.externalRef && (
            <span className="font-mono text-[10px] leading-tight text-muted-foreground">
              Ref: {objective.externalRef}
            </span>
          )}
          {objective.targetDate && (
            <p className="text-xs leading-tight text-muted-foreground">
              Meta: {formatDate(objective.targetDate)}
            </p>
          )}
        </div>

        {/* Cycle */}
        <span className="flex min-w-0 items-center justify-start text-xs text-muted-foreground">
          <span className="line-clamp-2 min-w-0 break-words">{cycleName}</span>
        </span>

        {/* Status (workflow) */}
        <div className="flex w-full min-w-0 items-center justify-start overflow-hidden pr-0.5">
          <WorkflowStatusRow
            className="min-w-0"
            insight={objectiveWorkflow}
            tableCellLayout
            badgeWidthClass={TABLE_STATUS_CHIP_WIDTH_CLASS}
            tableChipWidthPx={TABLE_STATUS_CHIP_PX}
          />
        </div>
        {/* Health */}
        <div className="flex w-full min-w-0 items-center justify-start overflow-hidden pr-0.5">
          <ProjectHealthRow
            insight={
              reconcileOkrHealthInsightForDisplay(objective.healthInsight, {
                startDate: objective.startDate,
                targetDate: objective.targetDate,
              }) ?? undefined
            }
            tableCellLayout
            badgeWidthClass={TABLE_HEALTH_CHIP_WIDTH_CLASS}
            tableChipWidthPx={TABLE_HEALTH_CHIP_PX}
          />
        </div>

        {/* KRs count */}
        <span
          className={`flex min-w-0 items-center justify-start text-sm tabular-nums ${hasKrs ? "text-muted-foreground" : "text-muted-foreground/40"}`}
        >
          {completedKrs}/{krCount}
        </span>

        {/* Progress */}
        <div className="flex min-w-0 items-center justify-start gap-2 overflow-hidden">
          <OkrProgressBar
            percent={objective.progressPercent}
            status={objective.status}
            healthSlug={objective.healthInsight?.slug}
            size="xs"
            className="min-w-0 flex-1"
          />
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(objective.progressPercent)}%
          </span>
        </div>

        {/* Menu */}
        <div className="relative flex justify-end gap-0.5">
          <EntityQuickViewEyeButton entity={{ kind: "objective", id: objective.id }} />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMenuToggle}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-popover py-1 shadow-md">
              <Link
                href={`/okr/objectives/${objective.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Abrir detalhes
              </Link>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted/50"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KR rows (expanded) */}
      {isExpanded && hasKrs && (
        <div className="border-t border-border/60 bg-muted/10">
          {objective.keyResults.map((kr) => (
            <KrSubRow key={kr.id} gridTpl={gridTpl} kr={kr} onUpdate={() => onUpdateKr(kr)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KrSubRow({
  gridTpl,
  kr,
  onUpdate,
}: {
  gridTpl: string;
  kr: OkrKeyResult;
  onUpdate: () => void;
}) {
  const isBoolean = kr.metricType === "boolean";
  const krWorkflow = deriveOkrWorkflowStatusInsight({
    workflowStatusInsight: kr.workflowStatusInsight,
    startDate: kr.startDate,
    targetDate: kr.targetDate,
    progressPercent: kr.progressPercent,
  });

  return (
    <div
      className={cn(
        OKR_OBJECTIVES_TABLE_GRID,
        "border-b border-l-[3px] border-border/40 transition-colors last:border-b-0 hover:bg-muted/20 [&>*]:py-2",
        healthRowAccentClass(kr.healthInsight?.slug),
      )}
      style={{ gridTemplateColumns: gridTpl }}
    >
      <div className="flex items-center justify-center border-l-2 border-border/40 pl-0.5">
        <div className="h-5 w-px shrink-0 bg-border/60" aria-hidden />
      </div>

      {/* Title — mesma coluna “Objetivo” que o pai */}
      <div className="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden border-l border-border/50 pl-2">
        <Link
          href={`/okr/key-results/${kr.id}`}
          className="line-clamp-2 min-w-0 break-words text-sm leading-snug text-foreground/80 transition-colors hover:text-primary"
        >
          <TrendingUp className="mr-1.5 inline h-3 w-3 shrink-0 text-muted-foreground/60" />
          {kr.title}
        </Link>
        {kr.externalRef && (
          <p className="font-mono text-[10px] leading-tight text-muted-foreground">
            Ref: {kr.externalRef}
          </p>
        )}
        {!isBoolean && (
          <p className="text-xs tabular-nums leading-tight text-muted-foreground/70">
            {kr.currentValue} / {kr.targetValue}
            {kr.unit ? ` ${kr.unit}` : ""}
          </p>
        )}
      </div>

      <span className="flex items-center justify-start" aria-hidden />

      <div className="flex w-full min-w-0 items-center justify-start overflow-hidden pr-0.5">
        <WorkflowStatusRow
          className="min-w-0"
          insight={krWorkflow}
          tableCellLayout
          badgeWidthClass={TABLE_STATUS_CHIP_WIDTH_CLASS}
          tableChipWidthPx={TABLE_STATUS_CHIP_PX}
        />
      </div>
      <div className="flex w-full min-w-0 items-center justify-start overflow-hidden pr-0.5">
        <ProjectHealthRow
          insight={
            reconcileOkrHealthInsightForDisplay(kr.healthInsight, {
              startDate: kr.startDate,
              targetDate: kr.targetDate,
            }) ?? undefined
          }
          tableCellLayout
          badgeWidthClass={TABLE_HEALTH_CHIP_WIDTH_CLASS}
          tableChipWidthPx={TABLE_HEALTH_CHIP_PX}
        />
      </div>

      <span className="flex items-center justify-start" aria-hidden />

      <div className="flex min-w-0 items-center justify-start gap-2 overflow-hidden">
        <OkrProgressBar
          percent={kr.progressPercent}
          status={kr.status}
          healthSlug={kr.healthInsight?.slug}
          size="xs"
          className="min-w-0 flex-1"
        />
        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round(kr.progressPercent)}%
        </span>
      </div>

      {/* Update button */}
      <div className="flex justify-end gap-1">
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
      </div>
    </div>
  );
}
