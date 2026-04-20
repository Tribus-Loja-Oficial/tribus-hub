import * as pagesRepo from "@/lib/repositories/pages.repository";
import { recordAudit } from "./audit.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { slugify, uniqueSlug } from "@/lib/utils/ids";
import { extractTextFromJson, excerptFromText } from "@/lib/utils/content";
import type { AuthenticatedUser } from "@/lib/permissions";
import type { JSONContent } from "@tiptap/core";
import type { Page } from "@/lib/db/schema";

function collectDescendantPageIds(pages: Page[], rootId: string): Set<string> {
  const byParent = new Map<string | null, string[]>();
  for (const p of pages) {
    const k = p.parentPageId ?? null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(p.id);
  }
  const out = new Set<string>();
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length) {
    const cid = stack.pop()!;
    out.add(cid);
    for (const grand of byParent.get(cid) ?? []) stack.push(grand);
  }
  return out;
}

// --- Pages ---

export async function listPages(user: AuthenticatedUser, options?: { includeArchived?: boolean }) {
  return pagesRepo.findPagesByWorkspace(user.workspaceId, options);
}

export async function listPagesUnderParent(user: AuthenticatedUser, parentId: string) {
  const parent = await pagesRepo.findPageById(parentId);
  if (!parent || parent.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", parentId);
  }
  return pagesRepo.findPagesByParent(user.workspaceId, parentId, {
    includeArchived: false,
  });
}

export async function getPageTree(user: AuthenticatedUser) {
  const allPages = await pagesRepo.findPagesByWorkspace(user.workspaceId);
  return buildTree(allPages);
}

export async function getPage(user: AuthenticatedUser, id: string) {
  const page = await pagesRepo.findPageById(id);
  if (!page || page.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }
  return page;
}

export interface CreatePageInput {
  title: string;
  parentPageId?: string;
  icon?: string;
  isFolder?: boolean;
}

export async function createPage(user: AuthenticatedUser, input: CreatePageInput) {
  const slug = await resolveUniqueSlug(user.workspaceId, input.title);
  const parentId = input.parentPageId ?? null;
  if (parentId) {
    const parent = await pagesRepo.findPageById(parentId);
    if (!parent || parent.workspaceId !== user.workspaceId) {
      throw new NotFoundError("Page", parentId);
    }
  }

  const maxOrder = await pagesRepo.getMaxSortOrderAmongSiblings(user.workspaceId, parentId);
  const isFolder = input.isFolder ?? false;

  const page = await pagesRepo.createPage({
    workspaceId: user.workspaceId,
    title: input.title,
    slug,
    parentPageId: parentId,
    isFolder,
    sortOrder: maxOrder + 1000,
    icon: input.icon ?? null,
    status: "draft",
    contentJson: null,
    contentText: null,
    createdBy: user.id,
    updatedBy: user.id,
  });

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: page.id,
    action: "page.created",
    metadata: { title: page.title },
  });

  return page;
}

export interface UpdatePageInput {
  title?: string;
  contentJson?: JSONContent;
  icon?: string | null;
  status?: "draft" | "published" | "archived";
  parentPageId?: string | null;
  createRevision?: boolean;
  changeReason?: string;
}

