import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as projectsRepo from "@/lib/repositories/projects.repository";
import * as auditService from "@/lib/services/audit.service";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createProjectSchema } from "@/lib/schemas/projects.schemas";
import { toApiError } from "@/lib/errors";
import { slugify, uniqueSlug } from "@/lib/utils/ids";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await hubApiFetch({
      path: "/v1/projects",
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
    const input = createProjectSchema.parse(body);

    const base = slugify(input.title);
    const existing = await projectsRepo.findProjectBySlug(user.workspaceId, base);
    const slug = existing ? uniqueSlug(input.title) : base;

    const project = await projectsRepo.createProject({
      workspaceId: user.workspaceId,
      title: input.title,
      slug,
      summary: input.summary ?? null,
      status: input.status ?? "planned",
      priority: input.priority ?? "medium",
      ownerUserId: input.ownerUserId ?? null,
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await auditService.recordAudit({
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      entityType: "project",
      entityId: project.id,
      action: "project.created",
      metadata: { title: project.title },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
