// @ts-nocheck
import { db } from "@/lib/db/client";
import { pages, pageRevisions, pageTagLinks, pageTags } from "@/lib/db/schema";
import { eq, and, isNull, desc, asc, like, or, sql } from "drizzle-orm";
import type { NewPage, Page, NewPageRevision } from "@/lib/db/schema";

export async function findPageById(id: string): Promise<Page | undefined> {
  return db.query.pages.findFirst({
    where: and(eq(pages.id, id), isNull(pages.deletedAt)),
  });
}

export async function findPagesByWorkspace(
  workspaceId: string,
  options?: { includeArchived?: boolean },
): Promise<Page[]> {
  const conditions = [eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt)];
  if (!options?.includeArchived) {
    conditions.push(isNull(pages.archivedAt));
  }
  return db.query.pages.findMany({
    where: and(...conditions),
    orderBy: [desc(pages.updatedAt)],
  });
}

export async function findPagesByParent(
  workspaceId: string,
  parentPageId: string | null,
  options?: { includeArchived?: boolean },
): Promise<Page[]> {
  const conditions = [eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt)];
  if (!options?.includeArchived) {
    conditions.push(isNull(pages.archivedAt));
  }

  if (parentPageId === null) {
    conditions.push(isNull(pages.parentPageId));
  } else {
    conditions.push(eq(pages.parentPageId, parentPageId));
  }

  return db.query.pages.findMany({
    where: and(...conditions),
    orderBy: [asc(pages.sortOrder), asc(pages.title)],
  });
}

export async function getMaxSortOrderAmongSiblings(
  workspaceId: string,
  parentPageId: string | null,
): Promise<number> {
  const conditions = [
    eq(pages.workspaceId, workspaceId),
    isNull(pages.deletedAt),
    isNull(pages.archivedAt),
  ];
  if (parentPageId === null) {
    conditions.push(isNull(pages.parentPageId));
  } else {
    conditions.push(eq(pages.parentPageId, parentPageId));
  }
  const [row] = await db
    .select({
      max: sql<number>`coalesce(max(${pages.sortOrder}), 0)`,
    })
    .from(pages)
    .where(and(...conditions));
  return Number(row?.max ?? 0);
}

export async function findPageBySlug(
  workspaceId: string,
  slug: string,
): Promise<Page | undefined> {
  return db.query.pages.findFirst({
    where: and(
      eq(pages.workspaceId, workspaceId),
      eq(pages.slug, slug),
      isNull(pages.deletedAt),
    ),
  });
}

export async function createPage(data: NewPage): Promise<Page> {
  const [page] = await db.insert(pages).values(data).returning();
  if (!page) throw new Error("Failed to create page");
  return page;
}

export async function updatePage(id: string, data: Partial<NewPage>): Promise<Page> {
  const [updated] = await db
    .update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pages.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update page");
  return updated;
}

export async function reorderSiblingPagesByIds(
  workspaceId: string,
  parentPageId: string | null,
  orderedIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    let order = 1000;
    for (const id of orderedIds) {
      await tx
        .update(pages)
        .set({ sortOrder: order, updatedAt: new Date() })
        .where(
          and(
            eq(pages.id, id),
            eq(pages.workspaceId, workspaceId),
            parentPageId === null
              ? isNull(pages.parentPageId)
              : eq(pages.parentPageId, parentPageId),
          ),
        );
      order += 1000;
    }
  });
}

export async function softDeletePage(id: string): Promise<void> {
  await db
    .update(pages)
    .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(pages.id, id));
}

export async function archivePage(id: string): Promise<void> {
  await db
    .update(pages)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(pages.id, id));
}

export async function restorePage(id: string): Promise<void> {
  await db
    .update(pages)
    .set({ status: "published", archivedAt: null, updatedAt: new Date() })
    .where(eq(pages.id, id));
}

export async function searchPages(workspaceId: string, query: string): Promise<Page[]> {
  return db.query.pages.findMany({
    where: and(
      eq(pages.workspaceId, workspaceId),
      isNull(pages.deletedAt),
      or(like(pages.title, `%${query}%`), like(pages.slug, `%${query}%`)),
    ),
    orderBy: [desc(pages.updatedAt)],
    limit: 20,
  });
}

// --- Revisions ---

export async function findRevisionsByPage(pageId: string) {
  return db.query.pageRevisions.findMany({
    where: eq(pageRevisions.pageId, pageId),
    orderBy: [desc(pageRevisions.version)],
  });
}

export async function getLatestRevisionVersion(pageId: string): Promise<number> {
  const latest = await db.query.pageRevisions.findFirst({
    where: eq(pageRevisions.pageId, pageId),
    orderBy: [desc(pageRevisions.version)],
  });
  return latest?.version ?? 0;
}

export async function createRevision(data: NewPageRevision) {
  const [revision] = await db.insert(pageRevisions).values(data).returning();
  if (!revision) throw new Error("Failed to create revision");
  return revision;
}
