import { pgTable, text, timestamp, json, index } from "drizzle-orm/pg-core";
import { createId } from "@/lib/utils/ids";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("audit_logs_workspace_id_idx").on(table.workspaceId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type AuditAction =
  | "page.created"
  | "page.updated"
  | "page.archived"
  | "page.restored"
  | "page.deleted"
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.moved"
  | "task.deleted"
  | "asset.uploaded"
  | "asset.deleted"
  | "user.created"
  | "user.login";
