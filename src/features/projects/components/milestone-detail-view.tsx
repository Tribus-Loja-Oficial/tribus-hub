"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Milestone } from "@/lib/types/domain";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import { MilestoneHealthRow, PriorityBadge } from "./project-badges";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MilestoneDetailViewProps {
  paramsPromise: Promise<{ projectId: string; milestoneId: string }>;
  /** Full width inside quick-view dialog (no max-w-2xl cap). */
  embedded?: boolean;
}

export function MilestoneDetailView({ paramsPromise, embedded }: MilestoneDetailViewProps) {
  const { projectId, milestoneId } = use(paramsPromise);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  const { data, isLoading, isError, error } = useQuery<{
    data: Milestone & { externalRef?: string | null };
  }>({
    queryKey: ["milestone", projectId, milestoneId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erro ao carregar milestone");
      return json;
    },
    enabled: !!projectId && !!milestoneId,
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestone", projectId, milestoneId] });
      queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      setEditOpen(false);
    },
  });

  const m = data?.data;

  if (isLoading) {
    return (
      <div className={embedded ? "w-full max-w-none space-y-4" : "max-w-2xl space-y-4"}>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !m) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Milestone não encontrado."}
        </p>
        <Link href="/projects/list">
          <Button variant="outline" className="mt-4">
            Voltar para projetos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full max-w-none space-y-6" : "max-w-2xl space-y-6"}>
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Projeto
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Flag className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{m.title}</h1>
              {m.externalRef && (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Ref: {m.externalRef}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <WorkflowStatusRow insight={m.workflowStatusInsight} />
                <MilestoneHealthRow insight={m.healthInsight} />
                <PriorityBadge priority={m.priority} />
                {m.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Prazo: {format(new Date(m.dueDate), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              {m.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {m.description}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTitle(m.title);
              setDescription(m.description ?? "");
              setStatus(m.status);
              setPriority(m.priority);
              setDueDate(m.dueDate ? String(m.dueDate).slice(0, 10) : "");
              setEditOpen(true);
            }}
          >
            Editar
          </Button>
        </div>
      </div>

      {editOpen && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold">Editar milestone</h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              mutation.mutate({
                title: title.trim(),
                description: description.trim() || undefined,
                status,
                priority,
                dueDate: dueDate || undefined,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea
                className="min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em progresso</option>
                  <option value="completed">Concluído</option>
                  <option value="missed">Perdido</option>
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
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <DateField value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!title.trim() || mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
