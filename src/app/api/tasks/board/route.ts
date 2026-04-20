import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const board = await hubApiFetch({
      path: "/v1/tasks/board",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });

    return NextResponse.json({ data: board });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
