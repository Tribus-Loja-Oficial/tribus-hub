"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  MoreHorizontal,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Page } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

export interface PageNode extends Page {
  children: PageNode[];
}

/** Pastas ancestrais do nó `targetId` (para expandir o índice ao abrir uma página). */
function folderAncestorsOnPath(nodes: PageNode[], targetId: string): Set<string> {
  const out = new Set<string>();
  const dfs = (list: PageNode[], folderStack: string[]): boolean => {
    for (const n of list) {
      if (n.id === targetId) {
        folderStack.forEach((id) => out.add(id));
        return true;
      }
      if (n.children.length > 0) {
        const stack = n.isFolder ? [...folderStack, n.id] : folderStack;
        if (dfs(n.children, stack)) return true;
      }
    }
    return false;
  };
  dfs(nodes, []);
  return out;
}

function findNode(nodes: PageNode[], id: string): PageNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inner = findNode(n.children, id);
    if (inner) return inner;
  }
  return null;
}

function subtreeIdsIncludingSelf(n: PageNode): Set<string> {
  const s = new Set<string>();
  const walk = (x: PageNode) => {
    s.add(x.id);
    x.children.forEach(walk);
  };
  walk(n);
  return s;
}

function collectFolderIds(nodes: PageNode[], acc: Set<string>) {
  for (const n of nodes) {
    if (n.isFolder) acc.add(n.id);
    collectFolderIds(n.children, acc);
  }
}

const DROP_ROOT = "drop-root";
const dragId = (pageId: string) => `drag-${pageId}`;
/** Drop on row body → torna-se filho deste item (UUID pode conter "-", por isso usamos ":"). */
const nestDroppableId = (pageId: string) => `nest:${pageId}`;
/** Zona de inserção entre irmãos (hit invisível): insertIndex 0..n (n = quantidade de irmãos). */
const insertDroppableId = (parentPageId: string | null, insertIndex: number) =>
  `insert:${parentPageId ?? "root"}:${insertIndex}`;

function parseInsertDroppableId(
  id: string,
): { parentPageId: string | null; insertIndex: number } | null {
  if (!id.startsWith("insert:")) return null;
  const rest = id.slice("insert:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon < 0) return null;
  const parentKey = rest.slice(0, lastColon);
  const insertIndex = Number(rest.slice(lastColon + 1));
  if (!Number.isFinite(insertIndex) || insertIndex < 0) return null;
  return {
    parentPageId: parentKey === "root" ? null : parentKey,
    insertIndex,
  };
}

/** Desloca o preview para baixo/direita do cursor, liberando a área onde aparece a linha de inserção. */
const knowledgeDragOverlayOffset: Modifier = ({ transform }) => ({
  ...transform,
  x: transform.x + 16,
  y: transform.y + 20,
});

const knowledgeTreeCollision: CollisionDetection = (args) => {
  const inner = pointerWithin(args);
  if (inner.length > 0) {
    const insertHits = inner.filter((c) => String(c.id).startsWith("insert:"));
    if (insertHits.length > 0) return insertHits;
    return inner;
  }
  return closestCorners(args);
};

type KnowledgeTreeQuery = { data: PageNode[] };

function cloneNodes(nodes: PageNode[]): PageNode[] {
  return nodes.map((n) => ({ ...n, children: cloneNodes(n.children) }));
}

function detachPage(
  nodes: PageNode[],
  id: string,
): { next: PageNode[]; detached: PageNode | null } {
  let detached: PageNode | null = null;
  function walk(list: PageNode[]): PageNode[] {
    const out: PageNode[] = [];
    for (const n of list) {
      if (n.id === id) {
        detached = n;
        continue;
      }
      out.push({ ...n, children: walk(n.children) });
    }
    return out;
  }
  return { next: walk(nodes), detached };
}

function attachUnder(list: PageNode[], parentId: string | null, node: PageNode): PageNode[] {
  if (parentId === null) {
    return [...list, { ...node, parentPageId: null }];
  }
  return list.map((n) =>
    n.id === parentId
      ? { ...n, children: [...n.children, { ...node, parentPageId: parentId }] }
      : { ...n, children: attachUnder(n.children, parentId, node) },
  );
}

function optimisticReparentTree(
  tree: PageNode[],
  pageId: string,
  newParentId: string | null,
): PageNode[] {
  const base = cloneNodes(tree);
  const { next, detached } = detachPage(base, pageId);
  if (!detached) return tree;
  return attachUnder(next, newParentId, detached);
}

function optimisticReorderTree(
  tree: PageNode[],
  parentId: string | null,
  orderedIds: string[],
): PageNode[] {
  const base = cloneNodes(tree);
  const indexMap = new Map(orderedIds.map((id, i) => [id, i]));
  if (parentId === null) {
    return [...base].sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));
  }
  function walk(nodes: PageNode[]): PageNode[] {
    return nodes.map((n) => {
      if (n.id === parentId) {
        const sorted = [...n.children].sort(
          (a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0),
        );
        return { ...n, children: sorted };
      }
      return { ...n, children: walk(n.children) };
    });
  }
  return walk(base);
}

