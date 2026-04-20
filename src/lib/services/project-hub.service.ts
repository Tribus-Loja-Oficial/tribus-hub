import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { NotFoundError } from "@/lib/errors";
import type { AuthenticatedUser } from "@/lib/permissions";

export async function getProjectHub(user: AuthenticatedUser, projectId: string) {
  try {
    return await hubApiFetch({
      path: `/v1/projects/${projectId}/hub`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Not found") || msg.includes("404"))
      throw new NotFoundError("Project", projectId);
    throw e;
  }
}
