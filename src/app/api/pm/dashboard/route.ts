import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { toApiError } from "@/lib/errors";

/** Query string for hub-api PM routes (mesma convenção que /v1/okr/dashboard). */
function pmCycleQuery(searchParams: URLSearchParams): string {
  const cycleId = searchParams.get("cycleId")?.trim();
  const allCycles = searchParams.get("allCycles") === "1";
  const qs = new URLSearchParams();
  if (allCycles) qs.set("allCycles", "1");
  else if (cycleId) qs.set("cycleId", cycleId);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const cycleQs = pmCycleQuery(request.nextUrl.searchParams);
    const dashboardPath = cycleQs ? `/v1/pm/dashboard${cycleQs}` : "/v1/pm/dashboard";

    const upcomingQs = new URLSearchParams();
    upcomingQs.set("days", "14");
    if (cycleQs) {
      const inner = new URLSearchParams(cycleQs.startsWith("?") ? cycleQs.slice(1) : cycleQs);
      inner.forEach((v, k) => upcomingQs.set(k, v));
    }
    const upcomingPath = `/v1/pm/upcoming-milestones?${upcomingQs.toString()}`;

    const overduePath = cycleQs
      ? `/v1/pm/overdue-tasks-count${cycleQs}`
      : "/v1/pm/overdue-tasks-count";
    const overdueMsListPath = cycleQs
      ? `/v1/pm/overdue-milestones-list${cycleQs}`
      : "/v1/pm/overdue-milestones-list";
    const overdueTasksListPath = cycleQs
      ? `/v1/pm/overdue-tasks-list${cycleQs}`
      : "/v1/pm/overdue-tasks-list";

    const [stats, upcomingMilestones, overdueWrap, overdueMilestonesList, overdueTasksList] =
      await Promise.all([
        hubApiFetch({
          path: dashboardPath,
          workspaceId: user.workspaceId,
          actorUserId: user.id,
        }),
        hubApiFetch<unknown[]>({
          path: upcomingPath,
          workspaceId: user.workspaceId,
          actorUserId: user.id,
        }).catch(() => []),
        hubApiFetch<{ count: number }>({
          path: overduePath,
          workspaceId: user.workspaceId,
          actorUserId: user.id,
        }).catch(() => ({ count: 0 })),
        hubApiFetch<unknown[]>({
          path: overdueMsListPath,
          workspaceId: user.workspaceId,
          actorUserId: user.id,
        }).catch(() => []),
        hubApiFetch<unknown[]>({
          path: overdueTasksListPath,
          workspaceId: user.workspaceId,
          actorUserId: user.id,
        }).catch(() => []),
      ]);
    return NextResponse.json({
      data: {
        ...(stats as Record<string, unknown>),
        upcomingMilestones,
        overdueTasksCount: overdueWrap.count,
        overdueMilestonesList,
        overdueTasksList,
      },
    });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
