import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id, linkId } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId) throw new NotFoundError("Project", id);

    const type = new URL(_req.url).searchParams.get("type");
    if (type === "kr") {
      await projectsRepo.removeOkrKrLink(linkId);
    } else {
      await projectsRepo.removeOkrObjectiveLink(linkId);
    }
    return NextResponse.json({ data: null });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
