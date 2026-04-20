"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import {
  TrendingUp,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OkrCycle, OkrKeyResult, OkrObjective } from "@/lib/db/schema";
import { OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar } from "./okr-progress-bar";
import { CreateKeyResultDialog } from "./create-key-result-dialog";
import { UpdateKeyResultDialog } from "./update-key-result-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

const METRIC_LABELS: Record<string, string> = {
  percentage: "Percentual",
  number: "Número",
  currency: "Moeda",
  boolean: "Sim/Não",
  custom: "Personalizado",
};

export function OkrKeyResultsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedKr, setSelectedKr] = useState<OkrKeyResult | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [groupByObjective, setGroupByObjective] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const params = new URLSearchParams();
  if (filterStatus) params.set("status", filterStatus);
  if (filterCycle) params.set("cycleId", filterCycle);

  const { data, isLoading } = useQuery<{ data: OkrKeyResult[] }>({
    queryKey: ["okr-key-results", filterStatus, filterCycle],
    queryFn: () => fetch(`/api/okr/key-results?${params}`).then((r) => r.json()),
    placeholderData: keepPreviousData,
  });

  const { data: objectivesRes } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives"],
    queryFn: () => fetch("/api/okr/objectives").then((r) => r.json()),
  });

  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okr/key-results/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover KR");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["okr-key-results"] });
      const previous = queryClient.getQueryData(["okr-key-results", filterStatus, filterCycle]);
      queryClient.setQueryData(
        ["okr-key-results", filterStatus, filterCycle],
        (old: { data: OkrKeyResult[] } | undefined) =>
          old ? { ...old, data: old.data.filter((kr) => kr.id !== id) } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(["okr-key-results", filterStatus, filterCycle], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  const allKrs = data?.data ?? [];
  const objectives = objectivesRes?.data ?? [];
  const cycles = cyclesRes?.data ?? [];

  const filtered = allKrs.filter((kr) =>
    search ? kr.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const objectiveMap = new Map(objectives.map((o) => [o.id, o]));

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Group by objective
  const grouped = new Map<string, OkrKeyResult[]>();
  for (const kr of filtered) {
    const list = grouped.get(kr.objectiveId) ?? [];
    list.push(kr);
    grouped.set(kr.objectiveId, list);
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Key Results</h1>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">({filtered.length})</span>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo KR
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-52 text-sm"
            placeholder="Buscar key results…"
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

        <Button
          size="sm"
          variant={groupByObjective ? "secondary" : "ghost"}
          className="h-8 text-xs ml-auto"
          onClick={() => setGroupByObjective((p) => !p)}
        >
          Agrupar por objetivo
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-4">
            {search || filterStatus || filterCycle
              ? "Nenhum key result corresponde aos filtros."
              : "Nenhum key result criado ainda."}
          </p>
          {!search && !filterStatus && !filterCycle && (
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Plus className="h-4 w-4" />
              Criar primeiro key result
            </Button>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        groupByObjective ? (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([objectiveId, krs]) => {
              const objective = objectiveMap.get(objectiveId);
              const isOpen = expanded.has(objectiveId) || grouped.size === 1;
              const avgProgress = krs.length
                ? krs.reduce((s, kr) => s + kr.progressPercent, 0) / krs.length
                : 0;

              return (
                <div key={objectiveId} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Objective header */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleExpanded(objectiveId)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {objective?.title ?? "Objetivo desconhecido"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {krs.length} key result{krs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="w-36 flex items-center gap-2 shrink-0">
                      <OkrProgressBar
                        percent={avgProgress}
                        status={objective?.status}
                        size="xs"
                        className="flex-1"
                      />
                      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                        {Math.round(avgProgress)}%
                      </span>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* KRs */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {krs.map((kr) => (
                        <KrRow
                          key={kr.id}
                          kr={kr}
                          menuOpen={menuOpen === kr.id}
                          onMenuToggle={() => setMenuOpen(menuOpen === kr.id ? null : kr.id)}
                          onDelete={() => {
                            if (confirm("Remover este key result?")) deleteMutation.mutate(kr.id);
                            setMenuOpen(null);
                          }}
                          onUpdate={() => {
                            setSelectedKr(kr);
                            setUpdateOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border">
              {filtered.map((kr) => (
                <KrRow
                  key={kr.id}
                  kr={kr}
                  showObjective
                  objectiveName={objectiveMap.get(kr.objectiveId)?.title}
                  menuOpen={menuOpen === kr.id}
                  onMenuToggle={() => setMenuOpen(menuOpen === kr.id ? null : kr.id)}
                  onDelete={() => {
                    if (confirm("Remover este key result?")) deleteMutation.mutate(kr.id);
                    setMenuOpen(null);
                  }}
                  onUpdate={() => {
                    setSelectedKr(kr);
                    setUpdateOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )
      )}

      <CreateKeyResultDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UpdateKeyResultDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        keyResult={selectedKr}
      />
    </div>
  );
}

interface KrRowProps {
  kr: OkrKeyResult;
  showObjective?: boolean;
  objectiveName?: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

function KrRow({ kr, showObjective, objectiveName, menuOpen, onMenuToggle, onDelete, onUpdate }: KrRowProps) {
  const metricLabel = METRIC_LABELS[kr.metricType] ?? kr.metricType;
  const isBoolean = kr.metricType === "boolean";

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/okr/key-results/${kr.id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
        >
          {kr.title}
        </Link>
        {showObjective && objectiveName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{objectiveName}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground">{metricLabel}</span>
          {kr.unit && <span className="text-[11px] text-muted-foreground">· {kr.unit}</span>}
        </div>
      </div>

      {/* Values */}
      {!isBoolean ? (
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums text-foreground">{kr.currentValue}</p>
          <p className="text-xs text-muted-foreground tabular-nums">de {kr.targetValue}</p>
        </div>
      ) : (
        <div className="shrink-0">
          <span className={`text-xs font-medium ${kr.currentValue >= 1 ? "text-emerald-600" : "text-muted-foreground"}`}>
            {kr.currentValue >= 1 ? "Concluído" : "Pendente"}
          </span>
        </div>
      )}

      {/* Status */}
      <OkrStatusBadge status={kr.status} />

      {/* Progress */}
      <div className="w-28 flex items-center gap-2 shrink-0">
        <OkrProgressBar
          percent={kr.progressPercent}
          status={kr.status}
          size="xs"
          className="flex-1"
        />
        <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
          {Math.round(kr.progressPercent)}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 relative">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onUpdate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onMenuToggle}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-popover shadow-md py-1">
            <Link
              href={`/okr/key-results/${kr.id}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Abrir
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
  );
}
