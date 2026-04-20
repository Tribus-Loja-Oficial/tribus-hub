import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { updateProjectSchema } from "@/lib/schemas/projects.schemas";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await hubApiFetch({
      path: `/v1/projects/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    }).catch(() => null);
    if (!project) throw new NotFoundError("Project", id);
    return NextResponse.json({ data: project });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const updated = await hubApiFetch({
      method: "PATCH",
      path: `/v1/projects/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    await hubApiFetch({
      method: "DELETE",
      path: `/v1/projects/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: null });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
