"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FolderKanban,
  Search,
  LayoutGrid,
  Calendar,
  ChevronRight,
  Loader2,
  GitBranch,
  SlidersHorizontal,
  ChevronsUpDown,
  ChevronsDownUp,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  nativeSelectClassName,
  nativeSelectSmClassName,
} from "@/components/ui/form-control-classes";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OkrCycle, Project } from "@/lib/types/domain";
import { paceHealthBadgeToneSlug } from "@/lib/pace-health-display";
import { healthRowAccentClass } from "@/components/pace-health-badge";
import { WorkflowStatusRow } from "@/components/workflow-status-badge";
import {
  normalizeProjectListStatusQueryParam,
  projectWorkflowSlug,
} from "@/features/projects/lib/project-workflow-slug";
import { formatCivilDate } from "@/lib/date/civil-date";
import { ProjectHealthRow, PriorityBadge } from "./project-badges";
import { ProjectHierarchyView } from "./project-hierarchy-view";
import { EditProjectDialog } from "./edit-project-dialog";
import { EntityQuickViewEyeButton } from "@/components/entity-quick-view-dialog";
import { cn } from "@/lib/utils/cn";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "planned", label: "Planejado" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "blocked", label: "Bloqueado" },
  { value: "successful", label: "Bem Sucedido" },
  { value: "partially_successful", label: "Parcialmente Bem Sucedido" },
  { value: "failed", label: "Falhou" },
  { value: "cancelled", label: "Cancelado" },
];

