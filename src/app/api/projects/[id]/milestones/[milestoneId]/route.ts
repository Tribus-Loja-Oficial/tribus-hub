import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { updateMilestoneSchema } from "@/lib/schemas/projects.schemas";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, milestoneId } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId) throw new NotFoundError("Project", id);
    const body = await request.json();
    const input = updateMilestoneSchema.parse(body);
    const milestone = await projectsRepo.updateMilestone(milestoneId, input);
    return NextResponse.json({ data: milestone });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id, milestoneId } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId) throw new NotFoundError("Project", id);
    await projectsRepo.softDeleteMilestone(milestoneId);
    return NextResponse.json({ data: null });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
