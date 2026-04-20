"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OkrObjective } from "@/lib/db/schema";

type ObjectiveWithKRs = OkrObjective & { keyResults: unknown[] };
interface MemberRow { id: string; name: string; email: string }

interface CreateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultObjectiveId?: string;
  defaultCycleId?: string;
}

export function CreateKeyResultDialog({
  open,
  onOpenChange,
  defaultObjectiveId,
  defaultCycleId,
}: CreateKeyResultDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [objectiveId, setObjectiveId] = useState(defaultObjectiveId ?? "");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [metricType, setMetricType] = useState("number");
  const [unit, setUnit] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [currentValue, setCurrentValue] = useState("0");
  const [targetValue, setTargetValue] = useState("100");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data: objectivesRes } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives"],
    queryFn: () => fetch("/api/okr/objectives").then((r) => r.json()),
    enabled: open,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/okr/key-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar key result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      handleClose();
    },
  });

  function handleClose() {
    onOpenChange(false);
    setTitle("");
    setObjectiveId(defaultObjectiveId ?? "");
    setOwnerUserId("");
    setMetricType("number");
    setUnit("");
    setStartValue("0");
    setCurrentValue("0");
    setTargetValue("100");
    setStatus("draft");
    setStartDate("");
    setTargetDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !objectiveId) return;
    mutation.mutate({
      title: title.trim(),
      objectiveId,
      cycleId: defaultCycleId || undefined,
      ownerUserId: ownerUserId || undefined,
      metricType,
      unit: unit.trim() || undefined,
      startValue: parseFloat(startValue) || 0,
      currentValue: parseFloat(currentValue) || 0,
      targetValue: parseFloat(targetValue) || 100,
      status,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
    });
  }

  const objectives = objectivesRes?.data ?? [];
  const members = membersRes?.data ?? [];

  const isBoolean = metricType === "boolean";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo key result</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Atingir 200 clientes ativos…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Objetivo <span className="text-destructive">*</span></Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={objectiveId}
                onChange={(e) => setObjectiveId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
              >
                <option value="">Sem owner</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de métrica</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
              >
                <option value="number">Número</option>
                <option value="percentage">Percentual</option>
                <option value="currency">Moeda</option>
                <option value="boolean">Sim/Não</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex.: clientes, %…"
                disabled={isBoolean}
              />
            </div>
          </div>

          {!isBoolean && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Atual</Label>
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Meta</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Rascunho</option>
                <option value="on_track">No rumo</option>
                <option value="at_risk">Em risco</option>
                <option value="off_track">Fora do rumo</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Data meta</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || !objectiveId || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mutation.isPending ? "Criando…" : "Criar key result"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