const HEALTH_OPTIONS = [
  { value: "", label: "Qualquer health" },
  { value: "not_started", label: "Não Iniciado" },
  { value: "ahead", label: "Adiantado" },
  { value: "on_track", label: "No Rumo" },
  { value: "at_risk", label: "Em Risco" },
  { value: "off_track", label: "Fora do Rumo" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas as prioridades" },
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Atualizado recentemente" },
  { value: "targetDate", label: "Prazo" },
  { value: "priority", label: "Prioridade" },
  { value: "title", label: "Título" },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function projectHref(project: Project) {
  return `/projects/${encodeURIComponent(project.slug || project.id)}`;
}

const BOARD_COLUMNS = [
  { key: "planned" as const, label: "Planejado" },
  { key: "in_progress" as const, label: "Em Progresso" },
  { key: "blocked" as const, label: "Bloqueado" },
  { key: "successful" as const, label: "Bem Sucedido" },
  { key: "partially_successful" as const, label: "Parcialmente Bem Sucedido" },
  { key: "failed" as const, label: "Falhou" },
  { key: "cancelled" as const, label: "Cancelado" },
] as const;

// ─── Create Project Dialog ─────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState("medium");
  const [estimationUnit, setEstimationUnit] = useState<"hours" | "story_points">("hours");
  const [cycleId, setCycleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    enabled: open,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar projeto");
      return res.json();
    },
    onSuccess: () => {
      onCreated();
      onOpenChange(false);
      setTitle("");
      setSummary("");
      setStatus("planned");
      setPriority("medium");
      setEstimationUnit("hours");
      setCycleId("");
      setStartDate("");
      setTargetDate("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            createMutation.mutate({
              title: title.trim(),
              summary: summary.trim() || undefined,
              status,
              priority,
              estimationUnit,
              cycleId: cycleId || undefined,
              startDate: startDate || undefined,
              targetDate: targetDate || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>Nome do projeto *</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lançamento coleção verão"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Resumo <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              className="min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Breve descrição do projeto"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className={nativeSelectClassName}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="planned">Planejado</option>
                <option value="active">Em progresso</option>
                <option value="on_hold">Bloqueado</option>
                <option value="cancelled">Cancelado</option>
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
              <Label>Estimativa do projeto</Label>
              <select
                className={nativeSelectClassName}
                value={estimationUnit}
                onChange={(e) => setEstimationUnit(e.target.value as "hours" | "story_points")}
              >
                <option value="hours">Horas</option>
                <option value="story_points">Story points</option>
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
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando…
                </>
              ) : (
                "Criar projeto"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Board View ────────────────────────────────────────────────────────────────

function BoardView({
  projects,
  onEditProject,
}: {
  projects: Project[];
  onEditProject: (p: Project) => void;
}) {
  const grouped = BOARD_COLUMNS.map((col) => ({
    ...col,
    items: projects.filter((p) => projectWorkflowSlug(p) === col.key),
  }));

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {grouped.map((col) => (
        <div key={col.key} className="w-[260px] shrink-0">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {col.label}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground/60">
              {col.items.length}
            </span>
          </div>
          <div className="space-y-2">
            {col.items.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "relative rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm",
                  "border-l-[3px]",
                  healthRowAccentClass(project.healthInsight?.slug),
                )}
              >
                <div className="absolute right-2 top-2 z-[1] flex items-center gap-0.5">
                  <EntityQuickViewEyeButton
                    entity={{ kind: "project", id: project.slug || project.id }}
                    className="h-7 w-7"
                  />
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Editar projeto"
                    onClick={() => onEditProject(project)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Link href={projectHref(project)} className="block p-3 pr-[4.5rem]">
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {project.title}
                  </p>
                  {project.summary && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {project.summary}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <WorkflowStatusRow insight={project.workflowStatusInsight} />
                    <PriorityBadge priority={project.priority} />
                    <ProjectHealthRow insight={project.healthInsight} />
                  </div>
                  {project.targetDate && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Calendar className="h-3 w-3" />
                      {formatCivilDate(project.targetDate, "dd MMM yy")}
                    </p>
                  )}
                  {(project.progressPercent ?? 0) > 0 && (
                    <div className="mt-2">
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${Math.min(100, project.progressPercent ?? 0)}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-right text-[10px] tabular-nums text-muted-foreground/60">
                        {Math.round(project.progressPercent ?? 0)}%
                      </p>
                    </div>
                  )}
                </Link>
              </div>
            ))}
            {col.items.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center">
                <p className="text-xs text-muted-foreground/40">Sem projetos</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = "hierarchy" | "board";

export function ProjectsListPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [view, setView] = useState<ViewMode>("hierarchy");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterHealth, setFilterHealth] = useState("");
  const [filterCycle, setFilterCycle] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    const health = searchParams.get("health");
    const priority = searchParams.get("priority");
    if (status) setFilterStatus(normalizeProjectListStatusQueryParam(status));
    if (health) {
      setFilterHealth(health);
      setShowMoreFilters(true);
    }
    if (priority) setFilterPriority(priority);
  }, [searchParams]);

  const { data, isLoading } = useQuery<{ data: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    staleTime: 30_000,
  });
  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    staleTime: 60_000,
  });

  const projects = data?.data ?? [];

  const filtered = projects
    .filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && projectWorkflowSlug(p) !== filterStatus) return false;
      if (filterPriority && p.priority !== filterPriority) return false;
      if (filterCycle && p.cycleId !== filterCycle) return false;
      if (filterHealth) {
        const slug = p.healthInsight?.slug;
        if (!slug) return false;
        if (paceHealthBadgeToneSlug(slug) !== filterHealth) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "priority")
        return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      if (sortBy === "targetDate") {
        if (!a.targetDate && !b.targetDate) return 0;
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return a.targetDate.localeCompare(b.targetDate);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const viewButtons: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: "hierarchy", icon: <GitBranch className="h-3.5 w-3.5" />, label: "Hierarquia" },
    { key: "board", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Quadro" },
  ];

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderKanban className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">Projetos</h1>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filtered.length} projeto{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Novo projeto
        </Button>
      </div>

      <PageGuide title="Como funciona a lista de projetos?">
        <p>Gerencie os projetos do workspace pela hierarquia e pela visão de quadro.</p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "a visão Hierarquia mostra projetos → milestones → tasks de forma expandível;",
              "a visão Board agrupa projetos por status operacional e resultados finais (planejado, em progresso, bloqueado, bem sucedido, parcial, falhou, cancelado);",
              "use os filtros de status, prioridade e health para encontrar projetos específicos;",
              "use o ícone de olho para quick view e o lápis para edição.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {/* Filters + View toggle */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 w-44 pl-8 text-sm"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={nativeSelectSmClassName}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={nativeSelectSmClassName}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowMoreFilters((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
              showMoreFilters
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-input bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
          </button>

          {/* Right-side controls: expand all + view toggle */}
          <div className="ml-auto flex items-center gap-2">
            {view === "hierarchy" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setAllExpanded((v) => !v)}
              >
                {allExpanded ? (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5" /> Recolher todos
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5" /> Expandir todos
                  </>
                )}
              </Button>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              {viewButtons.map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    view === key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title={label}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* More filters row */}
        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2 pl-0.5">
            <select
              className={nativeSelectSmClassName}
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
            >
              {HEALTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={nativeSelectSmClassName}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={nativeSelectSmClassName}
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
            >
              <option value="">Todos os ciclos</option>
              {(cyclesRes?.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            {(filterStatus || filterPriority || filterHealth || filterCycle || search) && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setFilterStatus("");
                  setFilterPriority("");
                  setFilterHealth("");
                  setFilterCycle("");
                  setSearch("");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : view === "hierarchy" ? (
        <ProjectHierarchyView
          searchQuery={search}
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          filterHealth={filterHealth}
          filterCycle={filterCycle}
          allExpanded={allExpanded}
          onEditProject={(p) => setEditProject(p)}
        />
      ) : (
        <BoardView projects={filtered} onEditProject={(p) => setEditProject(p)} />
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
        }}
      />
      <EditProjectDialog
        open={!!editProject}
        onOpenChange={(open) => {
          if (!open) setEditProject(null);
        }}
        project={editProject}
      />
    </div>
  );
}
