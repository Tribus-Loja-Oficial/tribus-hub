import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { AuditAction } from "@/lib/db/schema/audit";
import { logger } from "@/lib/observability/logger";
import { appConfig } from "@/lib/config/app-config";

interface AuditParams {
  workspaceId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  if (!appConfig.audit.enabled) return;

  try {
    await db.insert(auditLogs).values({
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      metadataJson: params.metadata ?? null,
    });
  } catch (err) {
    logger.error("Failed to record audit log", {
      error: String(err),
      action: params.action,
      entityId: params.entityId,
    });
  }
}
