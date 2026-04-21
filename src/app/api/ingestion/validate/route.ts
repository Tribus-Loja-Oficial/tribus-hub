import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { ingestionPayloadSchema } from "@/lib/schemas/ingestion.schemas";
import { validateIngestionPayload } from "@/lib/services/ingestion.service";
import { toApiError } from "@/lib/errors";
import { recordAudit } from "@/lib/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("admin");
    const body = await request.json();
    const parsed = ingestionPayloadSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        {
          data: {
            valid: false,
            errors: errors.map((e) => ({
              message: `${e.field ? `[${e.field}] ` : ""}${e.message}`,
            })),
            warnings: [],
            summary: { total: 0, byType: {} },
          },
        },
        { status: 200 },
      );
    }

    const result = validateIngestionPayload(parsed.data);

    await recordAudit({
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      entityType: "ingestion",
      entityId: "validate",
      action: "ingestion.validated",
      metadata: {
        valid: result.valid,
        objectCount: parsed.data.objects.length,
        errorCount: result.errors.length,
      },
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[ingestion/validate POST]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
