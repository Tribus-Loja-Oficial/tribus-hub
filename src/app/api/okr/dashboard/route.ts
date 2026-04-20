import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId") ?? undefined;
    const data = await okrService.getDashboard(user, cycleId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/dashboard GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