function getSiblingNodesForParent(tree: PageNode[], parentPageId: string | null): PageNode[] {
  if (parentPageId === null) return tree;
  return findNode(tree, parentPageId)?.children ?? [];
}

/**
 * insertIndex vindo da UI é o índice da "faixa" entre irmãos com n itens (0..n), incluindo o arrastado.
 * Depois de detachPage, a lista tem n-1 itens: precisa ajustar quando o pai é o mesmo.
 */
function optimisticInsertAtIndex(
  tree: PageNode[],
  pageId: string,
  newParentId: string | null,
  insertIndex: number,
): PageNode[] {
  const base = cloneNodes(tree);
  const draggedBefore = findNode(base, pageId);
  if (!draggedBefore) return tree;

  const oldParentId = draggedBefore.parentPageId ?? null;
  const oldSiblings = getSiblingNodesForParent(base, oldParentId);
  const oldIndex = oldSiblings.findIndex((n) => n.id === pageId);

  const { next, detached } = detachPage(base, pageId);
  if (!detached) return tree;
  const moved: PageNode = { ...detached, parentPageId: newParentId };

  let spliceIndex: number;
  if (oldParentId === newParentId) {
    if (oldIndex === -1) {
      spliceIndex = Math.max(0, insertIndex);
    } else if (oldIndex < insertIndex) {
      spliceIndex = insertIndex - 1;
    } else {
      spliceIndex = insertIndex;
    }
  } else {
    const under = getSiblingNodesForParent(next, newParentId);
    spliceIndex = Math.min(Math.max(0, insertIndex), under.length);
  }

  function insertAt(list: PageNode[], pid: string | null, idx: number): PageNode[] {
    if (pid === null) {
      const arr = [...list];
      const at = Math.min(Math.max(0, idx), arr.length);
      arr.splice(at, 0, moved);
      return arr;
    }
    return list.map((n) => {
      if (n.id === pid) {
        const ch = [...n.children];
        const at = Math.min(Math.max(0, idx), ch.length);
        ch.splice(at, 0, moved);
        return { ...n, children: ch };
      }
      return { ...n, children: insertAt(n.children, pid, idx) };
    });
  }

  return insertAt(next, newParentId, spliceIndex);
}

/** Invisible hit target so “mover para a raiz” still works without a visible drop strip. */
function RootDropTarget() {
  const { setNodeRef } = useDroppable({ id: DROP_ROOT });
  return <div ref={setNodeRef} className="h-2 w-full shrink-0" aria-hidden />;
}

