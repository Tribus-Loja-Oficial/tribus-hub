import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createTaskLabelSchema } from "@/lib/schemas/tasks.schemas";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await hubApiFetch({
      path: "/v1/task-labels",
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
    const input = createTaskLabelSchema.parse(body);

    const label = await hubApiFetch({
      method: "POST",
      path: "/v1/task-labels",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });

    return NextResponse.json({ data: label }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
