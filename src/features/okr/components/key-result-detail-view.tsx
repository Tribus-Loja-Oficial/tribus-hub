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
      <div className="max-w-4xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const kr = data?.data;
  if (!kr) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Key result não encontrado.</p>
        <Link href="/okr/okrs">
          <Button variant="outline" className="mt-4">
            Voltar para key results
          </Button>
        </Link>
      </div>
    );
  }

  const objectives = objectivesRes?.data ?? [];
  const objective = objectives.find((o) => o.id === kr.objectiveId);
  const updates = updatesRes?.data ?? [];
  const isBoolean = kr.metricType === "boolean";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Link
        href="/okr/okrs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        OKRs
      </Link>

      {/* Header card */}
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <MiniProgressRing
            percent={kr.progressPercent}
            size={48}
            strokeWidth={4}
            status={kr.status}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">{kr.title}</h1>
            {kr.descriptionText && (
              <p className="mt-1 text-sm text-muted-foreground">{kr.descriptionText}</p>
            )}
            {objective && (
              <Link
                href={`/okr/objectives/${objective.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <TrendingUp className="h-3 w-3" />
                {objective.title}
              </Link>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>

        {/* Values */}
        {!isBoolean && (
          <div className="grid grid-cols-3 gap-4 border-y border-border py-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Início</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{kr.startValue}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Atual</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-primary">{kr.currentValue}</p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{kr.targetValue}</p>
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
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-2 sm:grid-cols-4">
          <MetaItem label="Início" value={formatDate(kr.startDate)} />
          <MetaItem label="Data meta" value={formatDate(kr.targetDate)} />
          <MetaItem label="Confiança" value={`${kr.confidence ?? 50}%`} />
          <MetaItem
            label="Atualizado"
            value={format(new Date(kr.updatedAt), "dd MMM yyyy", { locale: ptBR })}
          />
        </div>
      </div>

      {/* Update History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Histórico de atualizações</span>
          <span className="text-xs text-muted-foreground">({updates.length})</span>
        </div>

        {updatesLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="py-10 text-center">
            <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setUpdateOpen(true)}
            >
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">
                        {upd.previousValue} → {upd.newValue}
                        {kr.unit ? ` ${kr.unit}` : ""}
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        ({sign}
                        {delta})
                      </span>
                    </div>
                    {upd.comment && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{upd.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
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
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
