import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { reorderKnowledgePagesSchema } from "@/lib/schemas/knowledge.schemas";
import { toApiError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = reorderKnowledgePagesSchema.parse(body);
    await hubApiFetch({
      method: "POST",
      path: "/v1/knowledge/pages/reorder",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
