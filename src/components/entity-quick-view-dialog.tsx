"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export type QuickViewEntity =
  | { kind: "objective"; id: string }
  | { kind: "keyResult"; id: string }
  | { kind: "project"; id: string }
  | { kind: "milestone"; projectId: string; milestoneId: string }
  | { kind: "task"; id: string };

function entityQueryKey(e: QuickViewEntity) {
  switch (e.kind) {
    case "objective":
      return ["quick-view", "objective", e.id] as const;
    case "keyResult":
      return ["quick-view", "keyResult", e.id] as const;
    case "project":
      return ["quick-view", "project", e.id] as const;
    case "milestone":
      return ["quick-view", "milestone", e.projectId, e.milestoneId] as const;
    case "task":
      return ["quick-view", "task", e.id] as const;
  }
}

function fetchUrl(e: QuickViewEntity): string {
  switch (e.kind) {
    case "objective":
      return `/api/okr/objectives/${encodeURIComponent(e.id)}`;
    case "keyResult":
      return `/api/okr/key-results/${encodeURIComponent(e.id)}`;
    case "project":
      return `/api/projects/${encodeURIComponent(e.id)}`;
    case "milestone":
      return `/api/projects/${encodeURIComponent(e.projectId)}/milestones/${encodeURIComponent(e.milestoneId)}`;
    case "task":
      return `/api/tasks/${encodeURIComponent(e.id)}`;
  }
}

export function entityDetailHref(e: QuickViewEntity): string {
  switch (e.kind) {
    case "objective":
      return `/okr/objectives/${encodeURIComponent(e.id)}`;
    case "keyResult":
      return `/okr/key-results/${encodeURIComponent(e.id)}`;
    case "project":
      return `/projects/${encodeURIComponent(e.id)}`;
    case "milestone":
      return `/projects/${encodeURIComponent(e.projectId)}/milestones/${encodeURIComponent(e.milestoneId)}`;
    case "task":
      return `/tasks/${encodeURIComponent(e.id)}`;
  }
}

function dialogTitle(e: QuickViewEntity): string {
  switch (e.kind) {
    case "objective":
      return "Objetivo OKR";
    case "keyResult":
      return "Key result";
    case "project":
      return "Projeto";
    case "milestone":
      return "Milestone";
    case "task":
      return "Task";
  }
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && value.length >= 10) {
      try {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) return d.toLocaleString("pt-BR");
      } catch {
        /* fallthrough */
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((v) => typeof v === "object" && v !== null && "title" in (v as object))) {
      return (value as { title?: string }[])
        .map((v) => v.title ?? "—")
        .filter(Boolean)
        .join("; ");
    }
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function DetailBody({ data }: { data: Record<string, unknown> }) {
  const title = (data.title as string) || (data.name as string) || "Detalhes";
  const description =
    (data.descriptionText as string | undefined) ??
    (data.description as string | undefined) ??
    (typeof data.summary === "string" ? data.summary : undefined);

  const skip = new Set([
    "keyResults",
    "descriptionJson",
    "descriptionText",
    "description",
    "summary",
    "title",
    "name",
  ]);

  const entries = Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {Array.isArray(data.keyResults) && data.keyResults.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key results ({(data.keyResults as unknown[]).length})
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
            {(data.keyResults as { title?: string; id?: string }[]).map((kr) => (
              <li key={kr.id ?? kr.title}>
                {kr.title ?? kr.id}
                {kr.id ? (
                  <Link
                    href={`/okr/key-results/${encodeURIComponent(String(kr.id))}`}
                    className="ml-1 text-xs text-primary hover:underline"
                  >
                    abrir
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="max-h-[min(52vh,22rem)] overflow-y-auto rounded-lg border border-border/60 bg-muted/20 p-3">
        <dl className="space-y-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-1 sm:grid-cols-[minmax(0,34%)_1fr] sm:gap-3">
              <dt className="break-words text-muted-foreground">{humanizeKey(key)}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs text-foreground/90">
                {formatValue(key, value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function EntityQuickViewDialog({
  entity,
  open,
  onOpenChange,
}: {
  entity: QuickViewEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: entity ? entityQueryKey(entity) : ["quick-view", "idle"],
    queryFn: async () => {
      if (!entity) return null;
      const res = await fetch(fetchUrl(entity));
      const json = (await res.json()) as { data?: unknown; error?: { message?: string } };
      if (!res.ok) throw new Error(json.error?.message ?? `Erro ${res.status}`);
      if (!json.data || typeof json.data !== "object")
        throw new Error("Resposta inválida do servidor");
      return json.data as Record<string, unknown>;
    },
    enabled: open && !!entity,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entity ? dialogTitle(entity) : "Detalhes"}</DialogTitle>
        </DialogHeader>
        {!entity ? null : isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">A carregar…</span>
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            {error instanceof Error ? error.message : "Não foi possível carregar."}
          </p>
        ) : data ? (
          <>
            <DetailBody data={data} />
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={entityDetailHref(entity)} onClick={() => onOpenChange(false)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Abrir página para editar
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem dados.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EntityQuickViewEyeButton({
  entity,
  className,
  title = "Ver detalhes",
}: {
  entity: QuickViewEntity;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground", className)}
        title={title}
        aria-label={title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <EntityQuickViewDialog entity={entity} open={open} onOpenChange={setOpen} />
    </>
  );
}
