"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import { nativeSelectClassName } from "@/components/ui/form-control-classes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OkrCycle, Project } from "@/lib/types/domain";

type MemberRow = { id: string; name: string; email: string };

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const queryClient = useQueryClient();
  /** Evita reaplicar `project` a cada refetch do hub enquanto o modal está aberto (apagava datas não salvas e travava com o date picker nativo). */
  const seededThisOpen = useRef(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState("medium");
  const [cycleId, setCycleId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: open,
  });
  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    enabled: open,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!project) throw new Error("Projeto inválido");
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao salvar projeto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-hub"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) {
      seededThisOpen.current = false;
      return;
    }
    if (!project || seededThisOpen.current) return;
    seededThisOpen.current = true;
    setTitle(project.title);
    setSummary(project.summary ?? "");
    setStatus(project.status);
    setPriority(project.priority);
    setCycleId(project.cycleId ?? "");
    setOwnerUserId(project.ownerUserId ?? "");
    setStartDate(project.startDate ?? "");
    setTargetDate(project.targetDate ?? "");
  }, [open, project]);

  const members = membersRes?.data ?? [];

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        /* Só pointer: evita fechar o modal ao abrir o calendário nativo. Não use onFocusOutside+preventDefault — bloqueia o 2º type=date. */
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar projeto</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            mutation.mutate({
              title: title.trim(),
              summary: summary.trim() || undefined,
              status,
              priority,
              cycleId: cycleId || undefined,
              ownerUserId: ownerUserId || undefined,
              startDate: startDate || undefined,
              targetDate: targetDate || undefined,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label>Nome do projeto *</Label>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Resumo</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status no cadastro</Label>
            <select
              className={nativeSelectClassName}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="planned">Planejado</option>
              <option value="active">Ativo</option>
              <option value="on_hold">Em espera</option>
              <option value="completed">Concluído</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Na lista, o status exibido é o operacional (Planejado, Em Progresso, Bloqueado,
              Bem/Parcialmente bem sucedido, Falhou ou Cancelado), calculado a partir destes
              valores, progresso e datas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <select
                className={nativeSelectClassName}
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
              >
                <option value="">Sem ciclo</option>
                {(cyclesRes?.data ?? []).map((c) => (
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
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <DateField value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo alvo</Label>
              <DateField value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