function InsertDropZone({
  parentPageId,
  insertIndex,
  depth,
  gapBlocked,
  dragActive,
}: {
  parentPageId: string | null;
  insertIndex: number;
  depth: number;
  gapBlocked: boolean;
  dragActive: boolean;
}) {
  const id = insertDroppableId(parentPageId, insertIndex);
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: gapBlocked,
  });
  const pad = 8 + depth * 16;
  const showLine = dragActive && isOver && !gapBlocked;

  return (
    <div ref={setNodeRef} className="relative z-[1] -my-1.5 h-3 w-full shrink-0" aria-hidden>
      {showLine ? (
        <div
          className="pointer-events-none absolute right-2 top-1/2 z-[2] h-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
          style={{ left: pad }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  onOpenMenu,
  onCreateChild,
  blockedDropIds,
  dragActive,
  highlightPageId,
}: {
  node: PageNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onOpenMenu: (node: PageNode, action: "rename" | "delete") => void;
  onCreateChild: (parentId: string, asFolder: boolean) => void;
  blockedDropIds: Set<string>;
  dragActive: boolean;
  highlightPageId?: string | null;
}) {
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const pad = 8 + depth * 16;

  const dropBlocked = blockedDropIds.has(node.id);
  const { setNodeRef: setNestRef, isOver: isNestOver } = useDroppable({
    id: nestDroppableId(node.id),
    disabled: dropBlocked,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: dragId(node.id),
  });

  const childrenOpen = node.children.length > 0 && (node.isFolder ? isOpen : true);
  const rowHighlighted = highlightPageId != null && highlightPageId === node.id;

  return (
    <div className="select-none">
      <div
        ref={(el) => {
          setNestRef(el);
          setDragRef(el);
        }}
        className={cn(
          "group flex items-center gap-1 rounded-md border border-transparent pr-1 transition-colors",
          "hover:bg-accent/50",
          isNestOver && !dropBlocked && "border-primary/50 bg-primary/10 ring-1 ring-primary/25",
          rowHighlighted && "border-primary/35 bg-primary/5 ring-1 ring-primary/20",
          isDragging && "opacity-40",
        )}
        style={{ paddingLeft: pad }}
      >
        <button
          type="button"
          {...listeners}
          {...attributes}
          className={cn(
            "flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground/40",
            "cursor-grab touch-none hover:bg-muted/80 hover:text-muted-foreground active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="pointer-events-none h-3.5 w-3.5" aria-hidden />
        </button>

        {node.isFolder ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Recolher pasta" : "Expandir pasta"}
          >
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : (
              <span className="inline-block h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {node.isFolder ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-600/90" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        {node.isFolder ? (
          <Link
            href={`/knowledge/${node.id}`}
            className="min-w-0 flex-1 truncate py-1.5 text-sm font-medium text-foreground/90 hover:text-foreground"
          >
            {node.icon ? <span className="mr-1">{node.icon}</span> : null}
            {node.title}
          </Link>
        ) : (
          <Link
            href={`/knowledge/${node.id}`}
            className="min-w-0 flex-1 truncate py-1.5 text-sm text-foreground/80 hover:text-foreground"
          >
            {node.icon ? <span className="mr-1">{node.icon}</span> : null}
            {node.title}
          </Link>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:opacity-70 sm:group-hover:opacity-100"
              aria-label="Ações"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[100] min-w-[12rem] rounded-lg border border-border bg-popover p-1 shadow-lg"
              sideOffset={4}
              align="end"
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onSelect={() => {
                  setTimeout(() => onCreateChild(node.id, false), 0);
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                Nova subpágina aqui
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onSelect={() => {
                  setTimeout(() => onCreateChild(node.id, true), 0);
                }}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Nova subpasta aqui
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onSelect={() => {
                  setTimeout(() => onOpenMenu(node, "rename"), 0);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Renomear
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
                onSelect={() => {
                  setTimeout(() => onOpenMenu(node, "delete"), 0);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {childrenOpen && (
        <div className="relative ml-2.5 border-l border-border/70 pl-2">
          {node.children.map((child, i) => (
            <Fragment key={child.id}>
              <InsertDropZone
                parentPageId={node.id}
                insertIndex={i}
                depth={depth + 1}
                gapBlocked={blockedDropIds.has(node.id)}
                dragActive={dragActive}
              />
              <TreeRow
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                onOpenMenu={onOpenMenu}
                onCreateChild={onCreateChild}
                blockedDropIds={blockedDropIds}
                dragActive={dragActive}
                highlightPageId={highlightPageId}
              />
            </Fragment>
          ))}
          <InsertDropZone
            parentPageId={node.id}
            insertIndex={node.children.length}
            depth={depth + 1}
            gapBlocked={blockedDropIds.has(node.id)}
            dragActive={dragActive}
          />
        </div>
      )}
    </div>
  );
}

export type KnowledgeTreeDndVariant = "page" | "sidebar";

export type KnowledgeTreeHeaderCtx = {
  tree: PageNode[];
  isLoading: boolean;
  stats: { folders: number; pages: number };
  openCreate: (parentId: string | null, asFolder: boolean) => void;
};

export function KnowledgeTreeDnd({
  variant,
  highlightPageId = null,
  showBackLink = false,
  renderPageHeader,
  searchQuery = "",
}: {
  variant: KnowledgeTreeDndVariant;
  highlightPageId?: string | null;
  showBackLink?: boolean;
  renderPageHeader?: (ctx: KnowledgeTreeHeaderCtx) => ReactNode;
  searchQuery?: string;
}) {
  const queryClient = useQueryClient();
  const expandedInitRef = useRef(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [blockedDropIds, setBlockedDropIds] = useState<Set<string>>(new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createFolderMode, setCreateFolderMode] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Page | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data, isLoading } = useQuery<{ data: PageNode[] }>({
    queryKey: ["knowledge-tree"],
    queryFn: () => fetch("/api/knowledge/tree").then((r) => r.json()),
  });

  const tree = data?.data ?? [];

  useEffect(() => {
    if (tree.length === 0) return;
    if (variant === "sidebar") {
      if (!highlightPageId) return;
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const id of folderAncestorsOnPath(tree, highlightPageId)) next.add(id);
        return next;
      });
      return;
    }
    if (expandedInitRef.current) return;
    expandedInitRef.current = true;
    const ids = new Set<string>();
    collectFolderIds(tree, ids);
    setExpanded(ids);
  }, [tree, variant, highlightPageId]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openCreate = (parentId: string | null, asFolder: boolean) => {
    setCreateParentId(parentId);
    setCreateFolderMode(asFolder);
    setNewTitle("");
    setCreateOpen(true);
  };

  const onCreateChild = (parentId: string, asFolder: boolean) => {
    openCreate(parentId, asFolder);
    setExpanded((prev) => new Set(prev).add(parentId));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; parentPageId?: string; isFolder: boolean }) => {
      const res = await fetch("/api/knowledge/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Falha ao criar");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      setCreateOpen(false);
      setNewTitle("");
      const parent = variables.parentPageId;
      if (parent) {
        setExpanded((prev) => new Set(prev).add(parent));
      }
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, parentPageId }: { id: string; parentPageId: string | null }) => {
      const res = await fetch(`/api/knowledge/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPageId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Não foi possível mover");
      }
      return res.json();
    },
    onMutate: async ({ id, parentPageId }) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-tree"] });
      const prev = queryClient.getQueryData<KnowledgeTreeQuery>(["knowledge-tree"]);
      if (prev) {
        queryClient.setQueryData<KnowledgeTreeQuery>(["knowledge-tree"], {
          data: optimisticReparentTree(prev.data, id, parentPageId),
        });
      }
      return { prev } as { prev?: KnowledgeTreeQuery };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["knowledge-tree"], ctx.prev);
      window.alert(err instanceof Error ? err.message : "Erro ao mover");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { parentPageId: string | null; orderedIds: string[] }) => {
      const res = await fetch("/api/knowledge/pages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPageId: payload.parentPageId,
          orderedIds: payload.orderedIds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Não foi possível reordenar");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-tree"] });
      const prev = queryClient.getQueryData<KnowledgeTreeQuery>(["knowledge-tree"]);
      if (prev) {
        queryClient.setQueryData<KnowledgeTreeQuery>(["knowledge-tree"], {
          data: optimisticReorderTree(prev.data, variables.parentPageId, variables.orderedIds),
        });
      }
      return { prev } as { prev?: KnowledgeTreeQuery };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["knowledge-tree"], ctx.prev);
      window.alert(err instanceof Error ? err.message : "Erro ao reordenar");
    },
  });

  const placeAtMutation = useMutation({
    mutationFn: async (vars: {
      pageId: string;
      parentPageId: string | null;
      insertIndex: number;
      /** Pai no momento do drop (antes do otimista); não usar o cache pós-onMutate para decidir PATCH. */
      sourceParentPageId: string | null;
    }) => {
      const data = queryClient.getQueryData<KnowledgeTreeQuery>(["knowledge-tree"])?.data ?? [];
      const dragged = findNode(data, vars.pageId);
      if (!dragged) throw new Error("Item não encontrado");
      const siblingNodes =
        vars.parentPageId === null ? data : (findNode(data, vars.parentPageId)?.children ?? []);
      const newOrder = siblingNodes.map((n) => n.id);
      if (newOrder.length === 0 || !newOrder.includes(vars.pageId)) {
        throw new Error("Estado inválido para reordenar");
      }

      const needsReparent = (vars.sourceParentPageId ?? null) !== (vars.parentPageId ?? null);

      if (!needsReparent) {
        const res = await fetch("/api/knowledge/pages/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentPageId: vars.parentPageId,
            orderedIds: newOrder,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? "Não foi possível reordenar");
        }
        return res.json();
      }

      const patch = await fetch(`/api/knowledge/pages/${vars.pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPageId: vars.parentPageId }),
      });
      if (!patch.ok) {
        const body = await patch.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Não foi possível mover");
      }
      const reorder = await fetch("/api/knowledge/pages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPageId: vars.parentPageId,
          orderedIds: newOrder,
        }),
      });
      if (!reorder.ok) {
        const body = await reorder.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Não foi possível reordenar após mover");
      }
      return reorder.json();
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-tree"] });
      const prev = queryClient.getQueryData<KnowledgeTreeQuery>(["knowledge-tree"]);
      if (prev) {
        queryClient.setQueryData<KnowledgeTreeQuery>(["knowledge-tree"], {
          data: optimisticInsertAtIndex(
            prev.data,
            vars.pageId,
            vars.parentPageId,
            vars.insertIndex,
          ),
        });
      }
      return { prev } as { prev?: KnowledgeTreeQuery };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["knowledge-tree"], ctx.prev);
      window.alert(err instanceof Error ? err.message : "Erro ao posicionar");
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/knowledge/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      setRenameOpen(false);
      setRenameTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge/pages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
    },
  });

  const onOpenMenu = (node: PageNode, action: "rename" | "delete") => {
    if (action === "rename") {
      setRenameTarget(node);
      setRenameTitle(node.title);
      setRenameOpen(true);
      return;
    }
    if (
      window.confirm(
        `Excluir permanentemente "${node.title}"? Itens filhos ficam órfãos na raiz até serem reorganizados.`,
      )
    ) {
      deleteMutation.mutate(node.id);
    }
  };

  const activeDragNode = useMemo(() => {
    if (!activeDragId || tree.length === 0) return null;
    return findNode(tree, activeDragId);
  }, [activeDragId, tree]);

  const handleDragStart = (event: DragStartEvent) => {
    const raw = String(event.active.id);
    if (!raw.startsWith("drag-")) return;
    const id = raw.slice(5);
    setActiveDragId(id);
    const n = findNode(tree, id);
    setBlockedDropIds(n ? subtreeIdsIncludingSelf(n) : new Set());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setBlockedDropIds(new Set());
    const raw = String(event.active.id);
    if (!raw.startsWith("drag-")) return;
    const pageId = raw.slice(5);
    const over = event.over;
    if (!over) return;

    const dragged = findNode(tree, pageId);
    if (!dragged) return;
    const currentParent = dragged.parentPageId ?? null;

    const insertParsed = parseInsertDroppableId(String(over.id));
    if (insertParsed) {
      placeAtMutation.mutate({
        pageId,
        parentPageId: insertParsed.parentPageId,
        insertIndex: insertParsed.insertIndex,
        sourceParentPageId: currentParent,
      });
      return;
    }

    if (over.id === DROP_ROOT) {
      if (currentParent === null) return;
      moveMutation.mutate({ id: pageId, parentPageId: null });
      return;
    }

    const overStr = String(over.id);
    if (overStr.startsWith("nest:")) {
      const nestTarget = overStr.slice("nest:".length);
      if (!nestTarget || nestTarget === pageId) return;
      if (currentParent === nestTarget) {
        const ch = nestTarget === null ? tree : (findNode(tree, nestTarget)?.children ?? []);
        const ids = ch.map((c) => c.id);
        if (ids.length === 0 || ids[ids.length - 1] === pageId) return;
        const without = ids.filter((id) => id !== pageId);
        reorderMutation.mutate({
          parentPageId: nestTarget,
          orderedIds: [...without, pageId],
        });
        return;
      }
      moveMutation.mutate({ id: pageId, parentPageId: nestTarget });
    }
  };

  const stats = useMemo(() => {
    let pages = 0;
    let folders = 0;
    const walk = (nodes: PageNode[]) => {
      for (const n of nodes) {
        if (n.isFolder) folders += 1;
        else pages += 1;
        walk(n.children);
      }
    };
    walk(tree);
    return { pages, folders };
  }, [tree]);

  const isPage = variant === "page";

  // Flat list for search results
  const flatNodes = useMemo(() => {
    const result: PageNode[] = [];
    const walk = (nodes: PageNode[]) => {
      for (const n of nodes) {
        result.push(n);
        walk(n.children);
      }
    };
    walk(tree);
    return result;
  }, [tree]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return flatNodes.filter((n) => n.title.toLowerCase().includes(q));
  }, [flatNodes, searchQuery]);

  return (
    <>
      <div className="min-w-0">
        {isPage && renderPageHeader?.({ tree, isLoading, stats, openCreate })}

        {variant === "sidebar" && showBackLink && (
          <Link
            href="/knowledge"
            className="mb-2 block text-xs font-medium text-primary hover:underline"
          >
            Lista e organização
          </Link>
        )}

        {isLoading && (
          <div
            className={cn(
              "space-y-2 rounded-xl border border-border p-3",
              !isPage && "space-y-1.5 p-2",
            )}
          >
            {Array.from({ length: isPage ? 6 : 4 }).map((_, i) => (
              <div
                key={i}
                className={cn("animate-pulse rounded bg-muted/60", isPage ? "h-8" : "h-6")}
              />
            ))}
          </div>
        )}

        {!isLoading && tree.length === 0 && (
          <div
            className={cn(
              "rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center",
              isPage ? "py-16" : "py-8",
            )}
          >
            <BookOpen
              className={cn(
                "mx-auto mb-3 text-muted-foreground/40",
                isPage ? "h-10 w-10" : "h-8 w-8",
              )}
            />
            <p className="text-sm font-medium text-foreground">Nenhum conteúdo ainda</p>
            <p
              className={cn(
                "mx-auto mt-1 text-muted-foreground",
                isPage ? "max-w-sm text-xs" : "max-w-[14rem] text-[11px]",
              )}
            >
              Crie uma pasta ou página na raiz; depois use o menu de cada item para aninhar.
            </p>
            <div className={cn("flex justify-center gap-2", isPage ? "mt-5" : "mt-3")}>
              <Button size="sm" variant="outline" onClick={() => openCreate(null, true)}>
                Nova pasta
              </Button>
              <Button size="sm" onClick={() => openCreate(null, false)}>
                Nova página
              </Button>
            </div>
          </div>
        )}

        {/* Search results — flat filtered list, no DND */}
        {searchResults !== null && (
          <div className="overflow-hidden rounded-xl border border-border bg-card/30 shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="max-h-[min(70vh,560px)] overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground/60">
                  Nenhum resultado encontrado.
                </p>
              ) : (
                searchResults.map((node) => (
                  <Link
                    key={node.id}
                    href={`/knowledge/${node.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    {node.isFolder ? (
                      <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500/70" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className="truncate">
                      {node.icon ? `${node.icon} ` : ""}
                      {node.title}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {tree.length > 0 && searchResults === null && (
          <DndContext
            sensors={sensors}
            collisionDetection={knowledgeTreeCollision}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-card/30",
                isPage && "shadow-sm",
              )}
            >
              {isPage ? (
                <div className="border-b border-border bg-muted/20 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Estrutura</span>
                </div>
              ) : (
                <div className="border-b border-border bg-muted/20 px-2 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Índice</span>
                </div>
              )}
              <div
                className={cn(
                  "p-2",
                  isPage ? "max-h-[min(70vh,560px)] overflow-y-auto" : "overflow-visible",
                )}
              >
                <RootDropTarget />
                {tree.map((node, i) => (
                  <Fragment key={node.id}>
                    <InsertDropZone
                      parentPageId={null}
                      insertIndex={i}
                      depth={0}
                      gapBlocked={false}
                      dragActive={activeDragId !== null}
                    />
                    <TreeRow
                      node={node}
                      depth={0}
                      expanded={expanded}
                      toggle={toggle}
                      onOpenMenu={onOpenMenu}
                      onCreateChild={onCreateChild}
                      blockedDropIds={blockedDropIds}
                      dragActive={activeDragId !== null}
                      highlightPageId={highlightPageId}
                    />
                  </Fragment>
                ))}
                {tree.length > 0 ? (
                  <InsertDropZone
                    parentPageId={null}
                    insertIndex={tree.length}
                    depth={0}
                    gapBlocked={false}
                    dragActive={activeDragId !== null}
                  />
                ) : null}
              </div>
            </div>

            <DragOverlay dropAnimation={null} modifiers={[knowledgeDragOverlayOffset]}>
              {activeDragNode ? (
                <div className="bg-popover/92 pointer-events-none flex max-w-[min(220px,calc(100vw-2rem))] cursor-grabbing items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs shadow-md backdrop-blur-sm">
                  {activeDragNode.isFolder ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium leading-tight">
                    {activeDragNode.icon ? (
                      <span className="mr-0.5">{activeDragNode.icon}</span>
                    ) : null}
                    {activeDragNode.title}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createFolderMode ? "Nova pasta" : "Nova página"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              createMutation.mutate({
                title: newTitle.trim(),
                parentPageId: createParentId ?? undefined,
                isFolder: createFolderMode,
              });
            }}
            className="space-y-4"
          >
            {createParentId ? (
              <p className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                Será criado <strong>dentro</strong> do item pai selecionado (pasta ou página).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Criado na raiz da árvore.</p>
            )}
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={createFolderMode ? "Nome da pasta" : "Nome da página"}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!newTitle.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Criando…" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!renameTarget || !renameTitle.trim()) return;
              renameMutation.mutate({ id: renameTarget.id, title: renameTitle.trim() });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                autoFocus
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!renameTitle.trim() || renameMutation.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
