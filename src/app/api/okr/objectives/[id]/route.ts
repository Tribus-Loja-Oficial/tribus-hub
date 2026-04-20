import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { updateObjectiveSchema } from "@/lib/schemas/okr.schemas";
import { toApiError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const data = await okrService.getObjective(user, id);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/objectives/[id] GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = updateObjectiveSchema.parse(body);
    const data = await okrService.updateObjective(user, id, input);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/objectives/[id] PATCH]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await okrService.deleteObjective(user, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[okr/objectives/[id] DELETE]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
