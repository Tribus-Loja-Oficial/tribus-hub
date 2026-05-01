"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { CheckSquare2, Loader2, Plus, Trash2, X, Tag } from "lucide-react";
import type { Task, TaskColumn } from "@/lib/types/domain";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { nativeSelectClassName } from "@/components/ui/form-control-classes";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectRow = { id: string; title: string; estimationUnit?: "hours" | "story_points" };
type MilestoneRow = { id: string; title: string };
type LabelRow = { id: string; name: string; colorToken: string | null };
type MemberRow = { id: string; name: string; email: string };
type TaskWithLabels = Task & { labels: Array<{ id: string; name: string }> };

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  taskId?: string | null;
  columns: TaskColumn[];
  defaultColumnId?: string | null;
  initialProjectId?: string;
  initialMilestoneId?: string;
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITIES = [
  {
    value: "low",
    label: "Baixa",
    active:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    idle: "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50",
  },
  {
    value: "medium",
    label: "Média",
    active:
      "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700",
    idle: "text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
  },
  {
    value: "high",
    label: "Alta",
    active:
      "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-700",
    idle: "text-muted-foreground hover:bg-orange-50/50 dark:hover:bg-orange-950/30",
  },
  {
    value: "urgent",
    label: "Urgente",
    active:
      "bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700",
    idle: "text-muted-foreground hover:bg-red-50/50 dark:hover:bg-red-950/30",
  },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/55">
      {children}
    </p>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground/80">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  taskId,
  columns,
  defaultColumnId,
  initialProjectId,
  initialMilestoneId,
}: TaskFormDialogProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [estimateValue, setEstimateValue] = useState("");

  // ── Queries ──
  const { data: taskRes } = useQuery<{ data: TaskWithLabels }>({
    queryKey: ["task", taskId],
    queryFn: () => fetch(`/api/tasks/${taskId}`).then((r) => r.json()),
    enabled: open && mode === "edit" && !!taskId,
  });

  const { data: projectsRes } = useQuery<{ data: ProjectRow[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    enabled: open,
  });

  const { data: labelsRes } = useQuery<{ data: LabelRow[] }>({
    queryKey: ["task-labels"],
    queryFn: () => fetch("/api/task-labels").then((r) => r.json()),
    enabled: open,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: open,
  });

  const milestoneQueryProjectId = projectId || initialProjectId || taskRes?.data?.projectId || "";

  const { data: milestonesRes, isFetching: milestonesLoading } = useQuery<{ data: MilestoneRow[] }>(
    {
      queryKey: ["milestones", milestoneQueryProjectId],
      queryFn: () =>
        fetch(`/api/projects/${milestoneQueryProjectId}/milestones`).then((r) => r.json()),
      enabled: open && !!milestoneQueryProjectId,
      staleTime: 0,
    },
  );

  // ── Reset on open ──
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setTitle("");
      setDescription("");
      setColumnId(defaultColumnId ?? columns[0]?.id ?? "");
      setProjectId(initialProjectId ?? "");
      setMilestoneId(initialMilestoneId ?? "");
      setPriority("medium");
      setDueDate("");
      setAssigneeUserId("");
      setSelectedLabelIds([]);
      setEstimateValue("");
      setTimeout(() => titleRef.current?.focus(), 50);
      return;
    }
    const t = taskRes?.data;
    if (t) {
      setTitle(t.title);
      setDescription(t.descriptionText ?? "");
      setColumnId(t.columnId);
      setProjectId(t.projectId ?? "");
      setMilestoneId(t.milestoneId ?? "");
      setPriority(t.priority);
      setDueDate(t.dueDate ? String(t.dueDate).slice(0, 10) : "");
      setAssigneeUserId(t.assigneeUserId ?? "");
      setSelectedLabelIds((t.labels ?? []).map((l) => l.id));
      const hours = typeof t.estimatedHours === "number" ? t.estimatedHours : null;
      const points = typeof t.estimatedPoints === "number" ? t.estimatedPoints : null;
      setEstimateValue(hours != null ? String(hours) : points != null ? String(points) : "");
    }
  }, [open, mode, taskRes?.data, defaultColumnId, columns, initialProjectId, initialMilestoneId]);

  // ── Mutations ──
  const createLabelMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/task-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ data: LabelRow }>;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["task-labels"] });
      setSelectedLabelIds((prev) => [...prev, res.data.id]);
      setNewLabelName("");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        columnId,
        projectId: projectId || undefined,
        milestoneId: milestoneId || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeUserId: assigneeUserId || undefined,
        descriptionText: description.trim() || undefined,
        labelIds: selectedLabelIds,
        estimatedHours:
          estimationUnit === "hours" && estimateValue.trim() !== ""
            ? Number(estimateValue)
            : undefined,
        estimatedPoints:
          estimationUnit === "story_points" && estimateValue.trim() !== ""
            ? Number(estimateValue)
            : undefined,
      };

      if (mode === "create") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("create failed");
        return res.json();
      }

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          projectId: projectId || null,
          milestoneId: milestoneId || null,
          assigneeUserId: assigneeUserId || null,
          dueDate: dueDate || null,
          descriptionText: description.trim() || null,
          estimatedHours:
            estimationUnit === "hours"
              ? estimateValue.trim() === ""
                ? null
                : Number(estimateValue)
              : null,
          estimatedPoints:
            estimationUnit === "story_points"
              ? estimateValue.trim() === ""
                ? null
                : Number(estimateValue)
              : null,
        }),
      });
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-labels"] });
      queryClient.invalidateQueries({ queryKey: ["project-hub"] });
      queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      if (taskId) queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      onOpenChange(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-hub"] });
      queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      onOpenChange(false);
    },
  });

  // ── Derived ──
  const projects = projectsRes?.data ?? [];
  const milestones = milestonesRes?.data ?? [];
  const labels = labelsRes?.data ?? [];
  const members = membersRes?.data ?? [];
  const selectedProject = projects.find((p) => p.id === projectId) ?? null;
  const estimationUnit = selectedProject?.estimationUnit ?? "hours";

  const toggleLabel = (id: string) =>
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const nextWeekStr = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const canSubmit = title.trim().length > 0 && !!columnId && !saveMutation.isPending;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {mode === "create" ? "Nova tarefa" : "Editar tarefa"}
        </DialogTitle>
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 pr-14">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CheckSquare2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight text-foreground">
              {mode === "create" ? "Nova tarefa" : "Editar tarefa"}
            </h2>
            {mode === "create" && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Crie uma nova tarefa e defina seu contexto operacional.
              </p>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* ─ Bloco 1: Conteúdo principal ─ */}
          <div>
            <SectionLabel>Conteúdo</SectionLabel>
            <div className="space-y-3">
              {/* Título */}
              <div>
                <FieldLabel required htmlFor="task-title">
                  Título
                </FieldLabel>
                <input
                  ref={titleRef}
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) saveMutation.mutate();
                  }}
                  placeholder="Ex.: atualizar fotos dos produtos em promoção"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {/* Descrição */}
              <div>
                <FieldLabel htmlFor="task-description">Descrição</FieldLabel>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique o contexto da tarefa, critérios de conclusão ou observações importantes…"
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* ─ Bloco 2: Contexto ─ */}
          <div>
            <SectionLabel>Contexto</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              {/* Projeto */}
              <div>
                <FieldLabel htmlFor="task-project">Projeto</FieldLabel>
                <select
                  id="task-project"
                  className={nativeSelectClassName}
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setMilestoneId("");
                  }}
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              {/* Milestone */}
              <div>
                <FieldLabel htmlFor="task-milestone">Milestone</FieldLabel>
                <select
                  id="task-milestone"
                  className={nativeSelectClassName}
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  disabled={!milestoneQueryProjectId}
                >
                  <option value="">
                    {!milestoneQueryProjectId
                      ? "Selecione um projeto primeiro"
                      : milestonesLoading
                        ? "Carregando milestones…"
                        : milestones.length === 0
                          ? "Nenhum milestone neste projeto"
                          : "Selecione um milestone (opcional)"}
                  </option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* ─ Bloco 3: Execução ─ */}
          <div>
            <SectionLabel>Execução</SectionLabel>
            <div className="space-y-3">
              {/* Responsável + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="task-assignee">Responsável</FieldLabel>
                  <select
                    id="task-assignee"
                    className={nativeSelectClassName}
                    value={assigneeUserId}
                    onChange={(e) => setAssigneeUserId(e.target.value)}
                  >
                    <option value="">Não atribuído</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Prioridade</FieldLabel>
                  <div className="flex gap-1">
                    {PRIORITIES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={cn(
                          "h-9 flex-1 rounded-md border text-xs font-medium transition-colors",
                          priority === opt.value
                            ? opt.active
                            : `border-input bg-background ${opt.idle}`,
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {projectId ? (
                <div>
                  <FieldLabel htmlFor="task-estimate">
                    Estimativa ({estimationUnit === "hours" ? "horas" : "story points"})
                  </FieldLabel>
                  <input
                    id="task-estimate"
                    type="number"
                    min={0}
                    step="0.5"
                    value={estimateValue}
                    onChange={(e) => setEstimateValue(e.target.value)}
                    placeholder={estimationUnit === "hours" ? "Ex.: 6" : "Ex.: 5"}
                    className={nativeSelectClassName}
                  />
                </div>
              ) : null}

              {/* Coluna + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="task-column" required>
                    Coluna inicial
                  </FieldLabel>
                  <select
                    id="task-column"
                    className={nativeSelectClassName}
                    value={columnId}
                    onChange={(e) => setColumnId(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="task-due">Vencimento</FieldLabel>
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[
                        { label: "Hoje", value: todayStr },
                        { label: "Amanhã", value: tomorrowStr },
                        { label: "7 dias", value: nextWeekStr },
                      ].map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setDueDate((v) => (v === s.value ? "" : s.value))}
                          className={cn(
                            "h-7 flex-1 rounded border text-[11px] font-medium transition-colors",
                            dueDate === s.value
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-input bg-background text-muted-foreground hover:bg-muted/50",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <DateField
                      id="task-due"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50" />

          {/* ─ Bloco 4: Etiquetas ─ */}
          <div>
            <SectionLabel>Etiquetas</SectionLabel>
            <div className="space-y-2.5">
              {/* Chips existentes */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((lab) => {
                    const selected = selectedLabelIds.includes(lab.id);
                    return (
                      <button
                        key={lab.id}
                        type="button"
                        onClick={() => toggleLabel(lab.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          selected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                        style={
                          selected && lab.colorToken
                            ? {
                                borderColor: lab.colorToken,
                                backgroundColor: `${lab.colorToken}18`,
                                color: lab.colorToken,
                              }
                            : !selected && lab.colorToken
                              ? { borderColor: `${lab.colorToken}50` }
                              : undefined
                        }
                      >
                        {selected && <X className="h-2.5 w-2.5" />}
                        {lab.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Nova etiqueta */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Criar nova etiqueta…"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        newLabelName.trim() &&
                        !createLabelMutation.isPending
                      ) {
                        e.preventDefault();
                        createLabelMutation.mutate(newLabelName.trim());
                      }
                    }}
                    className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={!newLabelName.trim() || createLabelMutation.isPending}
                  onClick={() => createLabelMutation.mutate(newLabelName.trim())}
                >
                  {createLabelMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Criar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 px-6 py-4">
          {/* Delete (edit mode only) */}
          {mode === "edit" && taskId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm("Excluir esta tarefa? Esta ação não pode ser desfeita.")) {
                  deleteMutation.mutate();
                }
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Excluir tarefa
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {mode === "create" ? "Criando…" : "Salvando…"}
                </>
              ) : mode === "create" ? (
                "Criar tarefa"
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
