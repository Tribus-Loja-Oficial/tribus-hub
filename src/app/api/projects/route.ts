import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions";
import * as auditService from "@/lib/services/audit.service";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";
import { createProjectSchema } from "@/lib/schemas/projects.schemas";
import { toApiError } from "@/lib/errors";

/** Shape returned by hub-api `POST /v1/projects` (D1 row as JSON). */
type HubApiCreatedProject = {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  summary: string | null;
  descriptionJson: unknown;
  descriptionText: string | null;
  status: string;
  healthStatus: string | null;
  priority: string;
  progressPercent: number;
  ownerUserId: string | null;
  cycleId?: string | null;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

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

    const project = await hubApiFetch<HubApiCreatedProject>({
      method: "POST",
      path: "/v1/projects",
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      body: {
        title: input.title,
        summary: input.summary ?? null,
        status: input.status,
        healthStatus: input.healthStatus ?? null,
        priority: input.priority,
        ownerUserId: input.ownerUserId ?? null,
        cycleId: input.cycleId ?? null,
        startDate: input.startDate ?? null,
        targetDate: input.targetDate ?? null,
      },
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