export async function updatePage(user: AuthenticatedUser, id: string, input: UpdatePageInput) {
  const existing = await pagesRepo.findPageById(id);
  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }

  const contentText = input.contentJson
    ? extractTextFromJson(input.contentJson)
    : existing.contentText;

  const excerpt = contentText ? excerptFromText(contentText) : existing.excerpt;

  let parentPatch: { parentPageId?: string | null; sortOrder?: number } = {};
  if (input.parentPageId !== undefined) {
    const newParentId = input.parentPageId;
    if (newParentId === id) {
      throw new ValidationError("Um item não pode ser pai de si mesmo.");
    }
    if (newParentId !== null) {
      const parent = await pagesRepo.findPageById(newParentId);
      if (!parent || parent.workspaceId !== user.workspaceId) {
        throw new NotFoundError("Page", newParentId);
      }
    }
    if (newParentId !== existing.parentPageId) {
      const allPages = await pagesRepo.findPagesByWorkspace(user.workspaceId, {
        includeArchived: false,
      });
      const descendants = collectDescendantPageIds(allPages, id);
      if (newParentId !== null && descendants.has(newParentId)) {
        throw new ValidationError("Não é possível mover para dentro de um subitem.");
      }
      const maxOrder = await pagesRepo.getMaxSortOrderAmongSiblings(user.workspaceId, newParentId);
      parentPatch = { parentPageId: newParentId, sortOrder: maxOrder + 1000 };
    }
  }

  const updated = await pagesRepo.updatePage(id, {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.contentJson !== undefined && { contentJson: input.contentJson }),
    ...(input.icon !== undefined && { icon: input.icon }),
    ...(input.status !== undefined && { status: input.status }),
    ...parentPatch,
    excerpt,
    contentText: contentText ?? existing.contentText,
    updatedBy: user.id,
  });

  if (input.createRevision) {
    const version = await pagesRepo.getLatestRevisionVersion(id);
    await pagesRepo.createRevision({
      pageId: id,
      version: version + 1,
      title: updated.title,
      contentJson: updated.contentJson,
      contentText: updated.contentText,
      createdBy: user.id,
      changeReason: input.changeReason ?? null,
    });
  }

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: id,
    action: "page.updated",
  });

  return updated;
}

export async function reorderKnowledgeSiblingPages(
  user: AuthenticatedUser,
  parentPageId: string | null,
  orderedIds: string[],
) {
  if (parentPageId !== null) {
    const parent = await pagesRepo.findPageById(parentPageId);
    if (!parent || parent.workspaceId !== user.workspaceId) {
      throw new NotFoundError("Page", parentPageId);
    }
  }

  const siblings = await pagesRepo.findPagesByParent(user.workspaceId, parentPageId, {
    includeArchived: false,
  });
  const allowed = new Set(siblings.map((s) => s.id));
  if (orderedIds.length !== siblings.length) {
    throw new ValidationError("Lista de ordem incompleta para este nível.");
  }
  for (const id of orderedIds) {
    if (!allowed.has(id)) {
      throw new ValidationError("Itens inválidos para reordenar neste nível.");
    }
  }

  await pagesRepo.reorderSiblingPagesByIds(user.workspaceId, parentPageId, orderedIds);

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: orderedIds[0] ?? user.workspaceId,
    action: "page.updated",
  });
}

export async function archivePage(user: AuthenticatedUser, id: string) {
  const page = await pagesRepo.findPageById(id);
  if (!page || page.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }

  await pagesRepo.archivePage(id);

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: id,
    action: "page.archived",
  });
}

export async function restorePage(user: AuthenticatedUser, id: string) {
  const page = await pagesRepo.findPageById(id);
  if (!page || page.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }

  await pagesRepo.restorePage(id);

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: id,
    action: "page.restored",
  });
}

export async function deletePage(user: AuthenticatedUser, id: string) {
  const page = await pagesRepo.findPageById(id);
  if (!page || page.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }

  await pagesRepo.softDeletePage(id);

  await recordAudit({
    workspaceId: user.workspaceId,
    actorUserId: user.id,
    entityType: "page",
    entityId: id,
    action: "page.deleted",
  });
}

export async function getPageRevisions(user: AuthenticatedUser, id: string) {
  const page = await pagesRepo.findPageById(id);
  if (!page || page.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Page", id);
  }
  return pagesRepo.findRevisionsByPage(id);
}

// --- Helpers ---

async function resolveUniqueSlug(workspaceId: string, title: string): Promise<string> {
  const base = slugify(title);
  const existing = await pagesRepo.findPageBySlug(workspaceId, base);
  if (!existing) return base;
  return uniqueSlug(title);
}

type PageNode = Awaited<ReturnType<typeof pagesRepo.findPageById>> & {
  children: PageNode[];
};

function buildTree(allPages: Awaited<ReturnType<typeof pagesRepo.findPagesByWorkspace>>) {
  const map = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const page of allPages) {
    map.set(page.id, { ...page, children: [] });
  }

  for (const [, node] of map) {
    if (node.parentPageId && map.has(node.parentPageId)) {
      map.get(node.parentPageId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortSiblings = (nodes: PageNode[]): PageNode[] =>
    [...nodes]
      .sort((a, b) =>
        a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.title.localeCompare(b.title),
      )
      .map((n) => ({ ...n, children: sortSiblings(n.children) }));

  return sortSiblings(roots);
}
