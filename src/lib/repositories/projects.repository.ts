// @ts-nocheck
import { db } from "@/lib/db/client";
import {
  projects,
  milestones,
  objectives,
  keyResults,
  tasks,
  taskColumns,
  pmProjectOkrObjectiveLinks,
  pmProjectOkrKrLinks,
  okrObjectives,
  okrKeyResults,
} from "@/lib/db/schema";
import { eq, and, isNull, desc, like, inArray, sql, lte, gte } from "drizzle-orm";
import type {
  NewProject,
  Project,
  NewMilestone,
  Milestone,
  NewObjective,
  Objective,
  KeyResult,
  PmProjectOkrObjectiveLink,
  PmProjectOkrKrLink,
  OkrObjective,
  OkrKeyResult,
} from "@/lib/db/schema";

// --- Projects ---

export async function findProjectById(id: string): Promise<Project | undefined> {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, id), isNull(projects.deletedAt)),
  });
}

export async function findProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
  return db.query.projects.findMany({
    where: and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
    orderBy: [desc(projects.updatedAt)],
  });
}

export async function findProjectBySlug(
  workspaceId: string,
  slug: string,
): Promise<Project | undefined> {
  return db.query.projects.findFirst({
    where: and(
      eq(projects.workspaceId, workspaceId),
      eq(projects.slug, slug),
      isNull(projects.deletedAt),
    ),
  });
}

export async function createProject(data: NewProject): Promise<Project> {
  const [project] = await db.insert(projects).values(data).returning();
  if (!project) throw new Error("Failed to create project");
  return project;
}

export async function updateProject(id: string, data: Partial<NewProject>): Promise<Project> {
  const [updated] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update project");
  return updated;
}

export async function softDeleteProject(id: string): Promise<void> {
  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function searchProjects(workspaceId: string, query: string): Promise<Project[]> {
  return db.query.projects.findMany({
    where: and(
      eq(projects.workspaceId, workspaceId),
      isNull(projects.deletedAt),
      like(projects.title, `%${query}%`),
    ),
    limit: 20,
  });
}

// --- Milestones ---

export async function findMilestonesByProject(projectId: string): Promise<Milestone[]> {
  return db.query.milestones.findMany({
    where: eq(milestones.projectId, projectId),
    orderBy: [milestones.sortOrder],
  });
}

export async function findMilestoneById(id: string): Promise<Milestone | undefined> {
  return db.query.milestones.findFirst({
    where: eq(milestones.id, id),
  });
}

export async function createMilestone(data: NewMilestone): Promise<Milestone> {
  const [milestone] = await db.insert(milestones).values(data).returning();
  if (!milestone) throw new Error("Failed to create milestone");
  return milestone;
}

export async function updateMilestone(
  id: string,
  data: Partial<NewMilestone>,
): Promise<Milestone> {
  const [updated] = await db
    .update(milestones)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(milestones.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update milestone");
  return updated;
}

// --- Objectives ---

export async function findObjectivesByProject(projectId: string): Promise<Objective[]> {
  return db.query.objectives.findMany({
    where: eq(objectives.projectId, projectId),
  });
}

export async function createObjective(data: NewObjective): Promise<Objective> {
  const [objective] = await db.insert(objectives).values(data).returning();
  if (!objective) throw new Error("Failed to create objective");
  return objective;
}

export async function findKeyResultsByObjectiveIds(objectiveIds: string[]): Promise<KeyResult[]> {
  if (objectiveIds.length === 0) return [];
  return db.query.keyResults.findMany({
    where: inArray(keyResults.objectiveId, objectiveIds),
  });
}

export async function countTasksByProject(projectId: string): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));
  return Number(row?.c ?? 0);
}

export async function softDeleteMilestone(id: string): Promise<void> {
  await db.update(milestones).set({ updatedAt: new Date() }).where(eq(milestones.id, id));
  // milestones don't have deletedAt; mark as cancelled equivalent
  await db.delete(milestones).where(eq(milestones.id, id));
}

// --- OKR Links ---

export type OkrObjectiveLink = PmProjectOkrObjectiveLink & { objective: OkrObjective };
export type OkrKrLink = PmProjectOkrKrLink & { keyResult: OkrKeyResult };

