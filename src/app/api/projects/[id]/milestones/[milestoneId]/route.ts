import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { updateMilestoneSchema } from "@/lib/schemas/projects.schemas";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id, milestoneId } = await params;
    const user = await requireAuth();
    const milestone = await hubApiFetch({
      path: `/v1/projects/${id}/milestones/${milestoneId}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: milestone });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, milestoneId } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const input = updateMilestoneSchema.parse(body);
    const milestone = await hubApiFetch({
      method: "PATCH",
      path: `/v1/projects/${id}/milestones/${milestoneId}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });
    return NextResponse.json({ data: milestone });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id, milestoneId } = await params;
    const user = await requireAuth();
    await hubApiFetch({
      method: "DELETE",
      path: `/v1/projects/${id}/milestones/${milestoneId}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: null });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
