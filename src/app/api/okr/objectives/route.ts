import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { createObjectiveSchema } from "@/lib/schemas/okr.schemas";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const data = await okrService.listObjectives(user, { cycleId, status });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/objectives GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = createObjectiveSchema.parse(body);
    const data = await okrService.createObjective(user, input);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[okr/objectives POST]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