export async function findOkrObjectiveLinksByProject(projectId: string): Promise<OkrObjectiveLink[]> {
  const links = await db.query.pmProjectOkrObjectiveLinks.findMany({
    where: eq(pmProjectOkrObjectiveLinks.projectId, projectId),
  });
  if (links.length === 0) return [];
  const objectiveIds = links.map((l) => l.okrObjectiveId);
  const objs = await db.query.okrObjectives.findMany({
    where: inArray(okrObjectives.id, objectiveIds),
  });
  const objMap = new Map(objs.map((o) => [o.id, o]));
  return links
    .filter((l) => objMap.has(l.okrObjectiveId))
    .map((l) => ({ ...l, objective: objMap.get(l.okrObjectiveId)! }));
}

export async function findOkrKrLinksByProject(projectId: string): Promise<OkrKrLink[]> {
  const links = await db.query.pmProjectOkrKrLinks.findMany({
    where: eq(pmProjectOkrKrLinks.projectId, projectId),
  });
  if (links.length === 0) return [];
  const krIds = links.map((l) => l.okrKrId);
  const krs = await db.query.okrKeyResults.findMany({
    where: inArray(okrKeyResults.id, krIds),
  });
  const krMap = new Map(krs.map((k) => [k.id, k]));
  return links
    .filter((l) => krMap.has(l.okrKrId))
    .map((l) => ({ ...l, keyResult: krMap.get(l.okrKrId)! }));
}

export async function addOkrObjectiveLink(
  projectId: string,
  okrObjectiveId: string,
): Promise<PmProjectOkrObjectiveLink> {
  const existing = await db.query.pmProjectOkrObjectiveLinks.findFirst({
    where: and(
      eq(pmProjectOkrObjectiveLinks.projectId, projectId),
      eq(pmProjectOkrObjectiveLinks.okrObjectiveId, okrObjectiveId),
    ),
  });
  if (existing) return existing;
  const { createId } = await import("@/lib/utils/ids");
  const [link] = await db
    .insert(pmProjectOkrObjectiveLinks)
    .values({ id: createId(), projectId, okrObjectiveId })
    .returning();
  if (!link) throw new Error("Failed to create OKR objective link");
  return link;
}

export async function removeOkrObjectiveLink(linkId: string): Promise<void> {
  await db.delete(pmProjectOkrObjectiveLinks).where(eq(pmProjectOkrObjectiveLinks.id, linkId));
}

export async function addOkrKrLink(
  projectId: string,
  okrKrId: string,
  relationType: "contributes_to" | "supports" | "indirect" = "contributes_to",
): Promise<PmProjectOkrKrLink> {
  const existing = await db.query.pmProjectOkrKrLinks.findFirst({
    where: and(
      eq(pmProjectOkrKrLinks.projectId, projectId),
      eq(pmProjectOkrKrLinks.okrKrId, okrKrId),
    ),
  });
  if (existing) return existing;
  const { createId } = await import("@/lib/utils/ids");
  const [link] = await db
    .insert(pmProjectOkrKrLinks)
    .values({ id: createId(), projectId, okrKrId, relationType })
    .returning();
  if (!link) throw new Error("Failed to create OKR KR link");
  return link;
}

export async function removeOkrKrLink(linkId: string): Promise<void> {
  await db.delete(pmProjectOkrKrLinks).where(eq(pmProjectOkrKrLinks.id, linkId));
}

// --- PM Dashboard Stats ---

export async function getPmDashboardStats(workspaceId: string) {
  const [allProjects, allMilestones] = await Promise.all([
    db.query.projects.findMany({
      where: and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
      columns: { id: true, status: true, healthStatus: true, targetDate: true },
    }),
    db.query.milestones.findMany({
      columns: { id: true, status: true, dueDate: true, projectId: true },
    }),
  ]);

  const activeProjects = allProjects.filter((p) => p.status === "active");
  const atRisk = activeProjects.filter((p) => p.healthStatus === "at_risk").length;
  const blocked = activeProjects.filter((p) => p.healthStatus === "blocked").length;
  const today = new Date().toISOString().split("T")[0]!;
  const overdueMilestones = allMilestones.filter(
    (m) => m.dueDate && m.dueDate < today && m.status !== "completed",
  ).length;

  return {
    totalProjects: allProjects.length,
    activeProjects: activeProjects.length,
    atRisk,
    blocked,
    overdueMilestones,
    completedProjects: allProjects.filter((p) => p.status === "completed").length,
  };
}

// ─── Hierarchy ────────────────────────────────────────────────────────────────

export type HierarchyTask = {
  id: string;
  title: string;
  projectId: string | null;
  milestoneId: string | null;
  priority: string;
  assigneeUserId: string | null;
  dueDate: string | null;
  completedAt: Date | null;
  columnId: string;
  columnName: string;
  columnSlug: string;
};

