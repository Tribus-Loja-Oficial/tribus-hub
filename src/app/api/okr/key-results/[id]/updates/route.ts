import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { createKeyResultUpdateSchema } from "@/lib/schemas/okr.schemas";
import { toApiError } from "@/lib/errors";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const data = await okrService.getKeyResultUpdates(user, id);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/key-results/[id]/updates GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const input = createKeyResultUpdateSchema.parse(body);
    const data = await okrService.updateKeyResultProgress(user, id, input);
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[okr/key-results/[id]/updates POST]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
