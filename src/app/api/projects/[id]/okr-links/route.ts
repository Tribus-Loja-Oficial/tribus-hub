import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { linkOkrObjectiveSchema, linkOkrKrSchema } from "@/lib/schemas/projects.schemas";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const data = await hubApiFetch<{ objectiveLinks: unknown[]; krLinks: unknown[] }>({
      path: `/v1/projects/${id}/okr-links`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const { type } = body as { type?: string };

    if (type === "objective") {
      const input = linkOkrObjectiveSchema.parse(body);
      const link = await hubApiFetch({
        method: "POST",
        path: `/v1/projects/${id}/okr-links`,
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        body: { type: "objective", okrObjectiveId: input.okrObjectiveId },
      });
      return NextResponse.json({ data: link }, { status: 201 });
    }
    const input = linkOkrKrSchema.parse(body);
    const link = await hubApiFetch({
      method: "POST",
      path: `/v1/projects/${id}/okr-links`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: { okrKrId: input.okrKrId, relationType: input.relationType },
    });
    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
