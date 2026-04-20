import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { linkAsset } from "@/lib/services/asset.service";
import { toApiError, ValidationError } from "@/lib/errors";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const linkSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  usageKind: z.enum(["cover", "inline", "attachment", "reference", "avatar"]),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const { entityType, entityId, usageKind } = linkSchema.parse(body);
    const link = await linkAsset(user, id, entityType, entityId, usageKind);
    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
