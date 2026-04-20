"use client";

import { useState } from "react";
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
import type { OkrCycle, OkrObjective, OkrKeyResult } from "@/lib/db/schema";
import { OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar } from "./okr-progress-bar";
import { CreateObjectiveDialog } from "./create-objective-dialog";
import { UpdateKeyResultDialog } from "./update-key-result-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), "dd MMM yy", { locale: ptBR });
}

export function OkrObjectivesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "status" | "cycle">("none");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updateKrOpen, setUpdateKrOpen] = useState(false);
  const [selectedKr, setSelectedKr] = useState<OkrKeyResult | null>(null);

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
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

  const filtered = allObjectives.filter((o) =>
    search ? o.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Objetivos</h1>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">({filtered.length})</span>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo objetivo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-52 text-sm"
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
          <option value="draft">Rascunho</option>
          <option value="on_track">No rumo</option>
          <option value="at_risk">Em risco</option>
          <option value="off_track">Fora do rumo</option>
          <option value="completed">Concluído</option>
        </select>

        <select
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
          value={filterCycle}
          onChange={(e) => setFilterCycle(e.target.value)}
        >
          <option value="">Todos os ciclos</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-auto">
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
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-4">
            {search || filterStatus || filterCycle
              ? "Nenhum objetivo corresponde aos filtros."
              : "Nenhum objetivo criado ainda."}
          </p>
          {!search && !filterStatus && !filterCycle && (
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4" />
              Criar primeiro objetivo
            </Button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[20px_1fr_100px_90px_80px_140px_36px] gap-3 px-5 py-2.5 border-b border-border bg-muted/30">
            <span />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivo</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ciclo</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRs</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Progresso</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {filtered.map((obj) => (
              <ObjectiveRow
                key={obj.id}
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

  return (
    <div>
      {/* Objective row */}
      <div
        className={`grid grid-cols-[20px_1fr_100px_90px_80px_140px_36px] gap-3 px-5 py-3.5 items-center transition-colors cursor-pointer ${
          isExpanded ? "bg-muted/20" : "hover:bg-muted/20"
        }`}
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
          className={`flex items-center justify-center transition-colors rounded ${
            hasKrs ? "text-muted-foreground hover:text-foreground cursor-pointer" : "cursor-default opacity-0"
          }`}
          tabIndex={hasKrs ? 0 : -1}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>

        {/* Title: só o texto do link navega; área vazia à direita expande/recolhe */}
        <div className="min-w-0 flex flex-col items-start gap-0.5">
          <Link
            href={`/okr/objectives/${objective.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate text-left inline-block max-w-full align-top"
          >
            {objective.title}
          </Link>
          {objective.targetDate && (
            <p className="text-xs text-muted-foreground mt-0.5 w-full">
              Meta: {formatDate(objective.targetDate)}
            </p>
          )}
        </div>

        {/* Cycle */}
        <span className="text-xs text-muted-foreground truncate">{cycleName}</span>

        {/* Status */}
        <OkrStatusBadge status={objective.status} />

        {/* KRs count */}
        <span className={`text-sm tabular-nums ${hasKrs ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
          {completedKrs}/{krCount}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <OkrProgressBar
            percent={objective.progressPercent}
            status={objective.status}
            size="xs"
            className="flex-1"
          />
          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right shrink-0">
            {Math.round(objective.progressPercent)}%
          </span>
        </div>

        {/* Menu */}
        <div className="relative flex justify-end">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMenuToggle}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-popover shadow-md py-1">
              <Link
                href={`/okr/objectives/${objective.id}`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Abrir detalhes
              </Link>
              <button
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 w-full text-left text-destructive"
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
            <KrSubRow key={kr.id} kr={kr} onUpdate={() => onUpdateKr(kr)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KrSubRow({ kr, onUpdate }: { kr: OkrKeyResult; onUpdate: () => void }) {
  const isBoolean = kr.metricType === "boolean";

  return (
    <div className="grid grid-cols-[20px_1fr_100px_90px_80px_140px_36px] gap-3 pl-5 pr-5 py-2.5 items-center border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* indent indicator */}
      <div className="flex items-center justify-center">
        <div className="h-3 w-px bg-border ml-1" />
      </div>

      {/* Title */}
      <div className="min-w-0 pl-2 border-l border-border/50">
        <Link
          href={`/okr/key-results/${kr.id}`}
          className="text-sm text-foreground/80 hover:text-primary transition-colors truncate block"
        >
          <TrendingUp className="h-3 w-3 inline mr-1.5 text-muted-foreground/60" />
          {kr.title}
        </Link>
        {!isBoolean && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
            {kr.currentValue} / {kr.targetValue}
            {kr.unit ? ` ${kr.unit}` : ""}
          </p>
        )}
      </div>

      {/* empty cycle col */}
      <span />

      {/* Status */}
      <OkrStatusBadge status={kr.status} />

      {/* empty KRs col */}
      <span />

      {/* Progress */}
      <div className="flex items-center gap-2">
        <OkrProgressBar
          percent={kr.progressPercent}
          status={kr.status}
          size="xs"
          className="flex-1"
        />
        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right shrink-0">
          {Math.round(kr.progressPercent)}%
        </span>
      </div>

      {/* Update button */}
      <div className="flex justify-end">
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
