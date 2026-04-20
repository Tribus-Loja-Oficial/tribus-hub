import { globalSearch } from "@/lib/repositories/search.repository";
import type { AuthenticatedUser } from "@/lib/permissions";
import { ValidationError } from "@/lib/errors";

export async function search(user: AuthenticatedUser, query: string) {
  if (!query || query.trim().length < 2) {
    throw new ValidationError("Search query must be at least 2 characters");
  }

  const results = await globalSearch(user.workspaceId, query.trim());

  // Group by type for UI consumption
  return {
    pages: results.filter((r) => r.type === "page"),
    projects: results.filter((r) => r.type === "project"),
    milestones: results.filter((r) => r.type === "milestone"),
    tasks: results.filter((r) => r.type === "task"),
    total: results.length,
  };
}
