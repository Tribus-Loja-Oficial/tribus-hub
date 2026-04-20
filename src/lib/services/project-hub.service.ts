import * as projectsRepo from "@/lib/repositories/projects.repository";
import * as relationsRepo from "@/lib/repositories/relations.repository";
import * as assetsRepo from "@/lib/repositories/assets.repository";
import * as tasksRepo from "@/lib/repositories/tasks.repository";
import { NotFoundError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";
import type { KeyResult } from "@/lib/db/schema";

export async function getProjectHub(user: AuthenticatedUser, projectId: string) {
  const project = await projectsRepo.findProjectById(projectId);
  if (!project || project.workspaceId !== user.workspaceId) {
    throw new NotFoundError("Project", projectId);
  }

  const [milestones, objectives, taskCount, linkedPages, linkedAssets] = await Promise.all([
    projectsRepo.findMilestonesByProject(projectId),
    projectsRepo.findObjectivesByProject(projectId),
    projectsRepo.countTasksByProject(projectId),
    relationsRepo.findLinkedPagesForProject(projectId, user.workspaceId),
    assetsRepo.findAssetsForEntity(user.workspaceId, "project", projectId),
  ]);

  const objectiveIds = objectives.map((o) => o.id);
  const keyResults = await projectsRepo.findKeyResultsByObjectiveIds(objectiveIds);
  const krByObjective = new Map<string, KeyResult[]>();
  for (const kr of keyResults) {
    const list = krByObjective.get(kr.objectiveId) ?? [];
    list.push(kr);
    krByObjective.set(kr.objectiveId, list);
  }

  const objectivesWithKr = objectives.map((o) => ({
    ...o,
    keyResults: krByObjective.get(o.id) ?? [],
  }));

  const projectTasks = (
    await tasksRepo.findTasksByWorkspace(user.workspaceId, { projectId })
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return {
    project,
    milestones,
    objectives: objectivesWithKr,
    stats: {
      taskCount,
      milestoneCount: milestones.length,
      openMilestones: milestones.filter((m) => m.status !== "completed").length,
    },
    linkedPages,
    linkedAssets: linkedAssets.map(({ asset, usageKind }) => ({
      id: asset.id,
      filename: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      usageKind,
      createdAt: asset.createdAt,
    })),
    recentTasks: projectTasks.slice(0, 12),
  };
}
