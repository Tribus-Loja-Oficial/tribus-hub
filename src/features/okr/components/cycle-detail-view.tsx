"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, CalendarRange, Target, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OkrCycle, OkrObjective, OkrKeyResult } from "@/lib/db/schema";
import { OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar, MiniProgressRing } from "./okr-progress-bar";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };

function calcTimeProgress(cycle: OkrCycle): number {
  const now = new Date();
  const start = new Date(cycle.startDate);
  const end = new Date(cycle.endDate);
  if (isBefore(now, start)) return 0;
  if (isAfter(now, end)) return 100;
  const total = differenceInDays(end, start);
  const elapsed = differenceInDays(now, start);
  if (total === 0) return 100;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

interface CycleDetailViewProps {
  cycleId: string;
}

export function CycleDetailView({ cycleId }: CycleDetailViewProps) {
  const queryClient = useQueryClient();

  const { data: cycleRes, isLoading: cycleLoading } = useQuery<{ data: OkrCycle }>({
    queryKey: ["okr-cycle", cycleId],
    queryFn: () => fetch(`/api/okr/cycles/${cycleId}`).then((r) => r.json()),
  });

  const { data: objectivesRes, isLoading: objLoading } = useQuery<{
    data: ObjectiveWithKRs[];
  }>({
    queryKey: ["okr-objectives", "", cycleId],
    queryFn: () => fetch(`/api/okr/objectives?cycleId=${cycleId}`).then((r) => r.json()),
  });

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/okr/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar ciclo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-cycle", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });

  if (cycleLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const cycle = cycleRes?.data;
  if (!cycle) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ciclo não encontrado.</p>
        <Link href="/okr/cycles">
          <Button variant="outline" className="mt-4">Voltar para ciclos</Button>
        </Link>
      </div>
    );
  }

  const objectives = objectivesRes?.data ?? [];
  const timeProgress = calcTimeProgress(cycle);
  const daysLeft = Math.max(0, differenceInDays(new Date(cycle.endDate), new Date()));
  const totalKrs = objectives.reduce((s, o) => s + o.keyResults.length, 0);
  const completedKrs = objectives.reduce(
    (s, o) => s + o.keyResults.filter((kr) => kr.status === "completed").length,
    0,
  );
  const onTrackObj = objectives.filter((o) => o.status === "on_track").length;
  const atRiskObj = objectives.filter((o) => o.status === "at_risk").length;
  const avgProgress =
    objectives.length > 0
      ? Math.round(
          (objectives.reduce((s, o) => s + o.progressPercent, 0) / objectives.length) * 10,
        ) / 10
      : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/okr/cycles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Ciclos
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{cycle.title}</h1>
              <OkrStatusBadge status={cycle.status} size="md" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(cycle.startDate), "dd MMM yyyy", { locale: ptBR })} →{" "}
              {format(new Date(cycle.endDate), "dd MMM yyyy", { locale: ptBR })}
              {cycle.status === "active" && daysLeft > 0 && (
                <> · <span className="font-medium text-foreground">{daysLeft} dias restantes</span></>
              )}
            </p>
            {cycle.description && (
              <p className="text-sm text-muted-foreground mt-2">{cycle.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cycle.status === "planned" && (
              <Button
                size="sm"
                onClick={() => patchMutation.mutate({ status: "active" })}
                disabled={patchMutation.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Ativar
              </Button>
            )}
            {cycle.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => patchMutation.mutate({ status: "closed" })}
                disabled={patchMutation.isPending}
              >
                Encerrar
              </Button>
            )}
          </div>
        </div>

        {/* Time progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso temporal</span>
            <span className="font-bold tabular-nums">{timeProgress}%</span>
          </div>
          <OkrProgressBar percent={timeProgress} size="md" />
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Objetivos</p>
            <p className="text-2xl font-bold mt-0.5">{objectives.length}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">No rumo</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{onTrackObj}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Em risco</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{atRiskObj}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">KRs concluídos</p>
            <p className="text-2xl font-bold text-blue-600 mt-0.5">
              {completedKrs}<span className="text-sm text-muted-foreground font-normal">/{totalKrs}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Objetivos do ciclo</span>
            {!objLoading && <span className="text-xs text-muted-foreground">({objectives.length})</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Progresso médio:</span>
            <span className="text-xs font-bold tabular-nums">{avgProgress}%</span>
          </div>
        </div>

        {objLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : objectives.length === 0 ? (
          <div className="py-10 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">Nenhum objetivo neste ciclo.</p>
            <Link href="/okr/objectives">
              <Button variant="outline" size="sm" className="mt-3">
                Gerenciar objetivos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {objectives.map((obj) => (
              <Link
                key={obj.id}
                href={`/okr/objectives/${obj.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <MiniProgressRing
                  percent={obj.progressPercent}
                  size={36}
                  status={obj.status}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{obj.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <OkrStatusBadge status={obj.status} />
                    <span className="text-xs text-muted-foreground">
                      {obj.keyResults.length} KR{obj.keyResults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="w-28 flex items-center gap-2 shrink-0">
                  <OkrProgressBar
                    percent={obj.progressPercent}
                    status={obj.status}
                    size="xs"
                    className="flex-1"
                  />
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                    {Math.round(obj.progressPercent)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
