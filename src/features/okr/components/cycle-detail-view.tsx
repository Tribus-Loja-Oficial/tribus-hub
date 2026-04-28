"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterCycleMutation } from "@/lib/query/invalidate-hub-cache";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  Target,
  TrendingUp,
  CheckCircle,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OkrCycle, OkrObjective, OkrKeyResult } from "@/lib/types/domain";
import { OkrEntityStatusRow, OkrStatusBadge } from "./okr-status-badge";
import { OkrProgressBar, MiniProgressRing } from "./okr-progress-bar";
import { UpdateCycleDialog } from "./update-cycle-dialog";
import { differenceInDays, isAfter, isBefore } from "date-fns";
import { formatCivilDate, parseCivilDateInput, startOfLocalDay } from "@/lib/date/civil-date";
import { cyclePhaseLabel, getCyclePhase } from "@/lib/cycles/cycle-phase";

type ObjectiveWithKRs = OkrObjective & { keyResults: OkrKeyResult[] };
type CycleProject = {
  id: string;
  title: string;
  slug?: string | null;
  status: string;
  progressPercent: number;
  startDate: string | null;
  targetDate: string | null;
};

function calcTimeProgress(cycle: OkrCycle): number {
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

interface CycleDetailViewProps {
  cycleId: string;
}

export function CycleDetailView({ cycleId }: CycleDetailViewProps) {
  const queryClient = useQueryClient();
  const [editCycleOpen, setEditCycleOpen] = useState(false);

  const { data: cycleRes, isLoading: cycleLoading } = useQuery<{
    data: OkrCycle & { objectives?: ObjectiveWithKRs[]; projects?: CycleProject[] };
  }>({
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
      invalidateAfterCycleMutation(queryClient, { cycleId });
    },
  });

  if (cycleLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const cycle = cycleRes?.data;
  if (!cycle) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Ciclo não encontrado.</p>
        <Link href="/okr/cycles">
          <Button variant="outline" className="mt-4">
            Voltar para ciclos
          </Button>
        </Link>
      </div>
    );
  }

  const objectives =
    (cycleRes?.data?.objectives as ObjectiveWithKRs[] | undefined) ?? objectivesRes?.data ?? [];
  const projects = cycleRes?.data?.projects ?? [];
  const timeProgress = calcTimeProgress(cycle);
  const endCivil = parseCivilDateInput(cycle.endDate);
  const daysLeft =
    endCivil != null
      ? Math.max(0, differenceInDays(startOfLocalDay(endCivil), startOfLocalDay(new Date())))
      : 0;
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
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Link
        href="/okr/cycles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ciclos
      </Link>

      {/* Header */}
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{cycle.title}</h1>
              <OkrStatusBadge status={cycle.status} size="md" />
              <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {cyclePhaseLabel(getCyclePhase(cycle.startDate, cycle.endDate))}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCivilDate(cycle.startDate, "dd MMM yyyy")} →{" "}
              {formatCivilDate(cycle.endDate, "dd MMM yyyy")}
              {cycle.status === "active" && daysLeft > 0 && (
                <>
                  {" "}
                  · <span className="font-medium text-foreground">{daysLeft} dias restantes</span>
                </>
              )}
            </p>
            {cycle.description && (
              <p className="mt-2 text-sm text-muted-foreground">{cycle.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditCycleOpen(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
            {cycle.status === "planned" && (
              <Button
                size="sm"
                onClick={() => patchMutation.mutate({ status: "active" })}
                disabled={patchMutation.isPending}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
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
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-2 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Objetivos
            </p>
            <p className="mt-0.5 text-2xl font-bold">{objectives.length}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              No rumo
            </p>
            <p className="mt-0.5 text-2xl font-bold text-emerald-600">{onTrackObj}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Em risco
            </p>
            <p className="mt-0.5 text-2xl font-bold text-amber-600">{atRiskObj}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              KRs concluídos
            </p>
            <p className="mt-0.5 text-2xl font-bold text-blue-600">
              {completedKrs}
              <span className="text-sm font-normal text-muted-foreground">/{totalKrs}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Objetivos do ciclo</span>
            {!objLoading && (
              <span className="text-xs text-muted-foreground">({objectives.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Progresso médio:</span>
            <span className="text-xs font-bold tabular-nums">{avgProgress}%</span>
          </div>
        </div>

        {objLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : objectives.length === 0 ? (
          <div className="py-10 text-center">
            <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-30" />
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
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20"
              >
                <MiniProgressRing percent={obj.progressPercent} size={36} status={obj.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{obj.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <OkrEntityStatusRow
                      status={obj.status}
                      workflowStatusInsight={obj.workflowStatusInsight}
                      healthInsight={obj.healthInsight}
                      startDate={obj.startDate}
                      targetDate={obj.targetDate}
                      progressPercent={obj.progressPercent}
                    />
                    <span className="text-xs text-muted-foreground">
                      {obj.keyResults.length} KR{obj.keyResults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex w-28 shrink-0 items-center gap-2">
                  <OkrProgressBar
                    percent={obj.progressPercent}
                    status={obj.status}
                    size="xs"
                    className="flex-1"
                  />
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(obj.progressPercent)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Projetos do ciclo</span>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </div>
          <Link
            href="/projects/list"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhum projeto vinculado a este ciclo.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${encodeURIComponent(p.slug || p.id)}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.startDate && p.targetDate
                      ? `${formatCivilDate(p.startDate, "dd MMM")} → ${formatCivilDate(p.targetDate, "dd MMM")}`
                      : "Sem janela própria"}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(Number(p.progressPercent ?? 0))}%
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <UpdateCycleDialog
        open={editCycleOpen}
        onOpenChange={setEditCycleOpen}
        cycle={editCycleOpen ? cycle : null}
      />
    </div>
  );
}
