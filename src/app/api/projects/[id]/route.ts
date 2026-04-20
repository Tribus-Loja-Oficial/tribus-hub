import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { updateProjectSchema } from "@/lib/schemas/projects.schemas";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId)
      throw new NotFoundError("Project", id);
    return NextResponse.json({ data: project });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();
    const input = updateProjectSchema.parse(body);
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId)
      throw new NotFoundError("Project", id);
    const updated = await projectsRepo.updateProject(id, { ...input, updatedBy: user.id });
    return NextResponse.json({ data: updated });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId)
      throw new NotFoundError("Project", id);
    await projectsRepo.softDeleteProject(id);
    return NextResponse.json({ data: null });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
