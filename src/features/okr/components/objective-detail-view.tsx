"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Target, TrendingUp, Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OkrObjective, OkrKeyResult, OkrCycle } from "@/lib/types/domain";
import { OkrEntityStatusRow, OkrPriorityBadge } from "./okr-status-badge";
import { OkrProgressBar, MiniProgressRing } from "./okr-progress-bar";
import { CreateKeyResultDialog } from "./create-key-result-dialog";
import { UpdateKeyResultDialog } from "./update-key-result-dialog";
import { UpdateObjectiveDialog } from "./update-objective-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  invalidateAfterKeyResultMutation,
  invalidateAfterObjectiveMutation,
} from "@/lib/query/invalidate-hub-cache";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy", { locale: ptBR });
}

interface ObjectiveDetailViewProps {
  objectiveId: string;
  /** Full width inside quick-view dialog (no max-w-4xl cap). */
  embedded?: boolean;
}

export function ObjectiveDetailView({ objectiveId, embedded }: ObjectiveDetailViewProps) {
  const queryClient = useQueryClient();
  const [createKrOpen, setCreateKrOpen] = useState(false);
  const [editObjectiveOpen, setEditObjectiveOpen] = useState(false);
  const [updateKrOpen, setUpdateKrOpen] = useState(false);
  const [selectedKr, setSelectedKr] = useState<OkrKeyResult | null>(null);
  const [editingStatus, setEditingStatus] = useState(false);

  const { data, isLoading } = useQuery<{ data: ObjectiveWithKRs }>({
    queryKey: ["okr-objective", objectiveId],
    queryFn: async (): Promise<{ data: ObjectiveWithKRs }> => {
      const res = await fetch(`/api/okr/objectives/${objectiveId}`);
      const json = (await res.json()) as { data?: ObjectiveWithKRs };
      if (!res.ok || !json.data) throw new Error("Objetivo não encontrado");
      return { data: json.data };
    },
  });

  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
  });

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/okr/objectives/${objectiveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar objetivo");
      return res.json();
    },
    onSuccess: () => {
      invalidateAfterObjectiveMutation(queryClient, {
        objectiveId,
        cycleId: data?.data?.cycleId ?? null,
      });
      setEditingStatus(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (krId: string) => {
      const res = await fetch(`/api/okr/key-results/${krId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover KR");
      return res.json();
    },
    onSuccess: (_data, deletedKrId) => {
      invalidateAfterKeyResultMutation(queryClient, {
        keyResultId: deletedKrId,
        objectiveId,
        cycleId: data?.data?.cycleId ?? null,
      });
    },
  });

  if (isLoading) {
    return (
      <div className={embedded ? "w-full max-w-none space-y-4" : "max-w-4xl space-y-4"}>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const objective = data?.data;
  if (!objective) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Objetivo não encontrado.</p>
        <Link href="/okr/okrs">
          <Button variant="outline" className="mt-4">
            Voltar para OKRs
          </Button>
        </Link>
      </div>
    );
  }

  const cycles = cyclesRes?.data ?? [];
  const cycleName = objective.cycleId
    ? (cycles.find((c) => c.id === objective.cycleId)?.title ?? "—")
    : "—";
  const krs = objective.keyResults;
  const onTrackKrs = krs.filter((kr) => kr.status === "on_track").length;
  const atRiskKrs = krs.filter((kr) => kr.status === "at_risk").length;
  const completedKrs = krs.filter((kr) => kr.status === "completed").length;

  return (
    <div className={embedded ? "w-full max-w-none space-y-6" : "max-w-4xl space-y-6"}>
      {/* Back */}
      <Link
        href="/okr/okrs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        OKRs
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Objetivo</h1>
      </div>

      {/* Header card */}
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <MiniProgressRing
            percent={objective.progressPercent}
            size={48}
            strokeWidth={4}
            status={objective.status}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-foreground">{objective.title}</h1>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => setEditObjectiveOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
            {objective.descriptionText && (
              <p className="mt-1 text-sm text-muted-foreground">{objective.descriptionText}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {editingStatus ? (
                <select
                  autoFocus
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  defaultValue={objective.status}
                  onChange={(e) => patchMutation.mutate({ status: e.target.value })}
                  onBlur={() => setEditingStatus(false)}
                >
                  <option value="draft">Rascunho</option>
                  <option value="on_track">No rumo</option>
                  <option value="at_risk">Em risco</option>
                  <option value="off_track">Fora do rumo</option>
                  <option value="completed">Concluído</option>
                </select>
              ) : (
                <button onClick={() => setEditingStatus(true)}>
                  <OkrEntityStatusRow
                    status={objective.status}
                    workflowStatusInsight={objective.workflowStatusInsight}
                    healthInsight={objective.healthInsight}
                    startDate={objective.startDate}
                    targetDate={objective.targetDate}
                    progressPercent={objective.progressPercent}
                  />
                </button>
              )}
              <OkrPriorityBadge priority={objective.priority} />
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-2 sm:grid-cols-4">
          <MetaItem label="Ciclo" value={cycleName} />
          <MetaItem label="Início" value={formatDate(objective.startDate)} />
          <MetaItem label="Data meta" value={formatDate(objective.targetDate)} />
          <MetaItem label="Progresso" value={`${Math.round(objective.progressPercent)}%`} />
        </div>

        {/* Progress bar */}
        <OkrProgressBar
          percent={objective.progressPercent}
          status={objective.status}
          showLabel
          size="md"
        />
      </div>

      {/* KR summary */}
      {krs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-600">{onTrackKrs}</p>
            <p className="text-xs text-muted-foreground">No rumo</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-amber-600">{atRiskKrs}</p>
            <p className="text-xs text-muted-foreground">Em risco</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-blue-600">{completedKrs}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
        </div>
      )}

      {/* Key Results */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Key Results</span>
            <span className="text-xs text-muted-foreground">({krs.length})</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateKrOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo KR
          </Button>
        </div>

        {krs.length === 0 ? (
          <div className="py-10 text-center">
            <TrendingUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-30" />
            <p className="mb-3 text-sm text-muted-foreground">Nenhum key result ainda.</p>
            <Button variant="outline" size="sm" onClick={() => setCreateKrOpen(true)}>
              <Plus className="h-4 w-4" />
              Adicionar KR
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {krs.map((kr) => (
              <div
                key={kr.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/okr/key-results/${kr.id}`}
                    className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {kr.title}
                  </Link>
                  <div className="mt-1.5 flex items-center gap-3">
                    <OkrEntityStatusRow
                      status={kr.status}
                      workflowStatusInsight={kr.workflowStatusInsight}
                      healthInsight={kr.healthInsight}
                      startDate={kr.startDate}
                      targetDate={kr.targetDate}
                      progressPercent={kr.progressPercent}
                    />
                    {kr.metricType !== "boolean" && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {kr.currentValue} / {kr.targetValue}
                        {kr.unit ? ` ${kr.unit}` : ""}
                      </span>
                    )}
                    {kr.targetDate && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(kr.targetDate)}
                      </span>
                    )}
                  </div>
                  <OkrProgressBar
                    percent={kr.progressPercent}
                    status={kr.status}
                    showLabel
                    size="xs"
                    className="mt-2"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => {
                      setSelectedKr(kr);
                      setUpdateKrOpen(true);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive"
                    onClick={() => {
                      if (confirm("Remover este key result?")) deleteMutation.mutate(kr.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateKeyResultDialog
        open={createKrOpen}
        onOpenChange={setCreateKrOpen}
        defaultObjectiveId={objectiveId}
        defaultCycleId={objective.cycleId ?? undefined}
      />
      <UpdateObjectiveDialog
        open={editObjectiveOpen}
        onOpenChange={setEditObjectiveOpen}
        objective={editObjectiveOpen ? objective : null}
      />
      <UpdateKeyResultDialog
        open={updateKrOpen}
        onOpenChange={setUpdateKrOpen}
        keyResult={selectedKr}
      />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
