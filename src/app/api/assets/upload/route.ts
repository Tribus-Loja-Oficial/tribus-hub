import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { uploadAsset } from "@/lib/services/asset.service";
import { toApiError, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ValidationError("No file provided");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await uploadAsset(user, {
      buffer,
      originalFilename: file.name,
      mimeType: file.type,
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
