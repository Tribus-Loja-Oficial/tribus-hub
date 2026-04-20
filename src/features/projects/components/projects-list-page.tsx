"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FolderKanban,
  Search,
  List,
  LayoutGrid,
  Calendar,
  ChevronRight,
  Loader2,
  GitBranch,
  SlidersHorizontal,
  ChevronsUpDown,
  ChevronsDownUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@/lib/db/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProjectHealthBadge, ProjectStatusBadge, PriorityBadge } from "./project-badges";
import { ProjectHierarchyView } from "./project-hierarchy-view";
import { cn } from "@/lib/utils/cn";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "planned", label: "Planejado" },
  { value: "active", label: "Ativo" },
  { value: "on_hold", label: "Em espera" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

const HEALTH_OPTIONS = [
  { value: "", label: "Qualquer health" },
  { value: "on_track", label: "No rumo" },
  { value: "at_risk", label: "Em risco" },
  { value: "blocked", label: "Bloqueado" },
  { value: "off_track", label: "Fora do rumo" },
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
  { value: "status", label: "Status" },
];

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<string, number> = {
  active: 0,
  on_hold: 1,
  planned: 2,
  completed: 3,
  cancelled: 4,
};

const BOARD_COLUMNS = [
  { key: "planned", label: "Planejado" },
  { key: "active", label: "Ativo" },
  { key: "on_hold", label: "Em espera" },
  { key: "completed", label: "Concluído" },
  { key: "cancelled", label: "Cancelado" },
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
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

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
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Breve descrição do projeto"
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
                <option value="planned">Planejado</option>
                <option value="active">Ativo</option>
                <option value="on_hold">Em espera</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
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

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <FolderKanban className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="mb-1 text-sm font-medium text-foreground">Nenhum projeto encontrado</p>
        <p className="text-xs text-muted-foreground">Ajuste os filtros ou crie um novo projeto.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="hidden items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sm:flex">
        <span className="flex-1">Projeto</span>
        <span className="w-[90px] shrink-0">Status</span>
        <span className="w-[80px] shrink-0">Health</span>
        <span className="w-[80px] shrink-0">Prioridade</span>
        <span className="w-[70px] shrink-0">Progresso</span>
        <span className="w-[90px] shrink-0">Prazo alvo</span>
        <span className="w-6 shrink-0" />
      </div>
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="flex items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/20"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{project.title}</p>
            {project.summary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.summary}</p>
            )}
          </div>
          <div className="hidden w-[90px] shrink-0 sm:block">
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="hidden w-[80px] shrink-0 sm:block">
            {project.healthStatus ? (
              <ProjectHealthBadge health={project.healthStatus} />
            ) : (
              <span className="text-xs text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="hidden w-[80px] shrink-0 sm:block">
            <PriorityBadge priority={project.priority} />
          </div>
          <div className="hidden w-[70px] shrink-0 md:block">
            {(project.progressPercent ?? 0) > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/60"
                    style={{ width: `${Math.min(100, project.progressPercent ?? 0)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(project.progressPercent ?? 0)}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/40">—</span>
            )}
          </div>
          <div className="hidden w-[90px] shrink-0 text-xs text-muted-foreground sm:block">
            {project.targetDate
              ? format(new Date(project.targetDate), "dd MMM yy", { locale: ptBR })
              : "—"}
          </div>
          <div className="flex w-6 shrink-0 justify-end">
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Board View ────────────────────────────────────────────────────────────────

function BoardView({ projects }: { projects: Project[] }) {
  const grouped = BOARD_COLUMNS.map((col) => ({
    ...col,
    items: projects.filter((p) => p.status === col.key),
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
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {project.title}
                </p>
                {project.summary && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {project.summary}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PriorityBadge priority={project.priority} />
                  {project.healthStatus && <ProjectHealthBadge health={project.healthStatus} />}
                </div>
                {project.targetDate && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(project.targetDate), "dd MMM yy", { locale: ptBR })}
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

type ViewMode = "hierarchy" | "list" | "board";

export function ProjectsListPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("hierarchy");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterHealth, setFilterHealth] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");
    const health = searchParams.get("health");
    const priority = searchParams.get("priority");
    if (status) setFilterStatus(status);
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

  const projects = data?.data ?? [];

  const filtered = projects
    .filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterPriority && p.priority !== filterPriority) return false;
      if (filterHealth && p.healthStatus !== filterHealth) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "priority")
        return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
      if (sortBy === "status")
        return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
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
        <p>Gerencie todos os projetos do workspace com filtros, hierarquia e visão em board.</p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "a visão Hierarquia mostra projetos → milestones → tasks de forma expandível;",
              "a visão Board agrupa projetos por status em colunas;",
              "use os filtros de status, prioridade e saúde para encontrar projetos específicos;",
              "clique em um projeto para ver seus detalhes completos.",
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
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
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
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
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
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
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
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {(filterStatus || filterPriority || filterHealth || search) && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setFilterStatus("");
                  setFilterPriority("");
                  setFilterHealth("");
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
          allExpanded={allExpanded}
        />
      ) : view === "list" ? (
        <ListView projects={filtered} />
      ) : (
        <BoardView projects={filtered} />
      )}

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-hierarchy"] });
        }}
      />
    </div>
  );
}
