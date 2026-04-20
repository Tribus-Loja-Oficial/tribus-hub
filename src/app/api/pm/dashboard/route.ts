import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const [stats, upcomingMilestones, overdueWrap] = await Promise.all([
      hubApiFetch({
        path: "/v1/pm/dashboard",
        workspaceId: user.workspaceId,
        actorUserId: user.id,
      }),
      hubApiFetch<unknown[]>({
        path: "/v1/pm/upcoming-milestones?days=14",
        workspaceId: user.workspaceId,
        actorUserId: user.id,
      }).catch(() => []),
      hubApiFetch<{ count: number }>({
        path: "/v1/pm/overdue-tasks-count",
        workspaceId: user.workspaceId,
        actorUserId: user.id,
      }).catch(() => ({ count: 0 })),
    ]);
    return NextResponse.json({
      data: {
        stats,
        upcomingMilestones,
        overdueTasksCount: overdueWrap.count,
      },
    });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
