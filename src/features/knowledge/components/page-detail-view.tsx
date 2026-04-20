"use client";

import {
  use,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  FileText,
  Folder,
  ChevronRight,
  Clock,
  Hash,
  Archive,
  Copy,
  RotateCcw,
  AlignLeft,
  Info,
  Check,
} from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import type { Page, PageRevision } from "@/lib/db/schema";
import { RichEditor } from "@/components/editor/rich-editor";
import { Input } from "@/components/ui/input";
import { KnowledgeTreeDnd } from "@/features/knowledge/components/knowledge-tree-dnd";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";

interface PageDetailViewProps {
  paramsPromise: Promise<{ pageId: string }>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Outline extraction ───────────────────────────────────────────────────────

type OutlineItem = { level: number; text: string; id: string };

function extractOutline(contentJson: JSONContent | null | undefined): OutlineItem[] {
  if (!contentJson?.content) return [];
  const items: OutlineItem[] = [];
  function walk(nodes: JSONContent[]) {
    for (const node of nodes) {
      if (node.type === "heading" && node.attrs?.level && node.content) {
        const text = node.content
          .filter((n) => n.type === "text")
          .map((n) => (n as { text?: string }).text ?? "")
          .join("");
        if (text) items.push({ level: node.attrs.level as number, text, id: `h-${items.length}` });
      }
      if (node.content) walk(node.content);
    }
  }
  walk(contentJson.content);
  return items;
}

// ─── Right panel ─────────────────────────────────────────────────────────────

function PanelSection({
  icon: Icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function PageContextPanel({ page, pageId }: { page: Page; pageId: string }) {
  const [copied, setCopied] = useState(false);

  const { data: revisionsRes } = useQuery<{ data: PageRevision[] }>({
    queryKey: ["page-revisions", pageId],
    queryFn: () => fetch(`/api/knowledge/pages/${pageId}/revisions`).then((r) => r.json()),
    staleTime: 60_000,
  });
  const revisions = revisionsRes?.data ?? [];

  const outline = useMemo(
    () => extractOutline(page.contentJson as JSONContent | null),
    [page.contentJson],
  );

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STATUS_LABEL: Record<string, string> = {
    draft: "Rascunho",
    published: "Publicado",
    archived: "Arquivado",
  };
  const STATUS_COLOR: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    published: "bg-emerald-100 text-emerald-700",
    archived: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="w-full h-full py-4">

      {/* Section: outline */}
      {outline.length > 0 && (
        <PanelSection icon={AlignLeft} title="Índice" defaultOpen={true}>
          <nav className="px-3 space-y-0.5">
            {outline.map((item) => (
              <div
                key={item.id}
                className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors truncate cursor-pointer leading-relaxed"
                style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
              >
                <Hash className="h-2.5 w-2.5 inline mr-1 opacity-40" />
                {item.text}
              </div>
            ))}
          </nav>
        </PanelSection>
      )}

      {/* Properties */}
      <PanelSection icon={Info} title="Propriedades" defaultOpen={true}>
        <dl className="px-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground/60 shrink-0">Status</dt>
            <dd>
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_COLOR[page.status] ?? "bg-muted text-muted-foreground")}>
                {STATUS_LABEL[page.status] ?? page.status}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground/60 shrink-0">Criado</dt>
            <dd className="text-muted-foreground text-right truncate" title={format(new Date(page.createdAt), "dd/MM/yyyy HH:mm")}>
              {formatDistanceToNow(new Date(page.createdAt), { addSuffix: true, locale: ptBR })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground/60 shrink-0">Editado</dt>
            <dd className="text-muted-foreground text-right truncate" title={format(new Date(page.updatedAt), "dd/MM/yyyy HH:mm")}>
              {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true, locale: ptBR })}
            </dd>
          </div>
          {page.excerpt && (
            <div className="pt-1">
              <dt className="text-muted-foreground/60 mb-0.5">Resumo</dt>
              <dd className="text-muted-foreground/80 line-clamp-3 leading-relaxed">{page.excerpt}</dd>
            </div>
          )}
        </dl>
      </PanelSection>

