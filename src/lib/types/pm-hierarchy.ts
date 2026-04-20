import type { OkrObjective, OkrKeyResult, Project } from "@/lib/db/schema";

/** Task row nested under hierarchy milestones (hub-api JSON). */
export type HierarchyTask = {
  id: string;
  title: string;
  projectId: string | null;
  milestoneId: string | null;
  priority: string;
  assigneeUserId: string | null;
  dueDate: string | null;
  completedAt: string | Date | null;
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
  completedAt: string | Date | null;
  ownerUserId: string | null;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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

export type OkrObjectiveLink = {
  id: string;
  projectId: string;
  okrObjectiveId: string;
  createdAt: string;
  objective: Pick<OkrObjective, "id" | "title" | "slug" | "status">;
};

export type OkrKrLink = {
  id: string;
  projectId: string;
  okrKrId: string;
  relationType: string;
  createdAt: string;
  keyResult: Pick<OkrKeyResult, "id" | "title" | "slug" | "status" | "objectiveId">;
};
