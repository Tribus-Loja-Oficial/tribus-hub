"use client";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-slate-100 text-slate-700 border-slate-200" },
  active: { label: "Ativo", className: "bg-blue-50 text-blue-700 border-blue-200" },
  on_hold: { label: "Em espera", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  completed: { label: "Concluído", className: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700 border-red-200" },
};

const HEALTH_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  on_track: { label: "No rumo", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  at_risk: { label: "Em risco", className: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  blocked: { label: "Bloqueado", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  off_track: { label: "Fora do rumo", className: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Média", className: "bg-blue-50 text-blue-600 border-blue-100" },
  high: { label: "Alta", className: "bg-orange-50 text-orange-700 border-orange-200" },
  urgent: { label: "Urgente", className: "bg-red-50 text-red-700 border-red-200" },
};

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress: { label: "Em progresso", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Concluído", className: "bg-green-50 text-green-700 border-green-200" },
  missed: { label: "Atrasado", className: "bg-red-50 text-red-700 border-red-200" },
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function ProjectHealthBadge({ health }: { health: string }) {
  const cfg = HEALTH_CONFIG[health] ?? { label: health, className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  return (
    <Badge className={`${cfg.className} whitespace-nowrap`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: "bg-muted text-muted-foreground border-border" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function MilestoneStatusBadge({ status }: { status: string }) {
  const cfg = MILESTONE_STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
