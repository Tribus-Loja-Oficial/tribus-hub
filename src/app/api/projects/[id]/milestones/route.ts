import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { createMilestoneSchema } from "@/lib/schemas/projects.schemas";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId) throw new NotFoundError("Project", id);
    const milestones = await projectsRepo.findMilestonesByProject(id);
    return NextResponse.json({ data: milestones });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId) throw new NotFoundError("Project", id);

    const body = await request.json();
    const input = createMilestoneSchema.parse(body);

    const milestone = await projectsRepo.createMilestone({
      projectId: id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "pending",
      dueDate: input.dueDate ?? null,
      ownerUserId: input.ownerUserId ?? null,
      sortOrder: input.sortOrder ?? 0,
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
