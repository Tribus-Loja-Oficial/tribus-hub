import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, linkId } = await params;
    const user = await requireAuth();
    const type = new URL(req.url).searchParams.get("type");
    const segment = type === "kr" ? "key-results" : "objectives";
    await hubApiFetch({
      method: "DELETE",
      path: `/v1/projects/${id}/okr-links/${segment}/${linkId}`,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: null });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
