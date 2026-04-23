"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, Milestone, Task } from "@/lib/types/domain";
import type { OkrObjectiveLink, OkrKrLink } from "@/lib/types/pm-hierarchy";
import {
  FolderKanban,
  Target,
  Calendar,
  LayoutDashboard,
  Flag,
  CheckSquare,
  BookOpen,
  Paperclip,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  X,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  User,
  Kanban,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isBefore, startOfDay, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import {
  ProjectStatusBadge,
  ProjectHealthBadge,
  PriorityBadge,
  MilestoneStatusBadge,
} from "./project-badges";
import type { OkrObjective, OkrKeyResult } from "@/lib/types/domain";
import { EditProjectDialog } from "./edit-project-dialog";
import { EntityQuickViewEyeButton } from "@/components/entity-quick-view-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubPayload {
  project: Project;
  milestones: Milestone[];
  objectives: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    keyResults: Array<{
      id: string;
      title: string;
      currentValue: number;
      targetValue: number;
      startValue: number;
      unit?: string | null;
      status: string;
      confidence?: number | null;
    }>;
  }>;
  stats: { taskCount: number; milestoneCount: number; openMilestones: number };
  linkedPages: Array<{ id: string; title: string; isFolder: boolean }>;
  linkedAssets: Array<{ id: string; filename: string; mimeType: string; sizeBytes: number }>;
  recentTasks: Task[];
}

interface MilestoneWithStats extends Milestone {
  taskStats?: { total: number; done: number };
}

interface OkrLinksPayload {
  objectiveLinks: OkrObjectiveLink[];
  krLinks: OkrKrLink[];
}

interface ProjectDetailViewProps {
  paramsPromise: Promise<{ projectId: string }>;
}