export type HierarchyMilestone = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: Date | null;
  ownerUserId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  tasks: HierarchyTask[];
  taskStats: { total: number; done: number };
};

export type ProjectHierarchyItem = Project & {
  milestones: HierarchyMilestone[];
  projectStats: {
    totalMilestones: number;
    completedMilestones: number;
    totalTasks: number;
    doneTasks: number;
    overdueMilestones: number;
  };
};

export async function findProjectsWithHierarchyData(
  workspaceId: string,
): Promise<ProjectHierarchyItem[]> {
  const allProjects = await db.query.projects.findMany({
    where: and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
    orderBy: [desc(projects.updatedAt)],
  });

  if (allProjects.length === 0) return [];

  const projectIds = allProjects.map((p) => p.id);

  const allMilestones = await db.query.milestones.findMany({
    where: inArray(milestones.projectId, projectIds),
    orderBy: [milestones.sortOrder],
  });

  const allTasksRaw = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      milestoneId: tasks.milestoneId,
      priority: tasks.priority,
      assigneeUserId: tasks.assigneeUserId,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      columnId: tasks.columnId,
      columnName: taskColumns.name,
      columnSlug: taskColumns.slug,
    })
    .from(tasks)
    .innerJoin(taskColumns, eq(tasks.columnId, taskColumns.id))
    .where(and(isNull(tasks.deletedAt), inArray(tasks.projectId, projectIds)));

  const milestonesByProject = new Map<string, typeof allMilestones>();
  for (const m of allMilestones) {
    const list = milestonesByProject.get(m.projectId) ?? [];
    list.push(m);
    milestonesByProject.set(m.projectId, list);
  }

  const tasksByMilestone = new Map<string, HierarchyTask[]>();
  const tasksByProject = new Map<string, HierarchyTask[]>();
  for (const t of allTasksRaw) {
    const task = t as HierarchyTask;
    if (t.milestoneId) {
      const list = tasksByMilestone.get(t.milestoneId) ?? [];
      list.push(task);
      tasksByMilestone.set(t.milestoneId, list);
    }
    if (t.projectId) {
      const list = tasksByProject.get(t.projectId) ?? [];
      list.push(task);
      tasksByProject.set(t.projectId, list);
    }
  }

  const today = new Date().toISOString().split("T")[0]!;

  return allProjects.map((project) => {
    const projMilestones = milestonesByProject.get(project.id) ?? [];
    const projTasks = tasksByProject.get(project.id) ?? [];
    const doneTasks = projTasks.filter((t) => !!t.completedAt).length;

    return {
      ...project,
      milestones: projMilestones.map((milestone) => {
        const mTasks = tasksByMilestone.get(milestone.id) ?? [];
        const mDone = mTasks.filter((t) => !!t.completedAt).length;
        return {
          ...milestone,
          tasks: mTasks,
          taskStats: { total: mTasks.length, done: mDone },
        };
      }),
      projectStats: {
        totalMilestones: projMilestones.length,
        completedMilestones: projMilestones.filter((m) => m.status === "completed").length,
        totalTasks: projTasks.length,
        doneTasks,
        overdueMilestones: projMilestones.filter(
          (m) => m.dueDate && m.dueDate < today && m.status !== "completed",
        ).length,
      },
    };
  });
}

export async function findUpcomingMilestones(workspaceId: string, daysAhead = 14) {
  const workspaceProjects = await db.query.projects.findMany({
    where: and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
    columns: { id: true, title: true },
  });

  if (workspaceProjects.length === 0) return [];

  const projectIds = workspaceProjects.map((p) => p.id);
  const projectTitles = new Map(workspaceProjects.map((p) => [p.id, p.title]));

  const today = new Date().toISOString().split("T")[0]!;
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  const upcoming = await db.query.milestones.findMany({
    where: and(
      inArray(milestones.projectId, projectIds),
      gte(milestones.dueDate, today),
      lte(milestones.dueDate, future),
    ),
    orderBy: [milestones.dueDate],
    limit: 12,
  });

  return upcoming
    .filter((m) => m.status !== "completed")
    .map((m) => ({ ...m, projectTitle: projectTitles.get(m.projectId) ?? "" }));
}

export async function findOverdueTasksCount(workspaceId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0]!;
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt),
        isNull(tasks.completedAt),
        lte(tasks.dueDate, today),
      ),
    );
  return Number(row?.c ?? 0);
}