      {/* Revisions */}
      {revisions.length > 0 && (
        <PanelSection icon={Clock} title="Revisões" defaultOpen={false}>
          <div className="px-3 space-y-1">
            {revisions.slice(0, 8).map((rev) => (
              <div key={rev.id} className="flex items-center gap-2 py-1">
                <RotateCcw className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">
                    v{rev.version}{rev.changeReason ? ` · ${rev.changeReason}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50">
                    {format(new Date(rev.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Quick actions */}
      <PanelSection icon={FileText} title="Ações" defaultOpen={true}>
        <div className="px-3 space-y-1">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "Link copiado!" : "Copiar link"}
          </button>
          <Link
            href={`/api/knowledge/pages/${pageId}/archive`}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <Archive className="h-3 w-3" />
            Arquivar página
          </Link>
        </div>
      </PanelSection>
    </div>
  );
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    onDrag(e.clientX - lastX.current);
    lastX.current = e.clientX;
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  /** Barra sempre #000 — sem tokens de tema (bg-border / primary) que mudam o contraste. */
  const barStyle: CSSProperties = {
    backgroundColor: "#000000",
    width: 3,
    minHeight: 48,
    borderRadius: 2,
  };

  return (
    <div
      className="hidden lg:flex w-3 shrink-0 cursor-col-resize items-center justify-center self-stretch touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      <div
        className="h-full max-h-[min(100%,calc(100vh-4rem))] shrink-0"
        style={barStyle}
        aria-hidden
      />
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function KnowledgeDetailShell({
  pageId,
  page,
  children,
}: {
  pageId: string;
  page?: Page;
  children: ReactNode;
}) {
  const [leftWidth, setLeftWidth] = useState(208);
  const [rightWidth, setRightWidth] = useState(256);

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:items-start -mr-6">
      {/* Left: tree nav */}
      <aside
        style={{ width: leftWidth }}
        className="hidden lg:block shrink-0 rounded-xl border border-border bg-card/30 p-2 sticky top-0 self-start max-h-[calc(100vh-3.25rem)] overflow-y-auto"
      >
        <KnowledgeTreeDnd variant="sidebar" highlightPageId={pageId} showBackLink />
      </aside>

      {/* Mobile left panel */}
      <aside className="lg:hidden w-full shrink-0 rounded-xl border border-border bg-card/30 p-2 max-h-48 overflow-y-auto mb-4">
        <KnowledgeTreeDnd variant="sidebar" highlightPageId={pageId} showBackLink />
      </aside>

      <ResizeHandle onDrag={(dx) => setLeftWidth((w) => Math.max(160, Math.min(400, w + dx)))} />

      {/* Center: editor */}
      <div className="min-w-0 flex-1 px-4">{children}</div>

      {/* Right: context panel — flush to screen edge */}
      {page && (
        <>
          <ResizeHandle onDrag={(dx) => setRightWidth((w) => Math.max(180, Math.min(480, w - dx)))} />
          <div className="hidden lg:block shrink-0 self-stretch" style={{ width: rightWidth }}>
            <div className="sticky top-0 h-[calc(100vh-3.25rem)] overflow-y-auto border-l border-border bg-card/50">
              <PageContextPanel page={page} pageId={pageId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PageDetailView({ paramsPromise }: PageDetailViewProps) {
  const { pageId } = use(paramsPromise);
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [localTitle, setLocalTitle] = useState("");
  const [titleInitialized, setTitleInitialized] = useState(false);

  const { data, isLoading } = useQuery<{ data: Page }>({
    queryKey: ["page", pageId],
    queryFn: () => fetch(`/api/knowledge/pages/${pageId}`).then((r) => r.json()),
    select: (res) => {
      if (!titleInitialized && res.data?.title) {
        setLocalTitle(res.data.title);
        setTitleInitialized(true);
      }
      return res;
    },
  });

  const page = data?.data;
  const isFolder = !!page?.isFolder;

  const { data: childrenRes, isLoading: childrenLoading } = useQuery<{ data: Page[] }>({
    queryKey: ["knowledge-children", pageId],
    queryFn: () => fetch(`/api/knowledge/pages?parentId=${pageId}`).then((r) => r.json()),
    enabled: !!page?.isFolder,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      title?: string;
      contentJson?: JSONContent;
      createRevision?: boolean;
    }) => {
      setSaveStatus("saving");
      const res = await fetch(`/api/knowledge/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["page", pageId] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const handleSave = useCallback(
    async (json: JSONContent) => {
      updateMutation.mutate({ contentJson: json, createRevision: false });
    },
    [updateMutation],
  );

  const handleTitleBlur = () => {
    const p = data?.data;
    if (p && localTitle !== p.title && localTitle.trim()) {
      updateMutation.mutate({ title: localTitle.trim() });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="hidden w-52 shrink-0 space-y-2 lg:block">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
        <div className="min-w-0 flex-1 max-w-[700px] space-y-4 animate-pulse">
          <div className="h-8 rounded bg-muted w-2/3" />
          <div className="h-4 rounded bg-muted w-full" />
          <div className="h-4 rounded bg-muted w-5/6" />
        </div>
        <div className="hidden lg:block w-52 space-y-2 shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  const pageData = data?.data;
  if (!pageData) return <div className="text-muted-foreground text-sm">Página não encontrada.</div>;

  if (isFolder) {
    const children = childrenRes?.data ?? [];
    return (
      <KnowledgeDetailShell pageId={pageId} page={pageData}>
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Folder className="h-3.5 w-3.5 text-amber-600/90" />
            <span className="hidden lg:inline">Pasta · use o índice ao lado para navegar</span>
            <span className="lg:hidden">Pasta · índice acima</span>
          </div>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto text-foreground"
            placeholder="Nome da pasta"
          />
          <div className="rounded-xl border border-border bg-muted/15 p-4">
            <p className="text-sm font-medium text-foreground mb-3">Conteúdo nesta pasta</p>
            {childrenLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
            {!childrenLoading && children.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma subpágina ou subpasta. Organize na{" "}
                <Link href="/knowledge" className="text-primary font-medium hover:underline">
                  lista Knowledge
                </Link>{" "}
                ou pelo menu de cada item no índice.
              </p>
            )}
            <ul className="mt-2 space-y-1">
              {children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/knowledge/${child.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    {child.isFolder ? (
                      <Folder className="h-4 w-4 shrink-0 text-amber-600/90" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{child.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </KnowledgeDetailShell>
    );
  }

  return (
    <KnowledgeDetailShell pageId={pageId} page={pageData}>
      <Input
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-6 h-auto border-none px-0 text-2xl font-bold text-foreground shadow-none focus-visible:ring-0"
        placeholder="Título da página"
      />
      <RichEditor
        content={pageData.contentJson as JSONContent | null}
        onSave={handleSave}
        saveStatus={saveStatus}
        editable
      />
    </KnowledgeDetailShell>
  );
}
