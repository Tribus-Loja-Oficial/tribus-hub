import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const [stats, upcomingMilestones, overdueTasksCount] = await Promise.all([
      projectsRepo.getPmDashboardStats(user.workspaceId),
      projectsRepo.findUpcomingMilestones(user.workspaceId, 14),
      projectsRepo.findOverdueTasksCount(user.workspaceId),
    ]);
    return NextResponse.json({ data: { ...stats, upcomingMilestones, overdueTasksCount } });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
