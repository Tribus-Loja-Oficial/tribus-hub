import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import type { AuthenticatedUser } from "@/lib/permissions";
import { ValidationError } from "@/lib/errors";

export async function search(user: AuthenticatedUser, query: string) {
  if (!query || query.trim().length < 2) {
    throw new ValidationError("Search query must be at least 2 characters");
  }

  const q = encodeURIComponent(query.trim());
  return hubApiFetch<{
    pages: unknown[];
    projects: unknown[];
    milestones: unknown[];
    tasks: unknown[];
    objectives: unknown[];
    keyResults: unknown[];
    cycles: unknown[];
    total: number;
  }>({
    path: `/v1/search?q=${q}`,
    workspaceId: user.workspaceId,
    actorUserId: user.id,
  });
}
