"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { OkrCycle } from "@/lib/types/domain";

interface MemberRow {
  id: string;
  name: string;
  email: string;
}

interface CreateObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCycleId?: string;
}

type DateFieldErrors = {
  order?: string;
  startInCycle?: string;
  targetInCycle?: string;
};

export function CreateObjectiveDialog({
  open,
  onOpenChange,
  defaultCycleId,
}: CreateObjectiveDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [cycleId, setCycleId] = useState(defaultCycleId ?? "");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [status, setStatus] = useState("draft");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      const res = await fetch("/api/okr/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar objetivo");
      return res.json() as Promise<{ data: { id: string } }>;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      const id = res?.data?.id;
      emitOpenChange(false);
      if (id) router.push(`/okr/objectives/${id}`);
    },
  });

  function resetForm() {
    setTitle("");
    setCycleId(defaultCycleId ?? "");
    setOwnerUserId("");
    setStatus("draft");
    setPriority("medium");
    setStartDate("");
    setTargetDate("");
    setDescription("");
    setShowAdvanced(false);
    setDateErrors({});
  }

  function emitOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  useEffect(() => {
    if (open) {
      setCycleId(defaultCycleId ?? "");
      setDateErrors({});
    }
  }, [open, defaultCycleId]);

  const cycles = cyclesRes?.data ?? [];
  const members = membersRes?.data ?? [];

  const selectedCycle = useMemo(() => cycles.find((c) => c.id === cycleId), [cycles, cycleId]);

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

  function handleClose() {
    emitOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!applyDateValidation()) return;
    mutation.mutate({
      title: title.trim(),
      descriptionText: description.trim() || undefined,
      cycleId: cycleId || undefined,
      ownerUserId: ownerUserId || undefined,
      status,
      priority,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={emitOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo objetivo</DialogTitle>
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
              uma atividade. Ex.: &quot;Aumentar retenção de clientes no nicho corrida&quot;.
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
              className={cn(
                "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "min-h-[5.5rem] disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
              <div className="mt-3 space-y-4 rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                    <Label>Prioridade</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            Depois de criar, você poderá adicionar key results ao objetivo na página seguinte.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Criando…" : "Criar objetivo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
