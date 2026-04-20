"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, TrendingUp, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OkrKeyResult, OkrKeyResultUpdate, OkrObjective } from "@/lib/db/schema";
import { OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar, MiniProgressRing } from "./okr-progress-bar";
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

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy", { locale: ptBR });
}

interface KeyResultDetailViewProps {
  keyResultId: string;
}

export function KeyResultDetailView({ keyResultId }: KeyResultDetailViewProps) {
  const queryClient = useQueryClient();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const { data, isLoading } = useQuery<{ data: OkrKeyResult }>({
    queryKey: ["okr-key-result", keyResultId],
    queryFn: () => fetch(`/api/okr/key-results/${keyResultId}`).then((r) => r.json()),
  });

  const { data: updatesRes, isLoading: updatesLoading } = useQuery<{
    data: OkrKeyResultUpdate[];
  }>({
    queryKey: ["okr-kr-updates", keyResultId],
    queryFn: () => fetch(`/api/okr/key-results/${keyResultId}/updates`).then((r) => r.json()),
  });

  const { data: objectivesRes } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives"],
    queryFn: () => fetch("/api/okr/objectives").then((r) => r.json()),
  });

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/okr/key-results/${keyResultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar KR");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-key-result", keyResultId] });
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      setEditingStatus(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const kr = data?.data;
  if (!kr) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Key result não encontrado.</p>
        <Link href="/okr/okrs">
          <Button variant="outline" className="mt-4">Voltar para key results</Button>
        </Link>
      </div>
    );
  }

  const objectives = objectivesRes?.data ?? [];
  const objective = objectives.find((o) => o.id === kr.objectiveId);
  const updates = updatesRes?.data ?? [];
  const isBoolean = kr.metricType === "boolean";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/okr/okrs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        OKRs
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start gap-4">
          <MiniProgressRing
            percent={kr.progressPercent}
            size={48}
            strokeWidth={4}
            status={kr.status}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{kr.title}</h1>
            {kr.descriptionText && (
              <p className="text-sm text-muted-foreground mt-1">{kr.descriptionText}</p>
            )}
            {objective && (
              <Link
                href={`/okr/objectives/${objective.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                <TrendingUp className="h-3 w-3" />
                {objective.title}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {editingStatus ? (
                <select
                  autoFocus
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  defaultValue={kr.status}
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
                  <OkrStatusBadge status={kr.status} />
                </button>
              )}
              <span className="text-xs text-muted-foreground">{METRIC_LABELS[kr.metricType]}</span>
              {kr.unit && <span className="text-xs text-muted-foreground">· {kr.unit}</span>}
            </div>
          </div>
          <Button size="sm" onClick={() => setUpdateOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* Values */}
        {!isBoolean && (
          <div className="grid grid-cols-3 gap-4 py-4 border-y border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Início</p>
              <p className="text-xl font-bold tabular-nums mt-1">{kr.startValue}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Atual</p>
              <p className="text-xl font-bold tabular-nums text-primary mt-1">{kr.currentValue}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Meta</p>
              <p className="text-xl font-bold tabular-nums mt-1">{kr.targetValue}</p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-bold tabular-nums">{Math.round(kr.progressPercent)}%</span>
          </div>
          <OkrProgressBar percent={kr.progressPercent} status={kr.status} size="md" />
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
          <MetaItem label="Início" value={formatDate(kr.startDate)} />
          <MetaItem label="Data meta" value={formatDate(kr.targetDate)} />
          <MetaItem label="Confiança" value={`${kr.confidence ?? 50}%`} />
          <MetaItem label="Atualizado" value={format(new Date(kr.updatedAt), "dd MMM yyyy", { locale: ptBR })} />
        </div>
      </div>

      {/* Update History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Histórico de atualizações</span>
          <span className="text-xs text-muted-foreground">({updates.length})</span>
        </div>

        {updatesLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setUpdateOpen(true)}>
              Registrar primeira atualização
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {updates.map((upd) => {
              const delta = upd.newValue - upd.previousValue;
              const sign = delta >= 0 ? "+" : "";
              return (
                <div key={upd.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm tabular-nums font-medium">
                        {upd.previousValue} → {upd.newValue}
                        {kr.unit ? ` ${kr.unit}` : ""}
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        ({sign}{delta})
                      </span>
                    </div>
                    {upd.comment && (
                      <p className="text-sm text-muted-foreground mt-0.5">{upd.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {format(new Date(upd.createdAt), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UpdateKeyResultDialog open={updateOpen} onOpenChange={setUpdateOpen} keyResult={kr} />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
