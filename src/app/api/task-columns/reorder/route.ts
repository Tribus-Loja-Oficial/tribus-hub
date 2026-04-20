import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { reorderColumnsSchema } from "@/lib/schemas/tasks.schemas";
import { toApiError } from "@/lib/errors";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { updates } = reorderColumnsSchema.parse(body);
    await hubApiFetch({
      method: "PATCH",
      path: "/v1/task-columns/reorder",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: { updates },
    });
    return NextResponse.json({ data: null });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
