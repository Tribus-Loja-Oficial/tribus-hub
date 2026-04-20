import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createCycleSchema } from "@/lib/schemas/okr.schemas";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await hubApiFetch({
      path: "/v1/okr/cycles",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/cycles GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = createCycleSchema.parse(body);
    const data = await okrService.createCycle(user, input);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[okr/cycles POST]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
