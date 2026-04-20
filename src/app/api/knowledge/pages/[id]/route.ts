import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { updatePageSchema } from "@/lib/schemas/knowledge.schemas";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const page = await hubApiFetch({
      path: `/v1/knowledge/pages/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: page });
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
    const input = updatePageSchema.parse(body);
    const page = await hubApiFetch({
      method: "PATCH",
      path: `/v1/knowledge/pages/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });
    return NextResponse.json({ data: page });
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
      path: `/v1/knowledge/pages/${id}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: null }, { status: 200 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
