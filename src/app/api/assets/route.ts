import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { listAssets } from "@/lib/services/asset.service";
import { toApiError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await listAssets(user);
    return NextResponse.json({ data });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
