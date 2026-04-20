import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const tree = await hubApiFetch({
      path: "/v1/knowledge/tree",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data: tree });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
