import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createPageSchema } from "@/lib/schemas/knowledge.schemas";
import { toApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const parentId = request.nextUrl.searchParams.get("parentId");
    const query = new URLSearchParams();
    if (parentId) query.set("parentId", parentId);
    if (request.nextUrl.searchParams.get("archived") === "true") query.set("archived", "true");
    const path = query.size ? `/v1/knowledge/pages?${query.toString()}` : "/v1/knowledge/pages";
    const data = await hubApiFetch({
      path,
      workspaceId: user.workspaceId,
      actorUserId: user.id,
    });
    return NextResponse.json({ data });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const input = createPageSchema.parse(body);
    const page = await hubApiFetch({
      method: "POST",
      path: "/v1/knowledge/pages",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: input,
    });
    return NextResponse.json({ data: page }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
