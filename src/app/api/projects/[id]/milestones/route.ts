import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createMilestoneSchema } from "@/lib/schemas/projects.schemas";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const milestones = await hubApiFetch({
      path: `/v1/projects/${id}/milestones`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: milestones });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const input = createMilestoneSchema.parse(body);
    const milestone = await hubApiFetch({
      method: "POST",
      path: `/v1/projects/${id}/milestones`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: {
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "pending",
        dueDate: input.dueDate ?? null,
        ownerUserId: input.ownerUserId ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
