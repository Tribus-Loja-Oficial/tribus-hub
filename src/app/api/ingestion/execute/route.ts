import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { ingestionPayloadSchema } from "@/lib/schemas/ingestion.schemas";
import { executeIngestion } from "@/lib/services/ingestion.service";
import { toApiError, ValidationError } from "@/lib/errors";
import { recordAudit } from "@/lib/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("admin");
    const body = await request.json();

    const parsed = ingestionPayloadSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw new ValidationError("Payload de ingestão com formato inválido", issues);
    }

    const result = await executeIngestion(user, parsed.data);

    await recordAudit({
      workspaceId: user.workspaceId,
      actorUserId: user.id,
      entityType: "ingestion",
      entityId: "execute",
      action: "ingestion.executed",
      metadata: {
        total: result.total,
        created: result.created,
        failed: result.failed,
        byType: Object.fromEntries(
          parsed.data.objects.reduce((acc, o) => {
            acc.set(o.type, (acc.get(o.type) ?? 0) + 1);
            return acc;
          }, new Map<string, number>()),
        ),
      },
    });

    const status = result.failed === 0 ? 200 : result.created === 0 ? 422 : 207;
    return NextResponse.json({ data: result }, { status });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: { message: err.message, code: err.code, issues: err.issues } },
        { status: 400 },
      );
    }
    console.error("[ingestion/execute POST]", err);
    const error = toApiError(err);
    return NextResponse.json({ error }, { status: error.status });
  }
}
