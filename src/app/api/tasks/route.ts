import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createTaskSchema } from "@/lib/schemas/tasks.schemas";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId") ?? undefined;
    const columnId = searchParams.get("columnId") ?? undefined;
    const milestoneId = searchParams.get("milestoneId") ?? undefined;
    const assigneeUserId = searchParams.get("assigneeUserId") ?? undefined;
    const labelId = searchParams.get("labelId") ?? undefined;
    const priorityRaw = searchParams.get("priority");
    const priority =
      priorityRaw === "low" ||
      priorityRaw === "medium" ||
      priorityRaw === "high" ||
      priorityRaw === "urgent"
        ? priorityRaw
        : undefined;

    const data = await hubApiFetch({
      path: `/v1/tasks?${new URLSearchParams(
        Object.entries({
          projectId,
          columnId,
          milestoneId,
          assigneeUserId,
          labelId,
          priority,
        }).filter(([, value]) => Boolean(value)) as Array<[string, string]>,
      ).toString()}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = createTaskSchema.parse(body);

    const task = await hubApiFetch({
      method: "POST",
      path: "/v1/tasks",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
