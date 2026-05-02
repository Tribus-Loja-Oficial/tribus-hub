import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as okrService from "@/lib/services/okr.service";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId") ?? undefined;
    const allCycles = searchParams.get("allCycles") === "1";
    const data = await okrService.getDashboard(user, {
      cycleId: allCycles ? undefined : cycleId,
      allCycles,
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[okr/dashboard GET]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
