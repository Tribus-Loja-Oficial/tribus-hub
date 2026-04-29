"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { OkrCycle, Project } from "@/lib/types/domain";

type MemberRow = { id: string; name: string; email: string };
type ProjectStatusOption = Project["status"];
type ProjectPriorityOption = Project["priority"];

const PROJECT_STATUS_OPTIONS: readonly ProjectStatusOption[] = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];
const PROJECT_PRIORITY_OPTIONS: readonly ProjectPriorityOption[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

function normalizeProjectStatus(value: unknown): ProjectStatusOption {
  return PROJECT_STATUS_OPTIONS.includes(value as ProjectStatusOption)
    ? (value as ProjectStatusOption)
    : "planned";
}

function normalizeProjectPriority(value: unknown): ProjectPriorityOption {
  return PROJECT_PRIORITY_OPTIONS.includes(value as ProjectPriorityOption)
    ? (value as ProjectPriorityOption)
    : "medium";
}

/** Formulário partilhado — usa Radix Select para funcionar dentro de Dialog aninhado (quick view + editar). */
export function EditProjectFormFields({
  project,
  formActive,
  onCancel,
  onSaved,
  autoFocusTitle = false,
}: {
  project: Project;
  formActive: boolean;
  onCancel: () => void;
  onSaved: () => void;
  /** Só no modal da lista; evita roubar foco no painel inline (quick view). */
  autoFocusTitle?: boolean;
}) {
  const queryClient = useQueryClient();
  const seededThisOpen = useRef(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState("medium");
  const [estimationUnit, setEstimationUnit] = useState<"hours" | "story_points">("hours");
  const [cycleId, setCycleId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: formActive,
  });
  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    enabled: formActive,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof json?.error?.message === "string" ? json.error.message : "Falha ao salvar projeto";
        throw new Error(message);
      }
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["project-hub", project.id] }),
        queryClient.invalidateQueries({ queryKey: ["project-hub"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] }),
      ]);
      onSaved();
    },
  });

  useEffect(() => {
    if (!formActive) {
      seededThisOpen.current = false;
      return;
    }
    if (!project || seededThisOpen.current) return;
    seededThisOpen.current = true;
    setTitle(project.title);
    setSummary(project.summary ?? "");
    setStatus(normalizeProjectStatus(project.status));
    setPriority(normalizeProjectPriority(project.priority));
    setEstimationUnit((project.estimationUnit as "hours" | "story_points" | undefined) ?? "hours");
    setCycleId(project.cycleId ?? "");
    setOwnerUserId(project.ownerUserId ?? "");
    setStartDate(project.startDate ?? "");
    setTargetDate(project.targetDate ?? "");
  }, [formActive, project]);

  const members = membersRes?.data ?? [];

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutation.mutate({
          title: title.trim(),
          summary: summary.trim() || undefined,
          status: normalizeProjectStatus(status),
          priority: normalizeProjectPriority(priority),
          estimationUnit,
          cycleId: cycleId || undefined,
          ownerUserId: ownerUserId || undefined,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
        });
      }}
    >
      <div className="space-y-1.5">
        <Label>Nome do projeto *</Label>
        <Input
          autoFocus={autoFocusTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Resumo</Label>
        <textarea
          className="min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Status do projeto">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SelectItem value="planned">Planejado</SelectItem>
              <SelectItem value="active">Em progresso</SelectItem>
              <SelectItem value="on_hold">Bloqueado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger aria-label="Prioridade">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Estimativa do projeto</Label>
          <Select
            value={estimationUnit}
            onValueChange={(v) => setEstimationUnit(v as "hours" | "story_points")}
          >
            <SelectTrigger aria-label="Estimativa do projeto">
              <SelectValue placeholder="Unidade de estimativa" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SelectItem value="hours">Horas</SelectItem>
              <SelectItem value="story_points">Story points</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Ciclo</Label>
          <Select
            value={cycleId || "__none__"}
            onValueChange={(v) => setCycleId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger aria-label="Ciclo OKR">
              <SelectValue placeholder="Sem ciclo" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SelectItem value="__none__">Sem ciclo</SelectItem>
              {(cyclesRes?.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Select
            value={ownerUserId || "__none__"}
            onValueChange={(v) => setOwnerUserId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger aria-label="Responsável">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <SelectItem value="__none__">—</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!title.trim() || mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {mutation.error instanceof Error && (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      )}
    </form>
  );
}

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  /** Dentro do quick view ou outro modal — overlay acima do pai. */
  nested?: boolean;
}

export function EditProjectDialog({ open, onOpenChange, project, nested }: EditProjectDialogProps) {
  if (!project) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested={nested} className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar projeto</DialogTitle>
        </DialogHeader>
        <EditProjectFormFields
          project={project}
          formActive={open}
          autoFocusTitle={open}
          onCancel={() => onOpenChange(false)}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
