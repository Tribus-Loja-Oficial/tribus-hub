// @ts-nocheck
import { db } from "@/lib/db/client";
import { relationLinks, pages } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { RelationLink } from "@/lib/db/schema";

function pageIdFromLink(link: RelationLink, projectId: string): string | null {
  if (link.sourceType === "page" && link.targetType === "project" && link.targetId === projectId) {
    return link.sourceId;
  }
  if (link.targetType === "page" && link.sourceType === "project" && link.sourceId === projectId) {
    return link.targetId;
  }
  return null;
}

/** Páginas de Knowledge ligadas ao projeto via `relation_links`. */
export async function findLinkedPagesForProject(
  projectId: string,
  workspaceId: string,
): Promise<Array<{ id: string; title: string; isFolder: boolean }>> {
  const links = await db.query.relationLinks.findMany({
    where: or(
      and(
        eq(relationLinks.targetType, "project"),
        eq(relationLinks.targetId, projectId),
        eq(relationLinks.sourceType, "page"),
      ),
      and(
        eq(relationLinks.sourceType, "project"),
        eq(relationLinks.sourceId, projectId),
        eq(relationLinks.targetType, "page"),
      ),
    ),
  });

  const pageIds = [...new Set(links.map((l) => pageIdFromLink(l, projectId)).filter(Boolean))] as string[];
  if (pageIds.length === 0) return [];

  const rows = await db.query.pages.findMany({
    where: and(
      inArray(pages.id, pageIds),
      eq(pages.workspaceId, workspaceId),
      isNull(pages.deletedAt),
    ),
  });

  return rows.map((p) => ({ id: p.id, title: p.title, isFolder: p.isFolder }));
}
