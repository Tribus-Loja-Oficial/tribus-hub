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

/**
 * Audit trail: legacy Postgres table was removed. When enabled, events are logged only.
 * (Durable persistence can be added via hub-api later if needed.)
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  if (!appConfig.audit.enabled) return;

  logger.info("Audit event", {
    workspaceId: params.workspaceId,
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    metadata: params.metadata ?? null,
  });
}
