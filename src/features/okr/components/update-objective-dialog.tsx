"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterObjectiveMutation } from "@/lib/query/invalidate-hub-cache";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import {
  nativeSelectClassName,
  nativeTextareaClassName,
} from "@/components/ui/form-control-classes";
import { Label } from "@/components/ui/label";
import type { OkrCycle, OkrObjective } from "@/lib/types/domain";
import { deriveOkrWorkflowStatusInsight } from "@/features/okr/lib/okr-workflow-status";

type ObjectiveForEdit = OkrObjective & { keyResults?: unknown[] };

interface MemberRow {
  id: string;
  name: string;
  email: string;
}

interface UpdateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: ObjectiveForEdit | null;
}

type DateFieldErrors = {
  order?: string;
  startInCycle?: string;
  targetInCycle?: string;
};

export function UpdateObjectiveDialog({
  open,
  onOpenChange,
  objective,
}: UpdateObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [cadastroTracking, setCadastroTracking] = useState<"draft" | "active">("draft");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [dateErrors, setDateErrors] = useState<DateFieldErrors>({});

  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    enabled: open,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      if (!objective) throw new Error("Sem objetivo");
      const res = await fetch(`/api/okr/objectives/${objective.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao atualizar objetivo");
      return res.json();
    },
    onSuccess: () => {
      if (!objective) return;
      invalidateAfterObjectiveMutation(queryClient, {
        objectiveId: objective.id,
        cycleId: objective.cycleId,
      });
      emitOpenChange(false);
    },
  });

  function resetForm() {
    setTitle("");
    setCycleId("");
    setOwnerUserId("");
    setCadastroTracking("draft");
    setPriority("medium");
    setStartDate("");
    setTargetDate("");
    setDescription("");
    setShowAdvanced(true);
    setDateErrors({});
  }

  function emitOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  useEffect(() => {
    if (!open || !objective) return;
    setTitle(objective.title);
    setCycleId(objective.cycleId ?? "");
    setOwnerUserId(objective.ownerUserId ?? "");
    setCadastroTracking(objective.status === "draft" ? "draft" : "active");
    setPriority(objective.priority);
    setStartDate(objective.startDate ?? "");
    setTargetDate(objective.targetDate ?? "");
    setDescription(objective.descriptionText ?? "");
    setDateErrors({});
  }, [open, objective]);

  const cycles = cyclesRes?.data ?? [];
  const members = membersRes?.data ?? [];

  const selectedCycle = useMemo(() => cycles.find((c) => c.id === cycleId), [cycles, cycleId]);

  const previewCadastroStatus = useMemo(() => {
    if (cadastroTracking === "draft") return "draft";
    if (objective?.status === "draft") return "on_track";
    return objective?.status ?? "on_track";
  }, [cadastroTracking, objective?.status]);

  const workflowPreview = useMemo(() => {
    if (!objective) return null;
    return deriveOkrWorkflowStatusInsight({
      workflowStatusInsight: objective.workflowStatusInsight,
      startDate,
      targetDate,
      progressPercent: objective.progressPercent,
      okrCadastroStatus: previewCadastroStatus,
    });
  }, [objective, startDate, targetDate, previewCadastroStatus]);

  function applyDateValidation(): boolean {
    const next: DateFieldErrors = {};
    if (startDate && targetDate && startDate > targetDate) {
      next.order = "A data de início não pode ser depois da data-alvo.";
    }
    if (selectedCycle) {
      if (startDate && (startDate < selectedCycle.startDate || startDate > selectedCycle.endDate)) {
        next.startInCycle = `O início deve ficar entre ${selectedCycle.startDate} e ${selectedCycle.endDate} (período do ciclo).`;
      }
      if (
        targetDate &&
        (targetDate < selectedCycle.startDate || targetDate > selectedCycle.endDate)
      ) {
        next.targetInCycle = `A data-alvo deve ficar entre ${selectedCycle.startDate} e ${selectedCycle.endDate} (período do ciclo).`;
      }
    }
    setDateErrors(next);
    if (Object.keys(next).length > 0) setShowAdvanced(true);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !objective) return;
    if (!applyDateValidation()) return;
    const payload: Record<string, unknown> = {
      title: title.trim(),
      descriptionText: description.trim() || undefined,
      cycleId: cycleId || undefined,
      ownerUserId: ownerUserId || undefined,
      priority,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
    };
    if (objective.status === "draft") {
      payload.status = cadastroTracking === "draft" ? "draft" : "on_track";
    }
    mutation.mutate(payload);
  }

  if (!objective) return null;

  return (
    <Dialog open={open} onOpenChange={emitOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar objetivo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Aumentar receita recorrente no nicho corrida"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Objetivo descreve um{" "}
              <strong className="font-medium text-foreground/80">resultado desejado</strong>, não
              uma atividade.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Explique contexto, motivação, impacto esperado e restrições."
              className={nativeTextareaClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <select
                className={nativeSelectClassName}
                value={cycleId}
                onChange={(e) => {
                  setCycleId(e.target.value);
                  setDateErrors({});
                }}
              >
                <option value="">Sem ciclo</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <select
                className={nativeSelectClassName}
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
              >
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Ocultar opções avançadas" : "Mostrar opções avançadas"}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-4 rounded-lg border border-border/70 bg-muted/25 p-3 shadow-inset">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Cadastro no acompanhamento</Label>
                    {objective.status === "completed" ? (
                      <p className="text-sm text-muted-foreground">
                        Objetivo <span className="font-medium text-foreground">concluído</span> no
                        cadastro.
                      </p>
                    ) : (
                      <select
                        className={nativeSelectClassName}
                        value={cadastroTracking}
                        onChange={(e) =>
                          setCadastroTracking(e.target.value === "draft" ? "draft" : "active")
                        }
                      >
                        <option value="draft">
                          Rascunho (health por ritmo não corre até incluir)
                        </option>
                        <option value="active">Incluído no acompanhamento</option>
                      </select>
                    )}
                    <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Status operacional (por datas)</p>
                      <p className="mt-1">{workflowPreview?.labelPt ?? "—"}</p>
                      <p className="mt-2 text-[11px] leading-relaxed">
                        O health na lista é calculado automaticamente (progresso vs tempo na
                        janela).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Prioridade</Label>
                    <select
                      className={nativeSelectClassName}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Início</Label>
                    <DateField
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDateErrors({});
                      }}
                    />
                    {dateErrors.startInCycle && (
                      <p className="text-xs text-destructive">{dateErrors.startInCycle}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data-alvo</Label>
                    <DateField
                      value={targetDate}
                      onChange={(e) => {
                        setTargetDate(e.target.value);
                        setDateErrors({});
                      }}
                    />
                    {dateErrors.targetInCycle && (
                      <p className="text-xs text-destructive">{dateErrors.targetInCycle}</p>
                    )}
                  </div>
                </div>
                {dateErrors.order && <p className="text-xs text-destructive">{dateErrors.order}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => emitOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
