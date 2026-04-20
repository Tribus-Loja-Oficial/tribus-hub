import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import { linkOkrObjectiveSchema, linkOkrKrSchema } from "@/lib/schemas/projects.schemas";
import { toApiError, NotFoundError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId)
      throw new NotFoundError("Project", id);
    const [objectiveLinks, krLinks] = await Promise.all([
      projectsRepo.findOkrObjectiveLinksByProject(id),
      projectsRepo.findOkrKrLinksByProject(id),
    ]);
    return NextResponse.json({ data: { objectiveLinks, krLinks } });
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const project = await projectsRepo.findProjectById(id);
    if (!project || project.workspaceId !== user.workspaceId)
      throw new NotFoundError("Project", id);

    const body = await request.json();
    const { type } = body as { type?: string };

    if (type === "objective") {
      const input = linkOkrObjectiveSchema.parse(body);
      const link = await projectsRepo.addOkrObjectiveLink(id, input.okrObjectiveId);
      return NextResponse.json({ data: link }, { status: 201 });
    } else {
      const input = linkOkrKrSchema.parse(body);
      const link = await projectsRepo.addOkrKrLink(id, input.okrKrId, input.relationType);
      return NextResponse.json({ data: link }, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: toApiError(err) }, { status: toApiError(err).status });
  }
}
