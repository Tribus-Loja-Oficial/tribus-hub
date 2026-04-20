import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { search } from "@/lib/services/search.service";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const results = await search(user, query);
    return NextResponse.json({ data: results });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
