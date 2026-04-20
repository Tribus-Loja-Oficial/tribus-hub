import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { getAsset, deleteAsset } from "@/lib/services/asset.service";
import { toApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const asset = await getAsset(user, id);
    return NextResponse.json({ data: asset });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    await deleteAsset(user, id);
    return NextResponse.json({ data: null });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
