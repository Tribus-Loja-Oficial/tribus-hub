// @ts-nocheck
import { db } from "@/lib/db/client";
import { pages, projects, milestones, tasks } from "@/lib/db/schema";
import { eq, and, isNull, like, or } from "drizzle-orm";

export interface SearchResult {
  id: string;
  type: "page" | "project" | "milestone" | "task";
  title: string;
  slug: string;
  excerpt?: string;
}

export async function globalSearch(
  workspaceId: string,
  query: string,
  limit = 30,
): Promise<SearchResult[]> {
  const pattern = `%${query}%`;

  const [pageResults, projectResults, milestoneResults, taskResults] = await Promise.all([
    db.query.pages.findMany({
      where: and(
        eq(pages.workspaceId, workspaceId),
        isNull(pages.deletedAt),
        or(like(pages.title, pattern), like(pages.slug, pattern)),
      ),
      columns: { id: true, title: true, slug: true, excerpt: true },
      limit: Math.ceil(limit / 4),
    }),
    db.query.projects.findMany({
      where: and(
        eq(projects.workspaceId, workspaceId),
        isNull(projects.deletedAt),
        like(projects.title, pattern),
      ),
      columns: { id: true, title: true, slug: true, summary: true },
      limit: Math.ceil(limit / 4),
    }),
    db.query.milestones.findMany({
      where: and(like(milestones.title, pattern)),
      columns: { id: true, title: true, projectId: true },
      limit: Math.ceil(limit / 4),
    }),
    db.query.tasks.findMany({
      where: and(
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt),
        like(tasks.title, pattern),
      ),
      columns: { id: true, title: true, slug: true },
      limit: Math.ceil(limit / 4),
    }),
  ]);

  const results: SearchResult[] = [
    ...pageResults.map((p) => ({
      id: p.id,
      type: "page" as const,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? undefined,
    })),
    ...projectResults.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.title,
      slug: p.slug,
      excerpt: p.summary ?? undefined,
    })),
    ...milestoneResults.map((m) => ({
      id: m.id,
      type: "milestone" as const,
      title: m.title,
      slug: m.id,
    })),
    ...taskResults.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      slug: t.slug,
    })),
  ];

  return results.slice(0, limit);
}