type MemberRow = { id: string; name: string; email: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isOverdue(dateStr: string | null | undefined, completedAt?: string | null) {
  if (!dateStr || completedAt) return false;
  return isBefore(startOfDay(new Date(dateStr)), startOfDay(new Date()));
}

// ─── Create Milestone Dialog ──────────────────────────────────────────────────

function CreateMilestoneDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState("medium");

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar milestone");
      return res.json();
    },
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setTitle("");
      setDueDate("");
      setStatus("pending");
      setPriority("medium");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo milestone</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            createMutation.mutate({
              title: title.trim(),
              status,
              priority,
              dueDate: dueDate || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Landing page publicada"
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
                <option value="missed">Atrasado</option>
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando…
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── OKR Links Tab ────────────────────────────────────────────────────────────

function OkrLinksTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [objSearch, setObjSearch] = useState("");
  const [krSearch, setKrSearch] = useState("");
  const [relationType, setRelationType] = useState("contributes_to");

  const { data: linksRes, isLoading: linksLoading } = useQuery<{ data: OkrLinksPayload }>({
    queryKey: ["project-okr-links", projectId],
    queryFn: () => fetch(`/api/projects/${projectId}/okr-links`).then((r) => r.json()),
  });

  const { data: objectivesRes } = useQuery<{ data: OkrObjective[] }>({
    queryKey: ["okr-objectives"],
    queryFn: () => fetch("/api/okr/objectives").then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: krsRes } = useQuery<{ data: OkrKeyResult[] }>({
    queryKey: ["okr-key-results-all"],
    queryFn: () => fetch("/api/okr/key-results").then((r) => r.json()),
    staleTime: 2 * 60 * 1000,
  });

  const addLinkMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectId}/okr-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao vincular");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-okr-links", projectId] }),
  });

  const removeLinkMutation = useMutation({
    mutationFn: async ({ linkId, type }: { linkId: string; type: "objective" | "kr" }) => {
      await fetch(`/api/projects/${projectId}/okr-links/${linkId}?type=${type}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-okr-links", projectId] }),
  });

  const links = linksRes?.data;
  const allObjectives = objectivesRes?.data ?? [];
  const allKrs = krsRes?.data ?? [];
  const linkedObjIds = new Set(links?.objectiveLinks.map((l) => l.okrObjectiveId) ?? []);
  const linkedKrIds = new Set(links?.krLinks.map((l) => l.okrKrId) ?? []);

  const filteredObjectives = allObjectives.filter(
    (o) =>
      !linkedObjIds.has(o.id) &&
      (objSearch ? o.title.toLowerCase().includes(objSearch.toLowerCase()) : true),
  );
  const filteredKrs = allKrs.filter(
    (k) =>
      !linkedKrIds.has(k.id) &&
      (krSearch ? k.title.toLowerCase().includes(krSearch.toLowerCase()) : true),
  );

  if (linksLoading)
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary/80" />
          <h3 className="text-sm font-semibold text-foreground">Objectives relacionados</h3>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/60">
            {links?.objectiveLinks.length ?? 0}
          </span>
        </div>
        {(links?.objectiveLinks ?? []).length > 0 && (
          <div className="mb-4 space-y-2">
            {links!.objectiveLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Target className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <Link
                    href={`/okr/objectives/${link.okrObjectiveId}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary"
                  >
                    {link.objective.title}
                  </Link>
                </div>
                <button
                  onClick={() => removeLinkMutation.mutate({ linkId: link.id, type: "objective" })}
                  className="ml-2 shrink-0 text-muted-foreground/40 transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {filteredObjectives.length > 0 && (
          <div>
            <Input
              className="mb-2 h-8 text-sm"
              placeholder="Buscar objective para vincular…"
              value={objSearch}
              onChange={(e) => setObjSearch(e.target.value)}
            />
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1">
              {filteredObjectives.slice(0, 8).map((obj) => (
                <button
                  key={obj.id}
                  onClick={() =>
                    addLinkMutation.mutate({ type: "objective", okrObjectiveId: obj.id })
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{obj.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {(links?.objectiveLinks ?? []).length === 0 && filteredObjectives.length === 0 && (
          <p className="rounded-xl border border-dashed py-4 text-center text-sm text-muted-foreground">
            {allObjectives.length === 0
              ? "Nenhum objective criado no OKR Manager."
              : "Todos os objectives já estão vinculados."}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600/80" />
          <h3 className="text-sm font-semibold text-foreground">
            Key Results que este projeto apoia
          </h3>
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/60">
            {links?.krLinks.length ?? 0}
          </span>
        </div>
        {(links?.krLinks ?? []).length > 0 && (
          <div className="mb-4 space-y-2">
            {links!.krLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600/60" />
                  <div className="min-w-0">
                    <Link
                      href={`/okr/key-results/${link.okrKrId}`}
                      className="block truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {link.keyResult.title}
                    </Link>
                    <span className="text-[10px] text-muted-foreground/60">
                      {link.relationType.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeLinkMutation.mutate({ linkId: link.id, type: "kr" })}
                  className="ml-2 shrink-0 text-muted-foreground/40 transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {filteredKrs.length > 0 && (
          <div>
            <div className="mb-2 flex gap-2">
              <Input
                className="h-8 flex-1 text-sm"
                placeholder="Buscar key result…"
                value={krSearch}
                onChange={(e) => setKrSearch(e.target.value)}
              />
              <select
                className="h-8 shrink-0 rounded-md border border-input bg-background px-2.5 text-sm"
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
              >
                <option value="contributes_to">Contribui para</option>
                <option value="supports">Apoia</option>
                <option value="indirect">Indireto</option>
              </select>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1">
              {filteredKrs.slice(0, 8).map((kr) => (
                <button
                  key={kr.id}
                  onClick={() =>
                    addLinkMutation.mutate({ type: "kr", okrKrId: kr.id, relationType })
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="truncate">{kr.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {(links?.krLinks ?? []).length === 0 && filteredKrs.length === 0 && (
          <p className="rounded-xl border border-dashed py-4 text-center text-sm text-muted-foreground">
            {allKrs.length === 0
              ? "Nenhum key result criado no OKR Manager."
              : "Todos os KRs já estão vinculados."}
          </p>
        )}
      </section>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function ProjectDetailView({ paramsPromise }: ProjectDetailViewProps) {
  const { projectId } = use(paramsPromise);
  const queryClient = useQueryClient();
  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery<{ data: HubPayload }>({
    queryKey: ["project-hub", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/hub`);
      const json = (await res.json()) as { data?: HubPayload; error?: { message?: string } };
      if (!res.ok) throw new Error(json.error?.message ?? `Erro ${res.status}`);
      if (!json.data) throw new Error("Resposta inválida do servidor");
      return { data: json.data };
    },
    enabled: !!projectId,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const membersMap = new Map((membersRes?.data ?? []).map((m) => [m.id, m]));

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] }),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] }),
  });

  const patchMilestoneMutation = useMutation({
    mutationFn: async ({
      milestoneId,
      body,
    }: {
      milestoneId: string;
      body: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Falha ao atualizar milestone");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] }),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl animate-pulse space-y-6">
        <div className="h-9 w-1/2 rounded bg-muted" />
        <div className="h-10 w-full max-w-md rounded bg-muted" />
        <div className="h-48 rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar o projeto."}
        </p>
        <Link href="/projects/list">
          <Button variant="outline" className="mt-4">
            Voltar para projetos
          </Button>
        </Link>
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Projeto não encontrado.</p>
        <Link href="/projects/list">
          <Button variant="outline" className="mt-4">
            Voltar para projetos
          </Button>
        </Link>
      </div>
    );
  }

  const { project, milestones, objectives, stats, linkedPages, linkedAssets, recentTasks } =
    data.data;

  const today = new Date().toISOString().split("T")[0]!;
  const completedTasks = recentTasks.filter((t) => !!t.completedAt).length;
  const overdueTasks = recentTasks.filter(
    (t) => t.dueDate && t.dueDate < today && !t.completedAt,
  ).length;
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const overdueMilestones = milestones.filter(
    (m) => m.dueDate && m.dueDate < today && m.status !== "completed",
  ).length;
  const owner = project.ownerUserId ? membersMap.get(project.ownerUserId) : null;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <Link
        href="/projects/list"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Projetos
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {project.title}
            </h1>
            {project.externalRef && (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Ref: {project.externalRef}
              </p>
            )}
            {project.summary && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {project.summary}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              {project.healthStatus && <ProjectHealthBadge health={project.healthStatus} />}
              <PriorityBadge priority={project.priority} />
              {owner && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {owner.name}
                </span>
              )}
              {project.startDate && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Início {format(new Date(project.startDate), "dd MMM yyyy", { locale: ptBR })}
                </span>
              )}
              {project.targetDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    isOverdue(project.targetDate, project.completedAt)
                      ? "font-medium text-red-500"
                      : "text-muted-foreground",
                  )}
                >
                  <Target className="h-3 w-3" />
                  Prazo {format(new Date(project.targetDate), "dd MMM yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditProjectOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar projeto
          </Button>
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            value={project.status}
            onChange={(e) => patchMutation.mutate({ status: e.target.value })}
          >
            <option value="planned">Planejado</option>
            <option value="active">Ativo</option>
            <option value="on_hold">Em espera</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
            value={project.healthStatus ?? ""}
            onChange={(e) => patchMutation.mutate({ healthStatus: e.target.value || null })}
          >
            <option value="">Health: —</option>
            <option value="on_track">No rumo</option>
            <option value="at_risk">Em risco</option>
            <option value="blocked">Bloqueado</option>
            <option value="off_track">Fora do rumo</option>
          </select>
        </div>
      </div>

      {/* Progress bar */}
      {(project.progressPercent ?? 0) > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso manual</span>
            <span className="tabular-nums">{Math.round(project.progressPercent ?? 0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${Math.min(100, project.progressPercent ?? 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Alerts */}
      {overdueMilestones > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {overdueMilestones} marco{overdueMilestones > 1 ? "s" : ""} com prazo vencido neste
          projeto.
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            Milestones
            <span className="ml-0.5 rounded-md bg-muted px-1.5 py-0 text-[10px] tabular-nums">
              {stats.milestoneCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks
            <span className="ml-0.5 rounded-md bg-muted px-1.5 py-0 text-[10px] tabular-nums">
              {stats.taskCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="okr" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            OKR Links
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Assets
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 pt-2">
          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tasks
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.taskCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {completedTasks} concluída{completedTasks !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Milestones
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{stats.milestoneCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {completedMilestones} concluído{completedMilestones !== 1 ? "s" : ""} ·{" "}
                {stats.openMilestones} em aberto
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border p-4",
                overdueTasks > 0 ? "border-red-200 bg-red-50/40" : "border-border bg-card/40",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tasks atrasadas
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold tabular-nums",
                  overdueTasks > 0 ? "text-red-600" : "",
                )}
              >
                {overdueTasks}
              </p>
              {overdueTasks > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-500/80">
                  <AlertCircle className="h-3 w-3" />
                  Ação necessária
                </p>
              )}
            </div>
            <div
              className={cn(
                "rounded-xl border p-4",
                overdueMilestones > 0
                  ? "border-orange-200 bg-orange-50/40"
                  : "border-border bg-card/40",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Marcos atrasados
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold tabular-nums",
                  overdueMilestones > 0 ? "text-orange-600" : "",
                )}
              >
                {overdueMilestones}
              </p>
              {overdueMilestones > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-orange-500/80">
                  <AlertTriangle className="h-3 w-3" />
                  Verifique os marcos
                </p>
              )}
            </div>
          </div>

          {/* Milestones progress */}
          {milestones.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Marcos do projeto</h2>
                <span className="text-xs text-muted-foreground">
                  {completedMilestones}/{milestones.length} concluídos
                </span>
              </div>
              <div className="space-y-2">
                {milestones.slice(0, 6).map((m) => {
                  const milestoneOverdue = isOverdue(m.dueDate);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                        milestoneOverdue && m.status !== "completed"
                          ? "border-orange-200 bg-orange-50/30"
                          : "border-border/80",
                      )}
                    >
                      <Flag
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          m.status === "completed" ? "text-emerald-500" : "text-amber-500/70",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 truncate text-sm",
                          m.status === "completed"
                            ? "text-muted-foreground line-through"
                            : "font-medium text-foreground",
                        )}
                      >
                        {m.title}
                      </span>
                      {m.externalRef && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {m.externalRef}
                        </span>
                      )}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <MilestoneStatusBadge status={m.status} />
                        {m.dueDate && (
                          <span
                            className={cn(
                              "text-[11px] tabular-nums",
                              milestoneOverdue && m.status !== "completed"
                                ? "font-medium text-orange-600"
                                : "text-muted-foreground",
                            )}
                          >
                            {format(new Date(m.dueDate), "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent tasks */}
          {recentTasks.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Tasks recentes</h2>
                <Link
                  href={`/tasks?projectId=${projectId}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Ver todas <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {recentTasks.slice(0, 6).map((t) => {
                  const taskOverdue = isOverdue(t.dueDate, t.completedAt ?? undefined);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/20"
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          t.completedAt
                            ? "bg-emerald-500"
                            : taskOverdue
                              ? "bg-red-400"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <span
                        className={cn(
                          "flex-1 truncate text-sm",
                          t.completedAt ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {t.title}
                      </span>
                      {t.externalRef && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          Ref: {t.externalRef}
                        </span>
                      )}
                      <PriorityBadge priority={t.priority} />
                      {t.dueDate && (
                        <span
                          className={cn(
                            "shrink-0 text-[11px] tabular-nums",
                            taskOverdue ? "font-medium text-red-500" : "text-muted-foreground",
                          )}
                        >
                          {format(new Date(t.dueDate), "dd MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {milestones.length === 0 && recentTasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <FolderKanban className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="mb-1 text-sm font-medium text-foreground">Projeto ainda vazio</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Crie milestones e tasks para estruturar a execução.
              </p>
              <Button size="sm" onClick={() => setCreateMilestoneOpen(true)}>
                <Flag className="h-3.5 w-3.5" /> Criar primeiro milestone
              </Button>
            </div>
          )}
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="milestones" className="pt-2">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setCreateMilestoneOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Novo milestone
            </Button>
          </div>
          {milestones.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <Flag className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum milestone ainda.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCreateMilestoneOpen(true)}
              >
                Criar primeiro milestone
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid hidden grid-cols-[1fr_90px_80px_80px_90px_80px_72px] gap-0 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:grid">
                <span>Milestone</span>
                <span>Status</span>
                <span>Prioridade</span>
                <span>Prazo</span>
                <span>Tasks</span>
                <span>Owner</span>
                <span className="text-center">Ver</span>
              </div>
              {(milestones as MilestoneWithStats[]).map((m) => {
                const msOverdue = isOverdue(m.dueDate, m.completedAt ?? undefined);
                const owner = m.ownerUserId ? membersMap.get(m.ownerUserId) : null;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col border-b border-border/60 px-4 py-3 last:border-b-0 sm:grid sm:grid-cols-[1fr_90px_80px_80px_90px_80px_72px] sm:gap-0",
                      msOverdue && m.status !== "completed"
                        ? "bg-orange-50/30"
                        : "hover:bg-accent/10",
                    )}
                  >
                    <div className="mb-2 flex min-w-0 items-center gap-2 sm:mb-0">
                      <Flag
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          m.status === "completed" ? "text-emerald-500" : "text-amber-500/70",
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          m.status === "completed" && "text-muted-foreground line-through",
                        )}
                      >
                        {m.title}
                      </span>
                      {m.externalRef && (
                        <span className="ml-1 shrink-0 font-mono text-[10px] text-muted-foreground">
                          {m.externalRef}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:block">
                      <select
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                        value={m.status}
                        onChange={(e) =>
                          patchMilestoneMutation.mutate({
                            milestoneId: m.id,
                            body: { status: e.target.value },
                          })
                        }
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">Em progresso</option>
                        <option value="completed">Concluído</option>
                        <option value="missed">Atrasado</option>
                      </select>
                    </div>
                    <div className="hidden items-center sm:flex">
                      <PriorityBadge
                        priority={(m as Milestone & { priority: string }).priority ?? "medium"}
                      />
                    </div>
                    <div className="hidden items-center sm:flex">
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          msOverdue && m.status !== "completed"
                            ? "font-medium text-orange-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {m.dueDate
                          ? format(new Date(m.dueDate), "dd MMM yyyy", { locale: ptBR })
                          : "—"}
                      </span>
                    </div>
                    <div className="hidden items-center text-xs tabular-nums text-muted-foreground sm:flex">
                      {m.taskStats ? `${m.taskStats.done}/${m.taskStats.total}` : "—"}
                    </div>
                    <div className="hidden items-center truncate text-xs text-muted-foreground sm:flex">
                      {owner ? owner.name.split(" ")[0] : "—"}
                    </div>
                    <div className="hidden items-center justify-center gap-1 sm:flex">
                      <EntityQuickViewEyeButton
                        entity={{ kind: "milestone", projectId, milestoneId: m.id }}
                        className="h-7 w-7"
                      />
                      <button
                        onClick={() => {
                          if (confirm("Remover este milestone?"))
                            deleteMilestoneMutation.mutate(m.id);
                        }}
                        className="text-muted-foreground/40 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <CreateMilestoneDialog
            projectId={projectId}
            open={createMilestoneOpen}
            onOpenChange={setCreateMilestoneOpen}
            onCreated={() =>
              queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] })
            }
          />
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="pt-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {stats.taskCount} task{stats.taskCount !== 1 ? "s" : ""} neste projeto
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/tasks?projectId=${projectId}`}>
                  <Kanban className="h-3.5 w-3.5" />
                  Abrir no board
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
          {recentTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <CheckSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa vinculada a este projeto.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href={`/tasks?projectId=${projectId}`}>Criar task no board</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="hidden grid-cols-[1fr_80px_80px_90px_90px_56px] border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:grid">
                <span>Título</span>
                <span>Prioridade</span>
                <span>Status</span>
                <span>Responsável</span>
                <span>Prazo</span>
                <span className="text-center">Ver</span>
              </div>
              {recentTasks.map((t) => {
                const taskOverdue = isOverdue(t.dueDate, t.completedAt ?? undefined);
                const assignee = t.assigneeUserId ? membersMap.get(t.assigneeUserId) : null;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:grid sm:grid-cols-[1fr_80px_80px_90px_90px_56px]",
                      "transition-colors hover:bg-accent/10",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          t.completedAt
                            ? "bg-emerald-500"
                            : taskOverdue
                              ? "bg-red-400"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-sm",
                          t.completedAt
                            ? "text-muted-foreground line-through"
                            : "font-medium text-foreground",
                        )}
                      >
                        {t.title}
                      </span>
                      {t.externalRef && (
                        <span className="ml-1 shrink-0 font-mono text-[10px] text-muted-foreground">
                          Ref: {t.externalRef}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="hidden text-xs text-muted-foreground sm:block">
                      {t.completedAt ? "Concluída" : taskOverdue ? "Atrasada" : "Em aberto"}
                    </div>
                    <div className="hidden truncate text-xs text-muted-foreground sm:block">
                      {assignee ? assignee.name.split(" ")[0] : "—"}
                    </div>
                    <div
                      className={cn(
                        "hidden text-xs tabular-nums sm:block",
                        taskOverdue ? "font-medium text-red-500" : "text-muted-foreground",
                      )}
                    >
                      {t.dueDate ? format(new Date(t.dueDate), "dd MMM yy", { locale: ptBR }) : "—"}
                    </div>
                    <div className="hidden items-center justify-center sm:flex">
                      <EntityQuickViewEyeButton
                        entity={{ kind: "task", id: t.id }}
                        className="h-7 w-7"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* OKR LINKS */}
        <TabsContent value="okr" className="pt-2">
          <OkrLinksTab projectId={projectId} />
        </TabsContent>

        {/* KNOWLEDGE */}
        <TabsContent value="knowledge" className="pt-2">
          {linkedPages.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nenhuma página vinculada.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card/30">
              {linkedPages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/knowledge/${p.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent/40"
                  >
                    <span className="font-medium text-foreground">{p.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.isFolder ? "Pasta" : "Página"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ASSETS */}
        <TabsContent value="assets" className="pt-2">
          {linkedAssets.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Nenhum arquivo anexado.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Arquivo</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Tamanho</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedAssets.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 hover:bg-accent/20">
                      <td className="px-4 py-2.5 font-medium">{a.filename}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.mimeType}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        {formatBytes(a.sizeBytes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateMilestoneDialog
        projectId={projectId}
        open={createMilestoneOpen}
        onOpenChange={setCreateMilestoneOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["project-hub", projectId] })}
      />
      <EditProjectDialog
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        project={project}
      />
    </div>
  );
}
